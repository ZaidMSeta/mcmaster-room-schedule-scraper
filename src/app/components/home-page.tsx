import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Clock, DoorOpen } from "lucide-react";
import { getBuildingOptions, loadRoomsFile } from "../data/room-data";
import { AppFooter } from "./app-footer";
import { QueryBuilder, QueryState } from "./query-builder";
import { formatTime } from "../data/rooms";
export function HomePage() {
  const navigate = useNavigate();
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const [buildings, setBuildings] = useState<string[]>(["All Buildings"]);

  const [query, setQuery] = useState<QueryState>({
    building: "All Buildings",
    day: "today",
    availability: { type: "right-now" },
  });

  useEffect(() => {
    loadRoomsFile()
      .then((data) => setBuildings(getBuildingOptions(data)))
      .catch((error) => {
        console.error("Failed to load buildings:", error);
      });
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (query.building !== "All Buildings") {
      params.set("building", query.building);
    }

    params.set("day", query.day);

    if (query.availability.type === "right-now") {
      params.set("available", "true");
    } else if (query.availability.type === "time-range") {
      params.set("availMode", "time-range");
      params.set("startHour", query.availability.startHour.toString());
      params.set("startMin", query.availability.startMin.toString());
      params.set("endHour", query.availability.endHour.toString());
      params.set("endMin", query.availability.endMin.toString());
    } else if (query.availability.type === "duration") {
      params.set("availMode", "duration");
      params.set("hours", query.availability.hours.toString());
      params.set("minutes", query.availability.minutes.toString());
    } else if (query.availability.type === "duration-from") {
      params.set("availMode", "duration-from");
      params.set("hours", query.availability.hours.toString());
      params.set("minutes", query.availability.minutes.toString());
      params.set("startHour", query.availability.startHour.toString());
      params.set("startMin", query.availability.startMin.toString());
    }

    navigate(`/results?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <DoorOpen className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="text-[17px] font-medium text-foreground tracking-tight">
              RoomFinder
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6">
        <div className="pt-20 pb-10 text-center">
          <h1 className="text-[32px] font-medium text-foreground tracking-tight mb-3">
            Find an empty classroom
          </h1>
          <p className="text-muted-foreground text-[16px] max-w-md mx-auto">
            Search available rooms across campus. Updated from today's class
            schedule.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
          <QueryBuilder
            value={query}
            onChange={setQuery}
            onSubmit={handleSearch}
            variant="full"
            buildings={buildings}
          />
        </div>

        <div className="text-center pb-6">
          <p className="text-[13px] text-muted-foreground/70 max-w-md mx-auto">
            Results are based on timetable data and may not reflect real-time
            occupancy. Always verify room availability when you arrive.
          </p>
          <p className="text-[13px] text-muted-foreground/70 mt-2">
            <Clock className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
            Showing data as of {formatTime(currentHour, currentMin)} today          </p>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}