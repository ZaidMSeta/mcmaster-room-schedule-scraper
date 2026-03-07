import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { BUILDINGS, formatTime } from "../data/rooms";

export type Day =
  | "today"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

export type AvailabilityMode =
  | { type: "right-now" }
  | {
      type: "time-range";
      startHour: number;
      startMin: number;
      endHour: number;
      endMin: number;
    }
  | { type: "duration"; hours: number; minutes: number }
  | {
      type: "duration-from";
      hours: number;
      minutes: number;
      startHour: number;
      startMin: number;
    };

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
  onSubmit,
  variant = "full",
}: QueryBuilderProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const isCompact = variant === "compact";

  const closeMenus = () => setOpenMenu(null);

  const updateAvailability = (availability: AvailabilityMode) => {
    onChange({ ...value, availability });
  };

  const openOnly = (menu: OpenMenu) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  const pillButtonClass = getPillButtonClass(isCompact);
  const pillStaticClass = getPillStaticClass(isCompact);
  const textClass = isCompact ? "text-[14px]" : "text-[17px]";

  return (
    <div className={isCompact ? "relative" : ""}>
      <div
        className={
          isCompact
            ? "flex items-center gap-2 flex-wrap"
            : "flex items-center gap-2 flex-wrap text-[17px] leading-relaxed"
        }
      >
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

                {BUILDINGS.filter((b) => b !== "All Buildings").map((building) => (
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
                      onChange({ ...value, day: day.value });
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

        {value.availability.type === "right-now" && (
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
                current={value.availability}
                onSelect={(next) => {
                  updateAvailability(next);
                  closeMenus();
                }}
                onClose={closeMenus}
              />
            )}
          </div>
        )}

        {value.availability.type === "time-range" && (
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
                  current={value.availability}
                  onSelect={(next) => {
                    updateAvailability(next);
                    closeMenus();
                  }}
                  onClose={closeMenus}
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
                  value.availability.startHour,
                  value.availability.startMin,
                )}
              </button>

              {openMenu === "start-time" && (
                <TimePopover
                  label="Start time"
                  hour={value.availability.startHour}
                  minute={value.availability.startMin}
                  onApply={(hour, minute) => {
                    updateAvailability({
                      ...value.availability,
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
                {formatTime(value.availability.endHour, value.availability.endMin)}
              </button>

              {openMenu === "end-time" && (
                <TimePopover
                  label="End time"
                  hour={value.availability.endHour}
                  minute={value.availability.endMin}
                  onApply={(hour, minute) => {
                    updateAvailability({
                      ...value.availability,
                      endHour: hour,
                      endMin: minute,
                    });
                    closeMenus();
                  }}
                  onClose={closeMenus}
                />
              )}
            </div>
          </>
        )}

        {value.availability.type === "duration" && (
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
                  current={value.availability}
                  onSelect={(next) => {
                    updateAvailability(next);
                    closeMenus();
                  }}
                  onClose={closeMenus}
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
                  value.availability.hours,
                  value.availability.minutes,
                )}
              </button>

              {openMenu === "duration" && (
                <DurationPopover
                  hours={value.availability.hours}
                  minutes={value.availability.minutes}
                  onApply={(hours, minutes) => {
                    updateAvailability({
                      ...value.availability,
                      hours,
                      minutes,
                    });
                    closeMenus();
                  }}
                  onClose={closeMenus}
                />
              )}
            </div>
          </>
        )}

        {value.availability.type === "duration-from" && (
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
                  current={value.availability}
                  onSelect={(next) => {
                    updateAvailability(next);
                    closeMenus();
                  }}
                  onClose={closeMenus}
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
                  value.availability.hours,
                  value.availability.minutes,
                )}
              </button>

              {openMenu === "duration" && (
                <DurationPopover
                  hours={value.availability.hours}
                  minutes={value.availability.minutes}
                  onApply={(hours, minutes) => {
                    updateAvailability({
                      ...value.availability,
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
                  value.availability.startHour,
                  value.availability.startMin,
                )}
              </button>

              {openMenu === "start-time" && (
                <TimePopover
                  label="Start time"
                  hour={value.availability.startHour}
                  minute={value.availability.startMin}
                  onApply={(hour, minute) => {
                    updateAvailability({
                      ...value.availability,
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

      {!isCompact && (
        <button
          type="button"
          onClick={onSubmit}
          className="mt-5 h-11 px-5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[15px] font-medium transition-colors"
        >
          Show rooms
        </button>
      )}
    </div>
  );
}

function AvailabilityModeMenu({
  current,
  onSelect,
  onClose,
}: {
  current: AvailabilityMode;
  onSelect: (next: AvailabilityMode) => void;
  onClose: () => void;
}) {
  return (
    <>
      <MenuBackdrop onClose={onClose} />
      <div className="absolute top-full left-0 mt-1.5 w-[280px] bg-card rounded-lg border border-border shadow-lg z-40 py-1">
        <button
          type="button"
          onClick={() => onSelect({ type: "right-now" })}
          className={menuItemClass(current.type === "right-now")}
        >
          Right now
        </button>

        <button
          type="button"
          onClick={() => onSelect(getDefaultAvailability("time-range", current))}
          className={menuItemClass(current.type === "time-range")}
        >
          From [time] to [time]
        </button>

        <button
          type="button"
          onClick={() => onSelect(getDefaultAvailability("duration", current))}
          className={menuItemClass(current.type === "duration")}
        >
          For at least [duration]
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

    return {
      type: "time-range",
      startHour: 9,
      startMin: 0,
      endHour: 12,
      endMin: 0,
    };
  }

  if (nextType === "duration") {
    if (current.type === "duration") {
      return current;
    }

    if (current.type === "duration-from") {
      return {
        type: "duration",
        hours: current.hours,
        minutes: current.minutes,
      };
    }

    return {
      type: "duration",
      hours: 1,
      minutes: 0,
    };
  }

  if (current.type === "duration-from") {
    return current;
  }

  if (current.type === "duration") {
    return {
      type: "duration-from",
      hours: current.hours,
      minutes: current.minutes,
      startHour: 9,
      startMin: 0,
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

function getPillButtonClass(isCompact: boolean) {
  return `${
    isCompact ? "h-7 px-2.5 text-[13px]" : "h-8 px-3 text-[15px]"
  } inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/8 hover:bg-primary/12 text-primary font-medium transition-colors`;
}

function getPillStaticClass(isCompact: boolean) {
  return `${
    isCompact ? "h-7 px-2.5 text-[13px]" : "h-8 px-3 text-[15px]"
  } inline-flex items-center rounded-md border border-primary/30 bg-primary/8 text-primary font-medium`;
}

function menuItemClass(selected: boolean) {
  return `w-full px-3.5 py-2 text-left text-[13px] transition-colors ${
    selected
      ? "bg-primary/10 text-primary font-medium"
      : "hover:bg-accent text-foreground"
  }`;
}