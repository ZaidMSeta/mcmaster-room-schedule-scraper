import type { TimeSlot } from "../../lib/rooms/types";
import { DAY_END_HOUR, DAY_START_HOUR, slotEnd, slotStart } from "../../lib/rooms/time";
import { cn } from "../../components/ui/utils";
import { TIMELINE } from "./statusStyles";

interface TimelineStripProps {
  schedule: TimeSlot[];
  // Classes that end by this time are drawn as past
  refMins: number;
  // Draws the "now" line here; left out when not looking at today
  nowMins?: number;
  compact?: boolean;
}

const DAY_START = DAY_START_HOUR * 60;
const DAY_END = DAY_END_HOUR * 60;

function toPercent(mins: number) {
  return ((mins - DAY_START) / (DAY_END - DAY_START)) * 100;
}

function hourLabel(h: number) {
  return h > 12 ? `${h - 12}p` : h === 12 ? "12p" : `${h}a`;
}

export function TimelineStrip({
  schedule,
  refMins,
  nowMins,
  compact = false,
}: TimelineStripProps) {
  const nowPercent = nowMins === undefined ? -1 : toPercent(nowMins);

  const ticks = compact
    ? [8, 12, 17, 22]
    : Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i).filter(
        (_, i) => i % 2 === 0,
      );

  const tickRow = (
    <div className={cn("relative", compact ? "h-4 mt-0.5" : "h-5 mb-1")} aria-hidden>
      {ticks.map((h) => (
        <span
          key={h}
          className={cn(
            "absolute text-muted-foreground -translate-x-1/2",
            compact ? "text-[10px]" : "text-xs",
          )}
          style={{ left: `${toPercent(h * 60)}%` }}
        >
          {hourLabel(h)}
        </span>
      ))}
    </div>
  );

  return (
    <div>
      {!compact && tickRow}

      <div
        className={cn(
          "relative w-full rounded-full overflow-hidden",
          compact ? "h-2.5" : "h-3.5",
          TIMELINE.track,
        )}
      >
        {schedule.map((slot, i) => {
          const left = Math.max(0, toPercent(slotStart(slot)));
          const right = Math.min(100, toPercent(slotEnd(slot)));
          if (right <= left) return null;

          return (
            <div
              key={i}
              className={cn(
                "absolute top-0 h-full rounded-sm",
                slotEnd(slot) <= refMins ? TIMELINE.pastClass : TIMELINE.class,
              )}
              style={{ left: `${left}%`, width: `${right - left}%` }}
              title={slot.label}
            />
          );
        })}

        {nowPercent >= 0 && nowPercent <= 100 && (
          <div
            className={cn("absolute top-0 h-full w-[2px] z-10", TIMELINE.now)}
            style={{ left: `${nowPercent}%` }}
          />
        )}
      </div>

      {compact && tickRow}
    </div>
  );
}
