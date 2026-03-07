import { useState } from "react";
import { useNavigate } from "react-router";
import { Search, Building2, DoorOpen, Clock } from "lucide-react";
import { BUILDINGS, rooms, getRoomStatus, CURRENT_HOUR, CURRENT_MIN, formatTime } from "../data/rooms";
import { useAuth } from "../data/auth-context";
import { AppFooter } from "./app-footer";
import { QueryBuilder, QueryState } from "./query-builder";

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [query, setQuery] = useState<QueryState>({
    building: user?.preferences?.defaultBuilding || "All Buildings",
    day: "today",
    availability: { type: "right-now" }
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    
    // Building
    if (query.building !== "All Buildings") {
      params.set("building", query.building);
    }
    
    // Day
    params.set("day", query.day);
    
    // Availability
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

  // Quick stats
  const freeNow = rooms.filter((r) => {
    const s = getRoomStatus(r);
    return s.status === "free" || s.status === "soon-occupied";
  }).length;

  const totalRooms = rooms.length;

  // Quick action suggestions
  const suggestions = [
    { building: "All Buildings", day: "today" as const, label: "Any building now" },
    { building: "Baker Science Center", day: "today" as const, label: "BSC now" },
    { building: "Dawson Engineering", day: "today" as const, label: "DE now" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <DoorOpen className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="text-[17px] font-medium text-foreground tracking-tight">
              RoomFinder
            </span>
          </div>
          <button
            onClick={() => navigate(user ? "/account" : "/login")}
            className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
            title={user ? "Account" : "Sign in"}
          >
            {user ? (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-[11px] font-medium text-primary">
                  {user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                </span>
              </div>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 1 0-16 0" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-6">
        {/* Hero section */}
        <div className="pt-20 pb-10 text-center">
          <h1 className="text-[32px] font-medium text-foreground tracking-tight mb-3">
            Find an empty classroom
          </h1>
          <p className="text-muted-foreground text-[16px] max-w-md mx-auto">
            Search available rooms across campus. Updated from today's class schedule.
          </p>
        </div>

        {/* Query builder card */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
          <QueryBuilder
            value={query}
            onChange={setQuery}
            onSubmit={handleSearch}
            variant="full"
          />
          
          {/* Quick suggestions */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] text-muted-foreground">Quick:</span>
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery({
                      building: suggestion.building,
                      day: suggestion.day,
                      availability: { type: "right-now" }
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 text-[13px] text-foreground transition-colors"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Show rooms button */}
          <button
            onClick={handleSearch}
            className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center justify-center gap-2 mt-4 text-[14px] font-medium"
          >
            <Search className="w-4 h-4" />
            Show rooms
          </button>
        </div>

        {/* Quick action - Free now shortcut */}
        <button
          onClick={() => {
            setQuery({
              building: "All Buildings",
              day: "today",
              availability: { type: "right-now" }
            });
            navigate("/results?available=true&day=today");
          }}
          className="w-full bg-[#e8f5e9] hover:bg-[#dcedc8] rounded-xl border border-[#81c784]/20 shadow-sm p-5 text-left transition-all group mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#2e7d32]/10 flex items-center justify-center">
                <DoorOpen className="w-5 h-5 text-[#2e7d32]" />
              </div>
              <div>
                <div className="text-[16px] font-medium text-[#1b5e20] mb-0.5">Free right now</div>
                <div className="text-[13px] text-[#2e7d32]">
                  {freeNow} of {totalRooms} rooms available
                </div>
              </div>
            </div>
            <div className="text-[13px] text-[#2e7d32] opacity-70 group-hover:opacity-100 transition-opacity">
              Go →
            </div>
          </div>
        </button>

        {/* Disclaimer */}
        <div className="text-center pb-6">
          <p className="text-[13px] text-muted-foreground/70 max-w-md mx-auto">
            Results are based on timetable data and may not reflect real-time occupancy. Always verify room availability when you arrive.
          </p>
          <p className="text-[13px] text-muted-foreground/70 mt-2">
            <Clock className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
            Showing data as of {formatTime(CURRENT_HOUR, CURRENT_MIN)} today
          </p>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}