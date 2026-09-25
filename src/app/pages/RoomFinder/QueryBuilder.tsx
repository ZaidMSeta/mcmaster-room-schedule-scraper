import { useState, type ReactNode } from "react";
import type { AvailabilityMode, Day, QueryState, RawBuilding } from "../../lib/rooms/types";
import { formatTime, fromMins, LATEST_MINS, roundUpToQuarter, toMins } from "../../lib/rooms/time";
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
import { dayToDate, toIsoDate } from "../../lib/rooms/data";

interface QueryBuilderProps {
  value: QueryState;
  onChange: (value: QueryState) => void;
  buildings: RawBuilding[];
  now: Date;
}

type OpenPopover = null | "start-time" | "end-time" | "duration";

const DAYS: { value: Day; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
];

// Today, then the next six days in date order. The weekday that is today is left out since
// "Today" covers it, unless it's the current selection (e.g. from a link).
function dayOptions(now: Date, selected: Day) {
  const today = toIsoDate(dayToDate("today", now));
  return DAYS.filter(
    (d) => d.value === "today" || d.value === selected || toIsoDate(dayToDate(d.value, now)) !== today,
  ).sort((a, b) => dayToDate(a.value, now).getTime() - dayToDate(b.value, now).getTime() || (a.value === "today" ? -1 : 1));
}

// "Mon (Sep 28)": the date each choice resolves to (today, or the next one of that weekday)
function dayLabel(day: { value: Day; label: string }, now: Date): string {
  const date = dayToDate(day.value, now).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day.label} (${date})`;
}

// Radix Select can't use "" as a value
const ANY_BUILDING = "any";

// Shortest time range you can search
const MIN_RANGE = 30;

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

export function QueryBuilder({ value, onChange, buildings, now }: QueryBuilderProps) {
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
      newAvailability = getDefaultAvailability("at-time", avail);
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

      <Select
        value={value.building || ANY_BUILDING}
        onValueChange={(code) => onChange({ ...value, building: code === ANY_BUILDING ? "" : code })}
      >
        <SelectTrigger size="sm" className={cn(PILL, "max-w-[16rem]")} aria-label="Building">
          <SelectValue>
            {buildings.find((b) => b.code === value.building)?.name ?? "any building"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          <SelectItem value={ANY_BUILDING}>Any building</SelectItem>
          {buildings.map((building) => (
            <SelectItem key={building.code} value={building.code}>
              {building.name}
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
          {dayOptions(now, value.day).map((day) => (
            <SelectItem key={day.value} value={day.value}>
              {dayLabel(day, now)}
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
            updateAvailability(withValidEnd({ ...avail, startHour: hour, startMin: minute })),
          )}
          <Text>to</Text>
          {timePill("end-time", "End time", avail.endHour, avail.endMin, (hour, minute) =>
            updateAvailability(withValidEnd({ ...avail, endHour: hour, endMin: minute }, MIN_RANGE)),
          )}
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

function FormActions({
  onCancel,
  onApply,
  disabled = false,
}: {
  onCancel: () => void;
  onApply: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" size="sm" onClick={onApply} disabled={disabled}>
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
      <FormActions
        onCancel={onCancel}
        onApply={() => onApply(draftHours, draftMinutes)}
        disabled={draftHours === 0 && draftMinutes === 0}
      />
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

// Keeps the start time when switching modes; coming from "right now" starts at the next quarter hour
function getDefaultAvailability(
  nextType: AvailabilityMode["type"],
  current: AvailabilityMode,
): AvailabilityMode {
  if (nextType === current.type) return current;
  if (nextType === "right-now") return { type: "right-now" };

  const start =
    current.type === "at-time"
      ? toMins(current.hour, current.min)
      : current.type === "right-now"
        ? roundUpToQuarter(new Date())
        : toMins(current.startHour, current.startMin);
  const { hour, min } = fromMins(start);

  if (nextType === "at-time") return { type: "at-time", hour, min };

  if (nextType === "time-range") {
    return withValidEnd({ type: "time-range", startHour: hour, startMin: min, endHour: 0, endMin: 0 }, 120);
  }

  return { type: "duration-from", hours: 1, minutes: 0, startHour: hour, startMin: min };
}

type TimeRange = Extract<AvailabilityMode, { type: "time-range" }>;

// Keeps the end at least MIN_RANGE after the start; if it isn't, moves it to start + fallbackLength
function withValidEnd(range: TimeRange, fallbackLength = 60): TimeRange {
  const start = Math.min(toMins(range.startHour, range.startMin), LATEST_MINS - MIN_RANGE);
  let end = toMins(range.endHour, range.endMin);
  if (end < start + MIN_RANGE) end = Math.min(LATEST_MINS, start + fallbackLength);
  const s = fromMins(start);
  const e = fromMins(end);
  return { ...range, startHour: s.hour, startMin: s.min, endHour: e.hour, endMin: e.min };
}
