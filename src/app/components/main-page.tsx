import { useState, useMemo, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";
import { getRoomStatus, isRoomFreeAt, Room, RoomStatus } from "../data/rooms";
import {
  loadRoomsFile,
  getBuildingOptions,
  mapRawRoomToRoom,
  dayToExportNumber,
  type RawRoomsFile,
} from "../data/room-data";
import { QueryBuilder, QueryState } from "./query-builder";
import { RoomCard } from "./room-card";
import { RoomDetailPanel } from "./room-detail-panel";

export function MainPage() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  const [query, setQuery] = useState<QueryState>({
    building: "All Buildings",
    day: "today",
    availability: { type: "right-now" },
  });
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

  const buildings = useMemo(() => {
    if (!rawData) return ["All Buildings"];
    return getBuildingOptions(rawData);
  }, [rawData]);

  const roomsForSelectedDay = useMemo(() => {
    if (!rawData) return [];
    const dayNumber = dayToExportNumber(query.day);
    return rawData.rooms.map((room) => mapRawRoomToRoom(room, dayNumber));
  }, [rawData, query.day]);

  // reference time for status display — current time for "today", query time otherwise
  const refTime = useMemo(() => {
    if (query.day === "today") return { hour: currentHour, min: currentMin };
    const avail = query.availability;
    if (avail.type === "at-time") return { hour: avail.hour, min: avail.min };
    if (avail.type === "time-range") return { hour: avail.startHour, min: avail.startMin };
    if (avail.type === "duration-from") return { hour: avail.startHour, min: avail.startMin };
    return { hour: currentHour, min: currentMin };
  }, [query, currentHour, currentMin]);

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
      const startMins = avail.startHour * 60 + avail.startMin;
      const endMins = avail.endHour * 60 + avail.endMin;
      for (const slot of room.schedule) {
        const slotStart = slot.startHour * 60 + slot.startMin;
        const slotEnd = slot.endHour * 60 + slot.endMin;
        if (slotStart < endMins && slotEnd > startMins) return false;
      }
      return true;
    }


    if (avail.type === "duration-from") {
      const requiredMins = avail.hours * 60 + avail.minutes;
      const startMins = avail.startHour * 60 + avail.startMin;
      const endMins = startMins + requiredMins;
      for (const slot of room.schedule) {
        const slotStart = slot.startHour * 60 + slot.startMin;
        const slotEnd = slot.endHour * 60 + slot.endMin;
        if (slotStart < endMins && slotEnd > startMins) return false;
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
        const sa = getRoomStatus(a, refTime.hour, refTime.min).status;
        const sb = getRoomStatus(b, refTime.hour, refTime.min).status;
        const diff = statusOrder[sa] - statusOrder[sb];
        if (diff !== 0) return diff;
        return a.building.localeCompare(b.building) || a.roomNumber.localeCompare(b.roomNumber);
      });
    } else {
      result.sort(
        (a, b) =>
          a.building.localeCompare(b.building) ||
          a.roomNumber.localeCompare(b.roomNumber),
      );
    }

    return result;
  }, [query, sortBy, roomsForSelectedDay, refTime]);

  const freeCount = filteredRooms.filter((room) => {
    const { status } = getRoomStatus(room, refTime.hour, refTime.min);
    return status === "free" || status === "soon-occupied";
  }).length;

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-[28px] font-medium text-foreground tracking-tight mb-1.5">
            Find an empty classroom
          </h1>
          <p className="text-[15px] text-muted-foreground">
            Search available rooms across campus based on the class schedule.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-6">
          <QueryBuilder
            value={query}
            onChange={setQuery}
            onSubmit={() => {}}
            variant="compact"
            buildings={buildings}
          />
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
        ) : (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-[15px] font-medium text-foreground">
                  {filteredRooms.length} room{filteredRooms.length !== 1 ? "s" : ""}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {freeCount} available
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
                  {query.day === "today" && (
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-[2px] h-3 inline-block"
                        style={{ backgroundColor: "#2d3748" }}
                      />
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
                    showNow={query.day === "today"}
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
          </>
        )}

        <p className="text-[12px] text-muted-foreground/50 text-center mt-8 pb-4">
          Results are based on timetable data and may not reflect real-time occupancy.
        </p>
      </div>

      {selectedRoom && (
        <RoomDetailPanel
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </div>
  );
}
