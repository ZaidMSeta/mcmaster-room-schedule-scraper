import type { TimeSlot } from "../data/rooms";

interface TimelineStripProps {
  schedule: TimeSlot[];
  compact?: boolean;
  showNow?: boolean;
}

const DAY_START = 8; // 8 AM
const DAY_END = 18; // 6 PM
const TOTAL_HOURS = DAY_END - DAY_START;

export function TimelineStrip({
  schedule,
  compact = false,
  showNow = true,
}: TimelineStripProps) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const nowMins = currentHour * 60 + currentMin;

  const dayStartMins = DAY_START * 60;
  const dayEndMins = DAY_END * 60;
  const totalMins = dayEndMins - dayStartMins;

  const getPercent = (hour: number, min: number) => {
    const mins = hour * 60 + min;
    return ((mins - dayStartMins) / totalMins) * 100;
  };

  const nowPercent = ((nowMins - dayStartMins) / totalMins) * 100;

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => DAY_START + i);

  return (
    <div>
      {!compact && (
        <div className="relative h-5 mb-1">
          {hours.filter((_, i) => i % 2 === 0).map((h) => {
            const pct = getPercent(h, 0);
            const label = h > 12 ? `${h - 12}p` : h === 12 ? "12p" : `${h}a`;

            return (
              <span
                key={h}
                className="absolute text-[11px] text-muted-foreground -translate-x-1/2"
                style={{ left: `${pct}%` }}
              >
                {label}
              </span>
            );
          })}
        </div>
      )}

      <div
        className={`relative w-full rounded-full overflow-hidden ${
          compact ? "h-2.5" : "h-3.5"
        }`}
        style={{ backgroundColor: "#e8f5e9" }}
      >
        {schedule.map((slot, i) => {
          const left = Math.max(0, getPercent(slot.startHour, slot.startMin));
          const right = Math.min(100, getPercent(slot.endHour, slot.endMin));
          const width = right - left;

          if (width <= 0) return null;

          const slotEndMins = slot.endHour * 60 + slot.endMin;
          const isPast = slotEndMins <= nowMins;

          return (
            <div
              key={i}
              className="absolute top-0 h-full rounded-sm"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: isPast ? "#d4d4d4" : "#ef9a9a",
              }}
              title={slot.label}
            />
          );
        })}

        {showNow && nowPercent >= 0 && nowPercent <= 100 && (
          <div
            className="absolute top-0 h-full w-[2px] z-10"
            style={{
              left: `${nowPercent}%`,
              backgroundColor: "#2d3748",
            }}
          />
        )}
      </div>

      {compact && (
        <div className="relative h-4 mt-0.5">
          {[8, 12, 16].map((h) => {
            const pct = getPercent(h, 0);
            const label = h > 12 ? `${h - 12}p` : h === 12 ? "12p" : `${h}a`;

            return (
              <span
                key={h}
                className="absolute text-[10px] text-muted-foreground -translate-x-1/2"
                style={{ left: `${pct}%` }}
              >
                {label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}