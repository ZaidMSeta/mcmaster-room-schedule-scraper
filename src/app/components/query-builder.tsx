import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { BUILDINGS, formatTime } from "../data/rooms";

export type Day = "today" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

export type AvailabilityMode = 
  | { type: "right-now" }
  | { type: "time-range"; startHour: number; startMin: number; endHour: number; endMin: number }
  | { type: "duration"; hours: number; minutes: number }
  | { type: "duration-from"; hours: number; minutes: number; startHour: number; startMin: number };

export interface QueryState {
  building: string;
  day: Day;
  availability: AvailabilityMode;
}

interface QueryBuilderProps {
  value: QueryState;
  onChange: (value: QueryState) => void;
  onSubmit: () => void;
  variant?: "full" | "compact";
}

export function QueryBuilder({ value, onChange, onSubmit, variant = "full" }: QueryBuilderProps) {
  const [showBuildingMenu, setShowBuildingMenu] = useState(false);
  const [showDayMenu, setShowDayMenu] = useState(false);
  const [showAvailabilityMenu, setShowAvailabilityMenu] = useState(false);

  const days: { value: Day; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
  ];

  const getDayLabel = (day: Day) => {
    return days.find(d => d.value === day)?.label || "Today";
  };

  const isCompact = variant === "compact";

  return (
    <div className={isCompact ? "relative" : ""}>
      {/* Sentence builder */}
      <div className={`${isCompact ? 'flex items-center gap-2 flex-wrap' : 'flex items-center gap-2 flex-wrap text-[17px] leading-relaxed'}`}>
        <span className={`${isCompact ? 'text-[14px]' : 'text-[17px]'} text-muted-foreground`}>Find me a room in</span>
        
        {/* Building selector */}
        <div className="relative inline-block">
          <button
            onClick={() => {
              setShowBuildingMenu(!showBuildingMenu);
              setShowDayMenu(false);
              setShowAvailabilityMenu(false);
            }}
            className={`${isCompact ? 'h-7 px-2.5 text-[13px]' : 'h-8 px-3 text-[15px]'} inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/8 hover:bg-primary/12 text-primary font-medium transition-colors`}
          >
            {value.building === "All Buildings" ? "any building" : value.building}
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>
          
          {showBuildingMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowBuildingMenu(false)} />
              <div className="absolute top-full left-0 mt-1.5 min-w-[220px] bg-card rounded-lg border border-border shadow-lg z-40 py-1">
                <button
                  onClick={() => {
                    onChange({ ...value, building: "All Buildings" });
                    setShowBuildingMenu(false);
                  }}
                  className={`w-full px-3.5 py-2 text-left text-[14px] hover:bg-accent transition-colors ${value.building === "All Buildings" ? "bg-primary/8 text-primary font-medium" : "text-foreground"}`}
                >
                  Any building
                </button>
                {BUILDINGS.filter(b => b !== "All Buildings").map((building) => (
                  <button
                    key={building}
                    onClick={() => {
                      onChange({ ...value, building });
                      setShowBuildingMenu(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left text-[14px] hover:bg-accent transition-colors ${value.building === building ? "bg-primary/8 text-primary font-medium" : "text-foreground"}`}
                  >
                    {building}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <span className={`${isCompact ? 'text-[14px]' : 'text-[17px]'} text-muted-foreground`}>on</span>

        {/* Day selector */}
        <div className="relative inline-block">
          <button
            onClick={() => {
              setShowDayMenu(!showDayMenu);
              setShowBuildingMenu(false);
              setShowAvailabilityMenu(false);
            }}
            className={`${isCompact ? 'h-7 px-2.5 text-[13px]' : 'h-8 px-3 text-[15px]'} inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/8 hover:bg-primary/12 text-primary font-medium transition-colors`}
          >
            {getDayLabel(value.day)}
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {showDayMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowDayMenu(false)} />
              <div className="absolute top-full left-0 mt-1.5 min-w-[140px] bg-card rounded-lg border border-border shadow-lg z-40 py-1">
                {days.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => {
                      onChange({ ...value, day: day.value });
                      setShowDayMenu(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left text-[14px] hover:bg-accent transition-colors ${value.day === day.value ? "bg-primary/8 text-primary font-medium" : "text-foreground"}`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <span className={`${isCompact ? 'text-[14px]' : 'text-[17px]'} text-muted-foreground`}>that is free</span>

        {/* Availability slots - broken down into smaller pieces */}
        {value.availability.type === "right-now" && (
          <div className="relative inline-block">
            <button
              onClick={() => {
                setShowAvailabilityMenu(!showAvailabilityMenu);
                setShowBuildingMenu(false);
                setShowDayMenu(false);
              }}
              className={`${isCompact ? 'h-7 px-2.5 text-[13px]' : 'h-8 px-3 text-[15px]'} inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/8 hover:bg-primary/12 text-primary font-medium transition-colors`}
            >
              right now
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            {showAvailabilityMenu && <AvailabilityEditor value={value} onChange={onChange} onClose={() => setShowAvailabilityMenu(false)} />}
          </div>
        )}

        {value.availability.type === "time-range" && (
          <>
            <div className="relative inline-block">
              <button
                onClick={() => {
                  setShowAvailabilityMenu(!showAvailabilityMenu);
                  setShowBuildingMenu(false);
                  setShowDayMenu(false);
                }}
                className={`${isCompact ? 'h-7 px-2.5 text-[13px]' : 'h-8 px-3 text-[15px]'} inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/8 hover:bg-primary/12 text-primary font-medium transition-colors`}
              >
                from
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
              {showAvailabilityMenu && <AvailabilityEditor value={value} onChange={onChange} onClose={() => setShowAvailabilityMenu(false)} />}
            </div>
            <span className={`${isCompact ? 'h-7 px-2.5 text-[13px]' : 'h-8 px-3 text-[15px]'} inline-flex items-center rounded-md border border-primary/30 bg-primary/8 text-primary font-medium`}>
              {formatTime(value.availability.startHour, value.availability.startMin)}
            </span>
            <span className={`${isCompact ? 'text-[14px]' : 'text-[17px]'} text-muted-foreground`}>to</span>
            <span className={`${isCompact ? 'h-7 px-2.5 text-[13px]' : 'h-8 px-3 text-[15px]'} inline-flex items-center rounded-md border border-primary/30 bg-primary/8 text-primary font-medium`}>
              {formatTime(value.availability.endHour, value.availability.endMin)}
            </span>
          </>
        )}

        {value.availability.type === "duration" && (
          <>
            <div className="relative inline-block">
              <button
                onClick={() => {
                  setShowAvailabilityMenu(!showAvailabilityMenu);
                  setShowBuildingMenu(false);
                  setShowDayMenu(false);
                }}
                className={`${isCompact ? 'h-7 px-2.5 text-[13px]' : 'h-8 px-3 text-[15px]'} inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/8 hover:bg-primary/12 text-primary font-medium transition-colors`}
              >
                for at least
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
              {showAvailabilityMenu && <AvailabilityEditor value={value} onChange={onChange} onClose={() => setShowAvailabilityMenu(false)} />}
            </div>
            <span className={`${isCompact ? 'h-7 px-2.5 text-[13px]' : 'h-8 px-3 text-[15px]'} inline-flex items-center rounded-md border border-primary/30 bg-primary/8 text-primary font-medium`}>
              {value.availability.hours > 0 && value.availability.minutes > 0
                ? `${value.availability.hours}h ${value.availability.minutes}m`
                : value.availability.hours > 0
                ? `${value.availability.hours} hour${value.availability.hours > 1 ? 's' : ''}`
                : `${value.availability.minutes} min`}
            </span>
          </>
        )}

        {value.availability.type === "duration-from" && (
          <>
            <div className="relative inline-block">
              <button
                onClick={() => {
                  setShowAvailabilityMenu(!showAvailabilityMenu);
                  setShowBuildingMenu(false);
                  setShowDayMenu(false);
                }}
                className={`${isCompact ? 'h-7 px-2.5 text-[13px]' : 'h-8 px-3 text-[15px]'} inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/8 hover:bg-primary/12 text-primary font-medium transition-colors`}
              >
                for at least
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
              {showAvailabilityMenu && <AvailabilityEditor value={value} onChange={onChange} onClose={() => setShowAvailabilityMenu(false)} />}
            </div>
            <span className={`${isCompact ? 'h-7 px-2.5 text-[13px]' : 'h-8 px-3 text-[15px]'} inline-flex items-center rounded-md border border-primary/30 bg-primary/8 text-primary font-medium`}>
              {value.availability.hours > 0 && value.availability.minutes > 0
                ? `${value.availability.hours}h ${value.availability.minutes}m`
                : value.availability.hours > 0
                ? `${value.availability.hours} hour${value.availability.hours > 1 ? 's' : ''}`
                : `${value.availability.minutes} min`}
            </span>
            <span className={`${isCompact ? 'text-[14px]' : 'text-[17px]'} text-muted-foreground`}>starting at</span>
            <span className={`${isCompact ? 'h-7 px-2.5 text-[13px]' : 'h-8 px-3 text-[15px]'} inline-flex items-center rounded-md border border-primary/30 bg-primary/8 text-primary font-medium`}>
              {formatTime(value.availability.startHour, value.availability.startMin)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// Availability editor popover component
function AvailabilityEditor({ value, onChange, onClose }: { value: QueryState; onChange: (value: QueryState) => void; onClose: () => void }) {
  const [mode, setMode] = useState<AvailabilityMode["type"]>(value.availability.type);
  const [tempState, setTempState] = useState<AvailabilityMode>(value.availability);

  const handleApply = () => {
    onChange({ ...value, availability: tempState });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute top-full left-0 mt-1.5 w-[300px] bg-card rounded-lg border border-border shadow-lg z-40 p-3">
        <div className="space-y-2">
          {/* Mode selector */}
          <div className="space-y-1">
            <button
              onClick={() => {
                setMode("right-now");
                setTempState({ type: "right-now" });
              }}
              className={`w-full px-3 py-2 text-left text-[13px] rounded-md transition-colors ${mode === "right-now" ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"}`}
            >
              Right now
            </button>

            <button
              onClick={() => {
                const newState: AvailabilityMode = { type: "time-range", startHour: 9, startMin: 0, endHour: 12, endMin: 0 };
                setMode("time-range");
                setTempState(newState);
              }}
              className={`w-full px-3 py-2 text-left text-[13px] rounded-md transition-colors ${mode === "time-range" ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"}`}
            >
              From [time] to [time]
            </button>

            <button
              onClick={() => {
                const newState: AvailabilityMode = { type: "duration", hours: 1, minutes: 0 };
                setMode("duration");
                setTempState(newState);
              }}
              className={`w-full px-3 py-2 text-left text-[13px] rounded-md transition-colors ${mode === "duration" ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"}`}
            >
              For at least [duration]
            </button>

            <button
              onClick={() => {
                const newState: AvailabilityMode = { type: "duration-from", hours: 1, minutes: 0, startHour: 9, startMin: 0 };
                setMode("duration-from");
                setTempState(newState);
              }}
              className={`w-full px-3 py-2 text-left text-[13px] rounded-md transition-colors ${mode === "duration-from" ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"}`}
            >
              For at least [duration] starting at [time]
            </button>
          </div>

          {/* Expanded fields for selected mode */}
          {mode === "time-range" && tempState.type === "time-range" && (
            <div className="pt-2 border-t border-border space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block uppercase tracking-wide">Start</label>
                  <input
                    type="time"
                    value={`${tempState.startHour.toString().padStart(2, '0')}:${tempState.startMin.toString().padStart(2, '0')}`}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(':').map(Number);
                      setTempState({ ...tempState, startHour: h, startMin: m });
                    }}
                    className="w-full h-8 px-2 rounded-md border border-border bg-input-background text-foreground text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block uppercase tracking-wide">End</label>
                  <input
                    type="time"
                    value={`${tempState.endHour.toString().padStart(2, '0')}:${tempState.endMin.toString().padStart(2, '0')}`}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(':').map(Number);
                      setTempState({ ...tempState, endHour: h, endMin: m });
                    }}
                    className="w-full h-8 px-2 rounded-md border border-border bg-input-background text-foreground text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>
          )}

          {mode === "duration" && tempState.type === "duration" && (
            <div className="pt-2 border-t border-border space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block uppercase tracking-wide">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={tempState.hours}
                    onChange={(e) => {
                      setTempState({ ...tempState, hours: parseInt(e.target.value) || 0 });
                    }}
                    className="w-full h-8 px-2 rounded-md border border-border bg-input-background text-foreground text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block uppercase tracking-wide">Minutes</label>
                  <select
                    value={tempState.minutes}
                    onChange={(e) => {
                      setTempState({ ...tempState, minutes: parseInt(e.target.value) });
                    }}
                    className="w-full h-8 px-2 rounded-md border border-border bg-input-background text-foreground text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="0">0</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {mode === "duration-from" && tempState.type === "duration-from" && (
            <div className="pt-2 border-t border-border space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block uppercase tracking-wide">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={tempState.hours}
                    onChange={(e) => {
                      setTempState({ ...tempState, hours: parseInt(e.target.value) || 0 });
                    }}
                    className="w-full h-8 px-2 rounded-md border border-border bg-input-background text-foreground text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block uppercase tracking-wide">Minutes</label>
                  <select
                    value={tempState.minutes}
                    onChange={(e) => {
                      setTempState({ ...tempState, minutes: parseInt(e.target.value) });
                    }}
                    className="w-full h-8 px-2 rounded-md border border-border bg-input-background text-foreground text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="0">0</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block uppercase tracking-wide">Starting at</label>
                <input
                  type="time"
                  value={`${tempState.startHour.toString().padStart(2, '0')}:${tempState.startMin.toString().padStart(2, '0')}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    setTempState({ ...tempState, startHour: h, startMin: m });
                  }}
                  className="w-full h-8 px-2 rounded-md border border-border bg-input-background text-foreground text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          {/* Apply button */}
          {mode !== "right-now" && (
            <button
              onClick={handleApply}
              className="w-full h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-[12px] font-medium transition-colors"
            >
              Apply
            </button>
          )}

          {mode === "right-now" && (
            <button
              onClick={() => {
                onChange({ ...value, availability: { type: "right-now" } });
                onClose();
              }}
              className="w-full h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-[12px] font-medium transition-colors"
            >
              Apply
            </button>
          )}
        </div>
      </div>
    </>
  );
}
