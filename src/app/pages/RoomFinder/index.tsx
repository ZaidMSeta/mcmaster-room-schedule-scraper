import { useState, useMemo, useEffect, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Search } from "lucide-react";
import { Card } from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { cn } from "../../components/ui/utils";
import type { QueryState, RawRoomsFile, Room, RoomStatus } from "../../lib/rooms/types";
import { getRoomStatus, isRoomFreeAt, isRoomFreeBetween } from "../../lib/rooms/status";
import { toMins } from "../../lib/rooms/time";
import { parseUrlState, toUrlParams, type SortBy, type UrlState } from "../../lib/rooms/url";
import {
  loadRoomsFile,
  mapRawRoomToRoom,
  dayToDate,
  toIsoDate,
} from "../../lib/rooms/data";
import { QueryBuilder } from "./QueryBuilder";
import { RoomCard } from "./RoomCard";
import { RoomDetailPanel } from "./RoomDetailPanel";
import { TIMELINE, TONE_STYLES } from "./statusStyles";

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// "Sep 23"
function formatScrapedAt(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function RoomFinder() {
  // Re-render every 30s so "right now" statuses don't go stale while the page is open
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  // Filters, sort and the open room live in the URL so searches can be shared and linked to
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlState = useMemo(() => parseUrlState(searchParams, now), [searchParams, now]);
  const { sortBy, roomId: selectedRoomId } = urlState;
  const updateUrl = (next: Partial<UrlState>) => {
    // Keep times readable (13:30, not 13%3A30); navigate() leaves the search string as given
    const search = toUrlParams({ ...urlState, ...next }).toString().replaceAll("%3A", ":");
    navigate({ search: search ? `?${search}` : "" }, { replace: true });
  };
  const setQuery = (next: QueryState) => updateUrl({ query: next });
  const setSortBy = (next: SortBy) => updateUrl({ sortBy: next });
  const setSelectedRoomId = (next: string | null) => updateUrl({ roomId: next });
  const [rawData, setRawData] = useState<RawRoomsFile | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    loadRoomsFile()
      .then((data) => setRawData(data))
      .catch((error) => {
        console.error("Failed to load rooms:", error);
        setLoadError(true);
      });
  }, []);

  const buildings = rawData?.buildings ?? [];

  // Ignore a building code from the URL that isn't in the data
  const query = useMemo(
    () =>
      rawData && urlState.query.building && !buildings.some((b) => b.code === urlState.query.building)
        ? { ...urlState.query, building: "" }
        : urlState.query,
    [urlState.query, rawData, buildings],
  );

  const selectedDate = dayToDate(query.day, now);
  const selectedIso = toIsoDate(selectedDate);

  const roomsForSelectedDay = useMemo(() => {
    if (!rawData) return [];
    const names = new Map(rawData.buildings.map((b) => [b.code, b.name]));
    return rawData.rooms.map((room) =>
      mapRawRoomToRoom(room, names.get(room.buildingCode) ?? room.buildingCode, selectedDate),
    );
    // selectedIso captures the date; selectedDate is a new object every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawData, selectedIso]);

  // Derive from the current day's rooms so the panel follows day changes
  const selectedRoom = selectedRoomId
    ? roomsForSelectedDay.find((r) => r.id === selectedRoomId) ?? null
    : null;

  const noClassesThatDay =
    roomsForSelectedDay.length > 0 && roomsForSelectedDay.every((r) => r.schedule.length === 0);

  const outOfTerm =
    !!rawData &&
    (selectedIso < rawData.termStart || selectedIso > rawData.termEnd);

  // Time that statuses are shown for: the searched time, or the current time for "right now"
  const refTime = useMemo(() => {
    const avail = query.availability;
    if (avail.type === "at-time") return { hour: avail.hour, min: avail.min };
    if (avail.type === "time-range") return { hour: avail.startHour, min: avail.startMin };
    if (avail.type === "duration-from") return { hour: avail.startHour, min: avail.startMin };
    return { hour: currentHour, min: currentMin };
  }, [query, currentHour, currentMin]);

  // Where to draw the "now" line: only when looking at today
  const nowMins = query.day === "today" ? toMins(currentHour, currentMin) : undefined;

  const meetsAvailabilityCriteria = (room: Room): boolean => {
    const avail = query.availability;

    if (avail.type === "right-now") {
      const { status } = getRoomStatus(room, currentHour, currentMin);
      return status === "free" || status === "soon-occupied";
    }

    if (avail.type === "at-time") {
      return isRoomFreeAt(room, avail.hour, avail.min);
    }

    if (avail.type === "time-range") {
      return isRoomFreeBetween(
        room,
        toMins(avail.startHour, avail.startMin),
        toMins(avail.endHour, avail.endMin),
      );
    }

    if (avail.type === "duration-from") {
      const startMins = toMins(avail.startHour, avail.startMin);
      return isRoomFreeBetween(room, startMins, startMins + toMins(avail.hours, avail.minutes));
    }

    return true;
  };

  const filteredRooms = useMemo(() => {
    let result = [...roomsForSelectedDay];

    if (query.building) {
      result = result.filter((r) => r.buildingCode === query.building);
    }

    result = result.filter(meetsAvailabilityCriteria);

    const statusOrder: Record<RoomStatus, number> = {
      free: 0,
      "soon-occupied": 1,
      "soon-free": 2,
      occupied: 3,
    };

    if (sortBy === "status") {
      result.sort((a, b) => {
        const sa = getRoomStatus(a, refTime.hour, refTime.min).status;
        const sb = getRoomStatus(b, refTime.hour, refTime.min).status;
        const diff = statusOrder[sa] - statusOrder[sb];
        if (diff !== 0) return diff;
        return compareRooms(a, b);
      });
    } else {
      result.sort(compareRooms);
    }

    return result;
  }, [query, sortBy, roomsForSelectedDay, refTime]);

  const freeCount = filteredRooms.filter((room) => {
    const { status } = getRoomStatus(room, refTime.hour, refTime.min);
    return status === "free" || status === "soon-occupied";
  }).length;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Find an empty classroom</h1>
        <p className="text-muted-foreground mt-1">
          Search available rooms across campus based on the class schedule.
        </p>
        {rawData && (
          <p className="text-sm text-muted-foreground mt-1">
            {rawData.termName} timetable, updated {formatScrapedAt(rawData.scrapedAt)} · showing{" "}
            {formatDateLabel(selectedIso)}
          </p>
        )}
      </div>

      <Card className="p-5 gap-0">
        <QueryBuilder value={query} onChange={setQuery} buildings={buildings} now={now} />
      </Card>

      {loadError ? (
        <MessageCard title="Failed to load room data" body="Could not fetch rooms.json. Try refreshing the page." />
      ) : !rawData ? (
        <MessageCard title="Loading rooms..." body="Reading timetable data." />
      ) : (
        <div className="space-y-4">
          {outOfTerm && (
            <div className={cn("rounded-xl border px-4 py-3 text-sm", TONE_STYLES.soon.soft, TONE_STYLES.soon.text)}>
              Classes aren't in session on {formatDateLabel(selectedIso)} (
              {rawData.termName} runs {formatDateLabel(rawData.termStart)} to{" "}
              {formatDateLabel(rawData.termEnd)}), so every room shows as free.
            </div>
          )}
          {!outOfTerm && noClassesThatDay && (
            <div className={cn("rounded-xl border px-4 py-3 text-sm", TONE_STYLES.soon.soft, TONE_STYLES.soon.text)}>
              No classes are scheduled on {formatDateLabel(selectedIso)}, so every room shows as free.
              Buildings may be locked.
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-foreground">
                {filteredRooms.length} room{filteredRooms.length !== 1 ? "s" : ""}
              </span>
              <span className="text-sm text-muted-foreground">{freeCount} available</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort:</span>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                  <SelectTrigger size="sm" className="w-[140px]" aria-label="Sort rooms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Availability</SelectItem>
                    <SelectItem value="building">Building</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
                <span className="flex items-center gap-1.5">
                  <span className={cn("w-3 h-2 rounded-sm", TIMELINE.track)} />
                  Free
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={cn("w-3 h-2 rounded-sm", TIMELINE.class)} />
                  Class
                </span>
                {query.day === "today" && (
                  <span className="flex items-center gap-1.5">
                    <span className={cn("w-[2px] h-3", TIMELINE.now)} />
                    Now
                  </span>
                )}
              </div>
            </div>
          </div>

          {filteredRooms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  currentHour={refTime.hour}
                  currentMin={refTime.min}
                  nowMins={nowMins}
                  onClick={() => setSelectedRoomId(room.id)}
                />
              ))}
            </div>
          ) : (
            <MessageCard
              icon={<Search className="size-5 text-muted-foreground" />}
              title="No rooms found"
              body="Try adjusting your search criteria."
            />
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Results are based on timetable data and may not reflect real-time occupancy.
      </p>

      <RoomDetailPanel
        room={selectedRoom}
        currentHour={refTime.hour}
        currentMin={refTime.min}
        dayLabel={query.day === "today" ? "today" : formatDateLabel(selectedIso).split(",")[0]}
        nowMins={nowMins}
        onClose={() => setSelectedRoomId(null)}
      />
    </div>
  );
}

// Building, then room number with numeric parts compared as numbers (JHE 210 before JHE 1100)
function compareRooms(a: Room, b: Room): number {
  return (
    a.building.localeCompare(b.building) ||
    a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
  );
}

function MessageCard({ icon, title, body }: { icon?: ReactNode; title: string; body: string }) {
  return (
    <Card className="p-12 gap-0 items-center text-center">
      {icon && (
        <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">{icon}</div>
      )}
      <p className="font-medium text-foreground mb-1">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </Card>
  );
}
