import { useState, type ReactNode } from "react";
import type { AvailabilityMode, Day, QueryState } from "../../lib/rooms/types";
import { formatTime } from "../../lib/rooms/time";
import { Button } from "../../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { cn } from "../../components/ui/utils";

interface QueryBuilderProps {
  value: QueryState;
  onChange: (value: QueryState) => void;
  buildings: string[];
}

type OpenPopover = null | "start-time" | "end-time" | "duration";

const DAYS: { value: Day; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
];

const MODE_TRIGGER_LABEL: Record<AvailabilityMode["type"], string> = {
  "right-now": "right now",
  "at-time": "at",
  "time-range": "from",
  "duration-from": "for at least",
};

const PILL =
  "h-8 w-auto gap-1.5 rounded-md border-primary/30 bg-primary/10 px-2.5 text-sm font-medium text-primary hover:bg-primary/15 dark:bg-primary/10 dark:hover:bg-primary/15 [&_svg:not([class*='text-'])]:text-primary/70";

const INPUT =
  "w-full h-9 px-2.5 rounded-md border bg-input-background text-foreground text-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function QueryBuilder({ value, onChange, buildings }: QueryBuilderProps) {
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
  // const binding keeps the discriminated-union narrowing inside callbacks
  const avail = value.availability;
  const isToday = value.day === "today";

  const updateAvailability = (availability: AvailabilityMode) => {
    onChange({ ...value, availability });
  };

  const popoverProps = (name: Exclude<OpenPopover, null>) => ({
    open: openPopover === name,
    onOpenChange: (open: boolean) => setOpenPopover(open ? name : null),
  });

  const changeDay = (newDay: Day) => {
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
  };

  const timePill = (
    name: "start-time" | "end-time",
    label: string,
    hour: number,
    minute: number,
    onApply: (hour: number, minute: number) => void,
  ) => (
    <Popover {...popoverProps(name)}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(PILL, "inline-flex items-center border")}>
          {formatTime(hour, minute)}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-3">
        <TimeForm
          label={label}
          hour={hour}
          minute={minute}
          onApply={(h, m) => {
            onApply(h, m);
            setOpenPopover(null);
          }}
          onCancel={() => setOpenPopover(null)}
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Text>Find me a room in</Text>

      <Select value={value.building} onValueChange={(building) => onChange({ ...value, building })}>
        <SelectTrigger size="sm" className={cn(PILL, "max-w-[16rem]")} aria-label="Building">
          <SelectValue>
            {value.building === "All Buildings" ? "any building" : value.building}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {buildings.map((building) => (
            <SelectItem key={building} value={building}>
              {building === "All Buildings" ? "Any building" : building}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Text>on</Text>

      <Select value={value.day} onValueChange={(day) => changeDay(day as Day)}>
        <SelectTrigger size="sm" className={PILL} aria-label="Day">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DAYS.map((day) => (
            <SelectItem key={day.value} value={day.value}>
              {day.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Text>that is free</Text>

      <Select
        value={avail.type}
        onValueChange={(type) =>
          updateAvailability(getDefaultAvailability(type as AvailabilityMode["type"], avail))
        }
      >
        <SelectTrigger size="sm" className={PILL} aria-label="Availability">
          <SelectValue>{MODE_TRIGGER_LABEL[avail.type]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {isToday ? (
            <SelectItem value="right-now">Right now</SelectItem>
          ) : (
            <SelectItem value="at-time">At a time</SelectItem>
          )}
          <SelectItem value="time-range">Between two times</SelectItem>
          <SelectItem value="duration-from">For a length of time</SelectItem>
        </SelectContent>
      </Select>

      {avail.type === "at-time" &&
        timePill("start-time", "Time", avail.hour, avail.min, (hour, min) =>
          updateAvailability({ type: "at-time", hour, min }),
        )}

      {avail.type === "time-range" && (
        <>
          {timePill("start-time", "Start time", avail.startHour, avail.startMin, (hour, minute) =>
            updateAvailability({ ...avail, startHour: hour, startMin: minute }),
          )}
          <Text>to</Text>
          {timePill("end-time", "End time", avail.endHour, avail.endMin, (hour, minute) => {
            const startMins = avail.startHour * 60 + avail.startMin;
            const endMins = hour * 60 + minute;
            // clamp: end must be at least 30 min after start
            const clamped = Math.min(1410, endMins <= startMins ? startMins + 30 : endMins);
            updateAvailability({
              ...avail,
              endHour: Math.floor(clamped / 60),
              endMin: clamped % 60,
            });
          })}
        </>
      )}

      {avail.type === "duration-from" && (
        <>
          <Popover {...popoverProps("duration")}>
            <PopoverTrigger asChild>
              <button type="button" className={cn(PILL, "inline-flex items-center border")}>
                {formatDuration(avail.hours, avail.minutes)}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-60 p-3">
              <DurationForm
                hours={avail.hours}
                minutes={avail.minutes}
                onApply={(hours, minutes) => {
                  updateAvailability({ ...avail, hours, minutes });
                  setOpenPopover(null);
                }}
                onCancel={() => setOpenPopover(null)}
              />
            </PopoverContent>
          </Popover>
          <Text>starting at</Text>
          {timePill("start-time", "Start time", avail.startHour, avail.startMin, (hour, minute) =>
            updateAvailability({ ...avail, startHour: hour, startMin: minute }),
          )}
        </>
      )}
    </div>
  );
}

function Text({ children }: { children: ReactNode }) {
  return <span className="text-sm text-muted-foreground">{children}</span>;
}

function FormActions({ onCancel, onApply }: { onCancel: () => void; onApply: () => void }) {
  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" size="sm" onClick={onApply}>
        Apply
      </Button>
    </div>
  );
}

function TimeForm({
  label,
  hour,
  minute,
  onApply,
  onCancel,
}: {
  label: string;
  hour: number;
  minute: number;
  onApply: (hour: number, minute: number) => void;
  onCancel: () => void;
}) {
  const [time, setTime] = useState(
    `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
  );
  const apply = () => {
    const [nextHour, nextMinute] = time.split(":").map(Number);
    onApply(nextHour, nextMinute);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wide">
        {label}
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className={cn(INPUT, "mt-1.5 normal-case tracking-normal")}
        />
      </label>
      <FormActions onCancel={onCancel} onApply={apply} />
    </form>
  );
}

function DurationForm({
  hours,
  minutes,
  onApply,
  onCancel,
}: {
  hours: number;
  minutes: number;
  onApply: (hours: number, minutes: number) => void;
  onCancel: () => void;
}) {
  const [draftHours, setDraftHours] = useState(hours);
  const [draftMinutes, setDraftMinutes] = useState(minutes);
  const labelClass = "text-xs text-muted-foreground block uppercase tracking-wide";

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <label className={labelClass}>
          Hours
          <input
            type="number"
            min="0"
            max="12"
            value={draftHours}
            onChange={(e) => setDraftHours(parseInt(e.target.value, 10) || 0)}
            className={cn(INPUT, "mt-1.5")}
          />
        </label>
        <label className={labelClass}>
          Minutes
          <select
            value={draftMinutes}
            onChange={(e) => setDraftMinutes(parseInt(e.target.value, 10))}
            className={cn(INPUT, "mt-1.5")}
          >
            <option value={0}>0</option>
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={45}>45</option>
          </select>
        </label>
      </div>
      <FormActions onCancel={onCancel} onApply={() => onApply(draftHours, draftMinutes)} />
    </div>
  );
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
