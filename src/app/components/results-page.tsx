import { RoomCard } from "./room-card";
import { RoomDetailPanel } from "./room-detail-panel";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Search, DoorOpen, ArrowLeft, ChevronDown } from "lucide-react";
import { getRoomStatus, Room, RoomStatus } from "../data/rooms";
import {
  loadRoomsFile,
  getBuildingOptions,
  mapRawRoomToRoom,
  dayToExportNumber,
  type RawRoomsFile,
} from "../data/room-data";
import { AppFooter } from "./app-footer";
import { QueryBuilder, QueryState, AvailabilityMode } from "./query-builder";

export function ResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  const parseQueryFromURL = (): QueryState => {
    const building = searchParams.get("building") || "All Buildings";
    const day = (searchParams.get("day") || "today") as QueryState["day"];

    let availability: AvailabilityMode = { type: "right-now" };

    const availMode = searchParams.get("availMode");
    if (availMode === "time-range") {
      availability = {
        type: "time-range",
        startHour: parseInt(searchParams.get("startHour") || "9", 10),
        startMin: parseInt(searchParams.get("startMin") || "0", 10),
        endHour: parseInt(searchParams.get("endHour") || "12", 10),
        endMin: parseInt(searchParams.get("endMin") || "0", 10),
      };
    } else if (availMode === "duration") {
      availability = {
        type: "duration",
        hours: parseInt(searchParams.get("hours") || "1", 10),
        minutes: parseInt(searchParams.get("minutes") || "0", 10),
      };
    } else if (availMode === "duration-from") {
      availability = {
        type: "duration-from",
        hours: parseInt(searchParams.get("hours") || "1", 10),
        minutes: parseInt(searchParams.get("minutes") || "0", 10),
        startHour: parseInt(searchParams.get("startHour") || "9", 10),
        startMin: parseInt(searchParams.get("startMin") || "0", 10),
      };
    } else if (searchParams.get("available") === "true") {
      availability = { type: "right-now" };
    }

    return { building, day, availability };
  };

  const [query, setQuery] = useState<QueryState>(parseQueryFromURL());
  const [sortBy, setSortBy] = useState<"building" | "status">("status");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
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

  useEffect(() => {
    setQuery(parseQueryFromURL());
  }, [searchParams]);

  const buildings = useMemo(() => {
    if (!rawData) return ["All Buildings"];
    return getBuildingOptions(rawData);
  }, [rawData]);

  const roomsForSelectedDay = useMemo(() => {
    if (!rawData) return [];
    const dayNumber = dayToExportNumber(query.day);
    return rawData.rooms.map((room) => mapRawRoomToRoom(room, dayNumber));
  }, [rawData, query.day]);

  const handleQueryChange = (newQuery: QueryState) => {
    setQuery(newQuery);

    const params = new URLSearchParams();
    if (newQuery.building !== "All Buildings") {
      params.set("building", newQuery.building);
    }
    params.set("day", newQuery.day);

    if (newQuery.availability.type === "right-now") {
      params.set("available", "true");
    } else if (newQuery.availability.type === "time-range") {
      params.set("availMode", "time-range");
      params.set("startHour", newQuery.availability.startHour.toString());
      params.set("startMin", newQuery.availability.startMin.toString());
      params.set("endHour", newQuery.availability.endHour.toString());
      params.set("endMin", newQuery.availability.endMin.toString());
    } else if (newQuery.availability.type === "duration") {
      params.set("availMode", "duration");
      params.set("hours", newQuery.availability.hours.toString());
      params.set("minutes", newQuery.availability.minutes.toString());
    } else if (newQuery.availability.type === "duration-from") {
      params.set("availMode", "duration-from");
      params.set("hours", newQuery.availability.hours.toString());
      params.set("minutes", newQuery.availability.minutes.toString());
      params.set("startHour", newQuery.availability.startHour.toString());
      params.set("startMin", newQuery.availability.startMin.toString());
    }

    setSearchParams(params);
  };

  const meetsAvailabilityCriteria = (room: Room): boolean => {
    const avail = query.availability;

    if (avail.type === "right-now") {
      const { status } = getRoomStatus(room, currentHour, currentMin);
      return status === "free" || status === "soon-occupied";
    }

    if (avail.type === "time-range") {
      const startMins = avail.startHour * 60 + avail.startMin;
      const endMins = avail.endHour * 60 + avail.endMin;

      for (const slot of room.schedule) {
        const slotStart = slot.startHour * 60 + slot.startMin;
        const slotEnd = slot.endHour * 60 + slot.endMin;

        if (slotStart < endMins && slotEnd > startMins) {
          return false;
        }
      }
      return true;
    }

    if (avail.type === "duration") {
      const requiredMins = avail.hours * 60 + avail.minutes;
      const nowMins = currentHour * 60 + currentMin;

      const sortedSlots = [...room.schedule].sort(
        (a, b) =>
          a.startHour * 60 + a.startMin - (b.startHour * 60 + b.startMin),
      );

      let lastEnd = nowMins;

      for (const slot of sortedSlots) {
        const slotStart = slot.startHour * 60 + slot.startMin;
        const slotEnd = slot.endHour * 60 + slot.endMin;

        if (slotStart >= nowMins) {
          const gapDuration = slotStart - lastEnd;
          if (gapDuration >= requiredMins) {
            return true;
          }
          lastEnd = slotEnd;
        } else if (slotEnd > nowMins) {
          lastEnd = slotEnd;
        }
      }

      const endOfDay = 22 * 60;
      return endOfDay - lastEnd >= requiredMins;
    }

    if (avail.type === "duration-from") {
      const requiredMins = avail.hours * 60 + avail.minutes;
      const startMins = avail.startHour * 60 + avail.startMin;
      const endMins = startMins + requiredMins;

      for (const slot of room.schedule) {
        const slotStart = slot.startHour * 60 + slot.startMin;
        const slotEnd = slot.endHour * 60 + slot.endMin;

        if (slotStart < endMins && slotEnd > startMins) {
          return false;
        }
      }
      return true;
    }

    return true;
  };

  const filteredRooms = useMemo(() => {
    let result = [...roomsForSelectedDay];

    if (query.building !== "All Buildings") {
      result = result.filter((r) => r.building === query.building);
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
        const sa = getRoomStatus(a, currentHour, currentMin).status;
        const sb = getRoomStatus(b, currentHour, currentMin).status;
        const diff = statusOrder[sa] - statusOrder[sb];
        if (diff !== 0) return diff;

        return (
          a.building.localeCompare(b.building) ||
          a.roomNumber.localeCompare(b.roomNumber)
        );
      });
    } else {
      result.sort(
        (a, b) =>
          a.building.localeCompare(b.building) ||
          a.roomNumber.localeCompare(b.roomNumber),
      );
    }

    return result;
  }, [query, sortBy, roomsForSelectedDay, currentHour, currentMin]);

  const freeCount = filteredRooms.filter((room) => {
    const status = getRoomStatus(room, currentHour, currentMin).status;
    return status === "free" || status === "soon-occupied";
  }).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <DoorOpen className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="text-[15px] font-medium text-foreground">
                RoomFinder
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        <div className="bg-card rounded-xl border border-border shadow-sm mb-6 p-4">
          <QueryBuilder
            value={query}
            onChange={handleQueryChange}
            onSubmit={() => {}}
            variant="compact"
            buildings={buildings}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-medium text-foreground">
              {filteredRooms.length} room{filteredRooms.length !== 1 ? "s" : ""}
            </span>
            <span className="text-[13px] text-muted-foreground">
              {freeCount} available now
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-muted-foreground">Sort:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "building" | "status")
                  }
                  className="h-8 pl-3 pr-8 rounded-lg border border-border bg-card text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-[13px]"
                >
                  <option value="status">Availability</option>
                  <option value="building">Building</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-3 h-2 rounded-sm inline-block"
                  style={{ backgroundColor: "#e8f5e9" }}
                />
                Free
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="w-3 h-2 rounded-sm inline-block"
                  style={{ backgroundColor: "#ef9a9a" }}
                />
                Class
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="w-[2px] h-3 inline-block"
                  style={{ backgroundColor: "#2d3748" }}
                />
                Now
              </span>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
            <p className="text-[15px] font-medium text-foreground mb-1">
              Failed to load room data
            </p>
            <p className="text-[13px] text-muted-foreground">
              Could not fetch rooms.json. Try refreshing the page.
            </p>
          </div>
        ) : !rawData ? (
          <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
            <p className="text-[15px] font-medium text-foreground mb-1">
              Loading rooms...
            </p>
            <p className="text-[13px] text-muted-foreground">
              Reading timetable data.
            </p>
          </div>
        ) : filteredRooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                currentHour={currentHour}
                currentMin={currentMin}
                onClick={() => setSelectedRoom(room)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-[15px] font-medium text-foreground mb-1">
              No rooms found
            </p>
            <p className="text-[13px] text-muted-foreground">
              Try adjusting your search criteria.
            </p>
          </div>
        )}

        {selectedRoom && (
          <RoomDetailPanel
            room={selectedRoom}
            onClose={() => setSelectedRoom(null)}
          />
        )}

        <div className="h-12" />
      </main>

      <AppFooter />
    </div>
  );
}