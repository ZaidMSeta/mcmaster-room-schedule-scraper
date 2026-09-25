import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { AvailabilityMode, Day, QueryState } from "../../lib/rooms/types";
import { formatTime } from "../../lib/rooms/time";

interface QueryBuilderProps {
  value: QueryState;
  onChange: (value: QueryState) => void;
  buildings: string[];
}

type OpenMenu =
  | null
  | "building"
  | "day"
  | "availability-mode"
  | "start-time"
  | "end-time"
  | "duration";

const DAYS: { value: Day; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
];

export function QueryBuilder({
  value,
  onChange,
  buildings,
}: QueryBuilderProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);

  const closeMenus = () => setOpenMenu(null);

  const updateAvailability = (availability: AvailabilityMode) => {
    onChange({ ...value, availability });
  };

  const openOnly = (menu: OpenMenu) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  const pillButtonClass =
    "h-7 px-2.5 text-[13px] inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/8 hover:bg-primary/12 text-primary font-medium transition-colors";
  const textClass = "text-[14px]";
  // const binding keeps the discriminated-union narrowing inside callbacks
  const avail = value.availability;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`${textClass} text-muted-foreground`}>
          Find me a room in
        </span>

        <div className="relative inline-block">
          <button
            onClick={() => openOnly("building")}
            className={pillButtonClass}
            type="button"
          >
            {value.building === "All Buildings" ? "any building" : value.building}
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {openMenu === "building" && (
            <>
              <MenuBackdrop onClose={closeMenus} />
              <div className="absolute top-full left-0 mt-1.5 min-w-[220px] bg-card rounded-lg border border-border shadow-lg z-40 py-1">
                <button
                  type="button"
                  onClick={() => {
                    onChange({ ...value, building: "All Buildings" });
                    closeMenus();
                  }}
                  className={`w-full px-3.5 py-2 text-left text-[14px] hover:bg-accent transition-colors ${
                    value.building === "All Buildings"
                      ? "bg-primary/8 text-primary font-medium"
                      : "text-foreground"
                  }`}
                >
                  Any building
                </button>

                {buildings.filter((b) => b !== "All Buildings").map((building) => (
                  <button
                    key={building}
                    type="button"
                    onClick={() => {
                      onChange({ ...value, building });
                      closeMenus();
                    }}
                    className={`w-full px-3.5 py-2 text-left text-[14px] hover:bg-accent transition-colors ${
                      value.building === building
                        ? "bg-primary/8 text-primary font-medium"
                        : "text-foreground"
                    }`}
                  >
                    {building}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <span className={`${textClass} text-muted-foreground`}>on</span>

        <div className="relative inline-block">
          <button
            onClick={() => openOnly("day")}
            className={pillButtonClass}
            type="button"
          >
            {getDayLabel(value.day)}
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {openMenu === "day" && (
            <>
              <MenuBackdrop onClose={closeMenus} />
              <div className="absolute top-full left-0 mt-1.5 min-w-[140px] bg-card rounded-lg border border-border shadow-lg z-40 py-1">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => {
                      const newDay = day.value;
                      let newAvailability = avail;

                      // switching away from today: right-now doesn't apply, default to at-time
                      if (newDay !== "today" && avail.type === "right-now") {
                        const now = new Date();
                        newAvailability = { type: "at-time", hour: now.getHours(), min: now.getMinutes() };
                      }

                      // switching back to today: at-time becomes right-now
                      if (newDay === "today" && avail.type === "at-time") {
                        newAvailability = { type: "right-now" };
                      }

                      onChange({ ...value, day: newDay, availability: newAvailability });
                      closeMenus();
                    }}
                    className={`w-full px-3.5 py-2 text-left text-[14px] hover:bg-accent transition-colors ${
                      value.day === day.value
                        ? "bg-primary/8 text-primary font-medium"
                        : "text-foreground"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <span className={`${textClass} text-muted-foreground`}>that is free</span>

        {avail.type === "right-now" && (
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => openOnly("availability-mode")}
              className={pillButtonClass}
            >
              right now
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {openMenu === "availability-mode" && (
              <AvailabilityModeMenu
                current={avail}
                onSelect={(next) => {
                  updateAvailability(next);
                  closeMenus();
                }}
                onClose={closeMenus}
                isToday={true}
              />
            )}
          </div>
        )}

        {avail.type === "at-time" && (
          <>
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => openOnly("availability-mode")}
                className={pillButtonClass}
              >
                at
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {openMenu === "availability-mode" && (
                <AvailabilityModeMenu
                  current={avail}
                  onSelect={(next) => {
                    updateAvailability(next);
                    closeMenus();
                  }}
                  onClose={closeMenus}
                  isToday={false}
                />
              )}
            </div>

            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => openOnly("start-time")}
                className={pillButtonClass}
              >
                {formatTime(avail.hour, avail.min)}
              </button>

              {openMenu === "start-time" && (
                <TimePopover
                  label="Time"
                  hour={avail.hour}
                  minute={avail.min}
                  onApply={(hour, minute) => {
                    updateAvailability({ type: "at-time", hour, min: minute });
                    closeMenus();
                  }}
                  onClose={closeMenus}
                />
              )}
            </div>
          </>
        )}

        {avail.type === "time-range" && (
          <>
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => openOnly("availability-mode")}
                className={pillButtonClass}
              >
                from
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {openMenu === "availability-mode" && (
                <AvailabilityModeMenu
                  current={avail}
                  onSelect={(next) => {
                    updateAvailability(next);
                    closeMenus();
                  }}
                  onClose={closeMenus}
                  isToday={value.day === "today"}
                />
              )}
            </div>

            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => openOnly("start-time")}
                className={pillButtonClass}
              >
                {formatTime(
                  avail.startHour,
                  avail.startMin,
                )}
              </button>

              {openMenu === "start-time" && (
                <TimePopover
                  label="Start time"
                  hour={avail.startHour}
                  minute={avail.startMin}
                  onApply={(hour, minute) => {
                    updateAvailability({
                      ...avail,
                      startHour: hour,
                      startMin: minute,
                    });
                    closeMenus();
                  }}
                  onClose={closeMenus}
                />
              )}
            </div>

            <span className={`${textClass} text-muted-foreground`}>to</span>

            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => openOnly("end-time")}
                className={pillButtonClass}
              >
                {formatTime(avail.endHour, avail.endMin)}
              </button>

              {openMenu === "end-time" && (
                <TimePopover
                  label="End time"
                  hour={avail.endHour}
                  minute={avail.endMin}
                  onApply={(hour, minute) => {
                    const startMins = avail.startHour * 60 + avail.startMin;
                    const endMins = hour * 60 + minute;
                    // clamp: end must be at least 30 min after start
                    const clamped = Math.min(1410, endMins <= startMins ? startMins + 30 : endMins);
                    updateAvailability({
                      ...avail,
                      endHour: Math.floor(clamped / 60),
                      endMin: clamped % 60,
                    });
                    closeMenus();
                  }}
                  onClose={closeMenus}
                />
              )}
            </div>
          </>
        )}


        {avail.type === "duration-from" && (
          <>
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => openOnly("availability-mode")}
                className={pillButtonClass}
              >
                for at least
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {openMenu === "availability-mode" && (
                <AvailabilityModeMenu
                  current={avail}
                  onSelect={(next) => {
                    updateAvailability(next);
                    closeMenus();
                  }}
                  onClose={closeMenus}
                  isToday={value.day === "today"}
                />
              )}
            </div>

            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => openOnly("duration")}
                className={pillButtonClass}
              >
                {formatDuration(
                  avail.hours,
                  avail.minutes,
                )}
              </button>

              {openMenu === "duration" && (
                <DurationPopover
                  hours={avail.hours}
                  minutes={avail.minutes}
                  onApply={(hours, minutes) => {
                    updateAvailability({
                      ...avail,
                      hours,
                      minutes,
                    });
                    closeMenus();
                  }}
                  onClose={closeMenus}
                />
              )}
            </div>

            <span className={`${textClass} text-muted-foreground`}>
              starting at
            </span>

            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => openOnly("start-time")}
                className={pillButtonClass}
              >
                {formatTime(
                  avail.startHour,
                  avail.startMin,
                )}
              </button>

              {openMenu === "start-time" && (
                <TimePopover
                  label="Start time"
                  hour={avail.startHour}
                  minute={avail.startMin}
                  onApply={(hour, minute) => {
                    updateAvailability({
                      ...avail,
                      startHour: hour,
                      startMin: minute,
                    });
                    closeMenus();
                  }}
                  onClose={closeMenus}
                />
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
}

function AvailabilityModeMenu({
  current,
  onSelect,
  onClose,
  isToday,
}: {
  current: AvailabilityMode;
  onSelect: (next: AvailabilityMode) => void;
  onClose: () => void;
  isToday: boolean;
}) {
  return (
    <>
      <MenuBackdrop onClose={onClose} />
      <div className="absolute top-full left-0 mt-1.5 w-[280px] bg-card rounded-lg border border-border shadow-lg z-40 py-1">
        {isToday ? (
          <button
            type="button"
            onClick={() => onSelect({ type: "right-now" })}
            className={menuItemClass(current.type === "right-now")}
          >
            Right now
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelect(getDefaultAvailability("at-time", current))}
            className={menuItemClass(current.type === "at-time")}
          >
            At [time]
          </button>
        )}

        <button
          type="button"
          onClick={() => onSelect(getDefaultAvailability("time-range", current))}
          className={menuItemClass(current.type === "time-range")}
        >
          From [time] to [time]
        </button>

        <button
          type="button"
          onClick={() =>
            onSelect(getDefaultAvailability("duration-from", current))
          }
          className={menuItemClass(current.type === "duration-from")}
        >
          For at least [duration] starting at [time]
        </button>
      </div>
    </>
  );
}

function TimePopover({
  label,
  hour,
  minute,
  onApply,
  onClose,
}: {
  label: string;
  hour: number;
  minute: number;
  onApply: (hour: number, minute: number) => void;
  onClose: () => void;
}) {
  const [time, setTime] = useState(
    `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
  );

  return (
    <>
      <MenuBackdrop onClose={onClose} />
      <div className="absolute top-full left-0 mt-1.5 w-[220px] bg-card rounded-lg border border-border shadow-lg z-40 p-3">
        <label className="text-[11px] text-muted-foreground mb-1.5 block uppercase tracking-wide">
          {label}
        </label>

        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full h-9 px-2.5 rounded-md border border-border bg-input-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-md text-[12px] text-muted-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const [nextHour, nextMinute] = time.split(":").map(Number);
              onApply(nextHour, nextMinute);
            }}
            className="h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-medium transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
}

function DurationPopover({
  hours,
  minutes,
  onApply,
  onClose,
}: {
  hours: number;
  minutes: number;
  onApply: (hours: number, minutes: number) => void;
  onClose: () => void;
}) {
  const [draftHours, setDraftHours] = useState(hours);
  const [draftMinutes, setDraftMinutes] = useState(minutes);

  return (
    <>
      <MenuBackdrop onClose={onClose} />
      <div className="absolute top-full left-0 mt-1.5 w-[240px] bg-card rounded-lg border border-border shadow-lg z-40 p-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1.5 block uppercase tracking-wide">
              Hours
            </label>
            <input
              type="number"
              min="0"
              max="12"
              value={draftHours}
              onChange={(e) => setDraftHours(parseInt(e.target.value, 10) || 0)}
              className="w-full h-9 px-2.5 rounded-md border border-border bg-input-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground mb-1.5 block uppercase tracking-wide">
              Minutes
            </label>
            <select
              value={draftMinutes}
              onChange={(e) => setDraftMinutes(parseInt(e.target.value, 10))}
              className="w-full h-9 px-2.5 rounded-md border border-border bg-input-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value={0}>0</option>
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={45}>45</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-md text-[12px] text-muted-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApply(draftHours, draftMinutes)}
            className="h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-medium transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
}

function MenuBackdrop({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-30" onClick={onClose} />;
}

function getDayLabel(day: Day) {
  return DAYS.find((d) => d.value === day)?.label ?? "Today";
}

function formatDuration(hours: number, minutes: number) {
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }

  return `${minutes} min`;
}

function getDefaultAvailability(
  nextType: AvailabilityMode["type"],
  current: AvailabilityMode,
): AvailabilityMode {
  if (nextType === "right-now") {
    return { type: "right-now" };
  }

  if (nextType === "at-time") {
    if (current.type === "at-time") return current;
    if (current.type === "time-range") return { type: "at-time", hour: current.startHour, min: current.startMin };
    if (current.type === "duration-from") return { type: "at-time", hour: current.startHour, min: current.startMin };
    const now = new Date();
    return { type: "at-time", hour: now.getHours(), min: now.getMinutes() };
  }

  if (nextType === "time-range") {
    if (current.type === "time-range") {
      return current;
    }

    if (current.type === "duration-from") {
      return {
        type: "time-range",
        startHour: current.startHour,
        startMin: current.startMin,
        endHour: current.startHour + 2,
        endMin: current.startMin,
      };
    }

    if (current.type === "at-time") {
      return {
        type: "time-range",
        startHour: current.hour,
        startMin: current.min,
        endHour: current.hour + 2,
        endMin: current.min,
      };
    }

    return {
      type: "time-range",
      startHour: 9,
      startMin: 0,
      endHour: 12,
      endMin: 0,
    };
  }

  // duration-from
  if (current.type === "duration-from") {
    return current;
  }

  if (current.type === "at-time") {
    return {
      type: "duration-from",
      hours: 1,
      minutes: 0,
      startHour: current.hour,
      startMin: current.min,
    };
  }

  return {
    type: "duration-from",
    hours: 1,
    minutes: 0,
    startHour: 9,
    startMin: 0,
  };
}

function menuItemClass(selected: boolean) {
  return `w-full px-3.5 py-2 text-left text-[13px] transition-colors ${
    selected
      ? "bg-primary/10 text-primary font-medium"
      : "hover:bg-accent text-foreground"
  }`;
}