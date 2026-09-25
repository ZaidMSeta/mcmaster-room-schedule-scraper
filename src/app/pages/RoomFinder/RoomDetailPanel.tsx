import { useEffect } from "react";
import { X, Building2, Clock } from "lucide-react";
import type { Room, RoomStatus } from "../../lib/rooms/types";
import { getRoomStatus } from "../../lib/rooms/status";
import { DAY_END_HOUR, DAY_START_HOUR, formatDuration, formatTime, slotEnd, slotStart, toMins } from "../../lib/rooms/time";
import { STATUS_STYLES } from "./statusStyles";
import { TimelineStrip } from "./TimelineStrip";
import { LabTag } from "./RoomCard";

interface RoomDetailPanelProps {
  room: Room;
  // Reference time: the current time for today, or the queried time for other days
  currentHour: number;
  currentMin: number;
  dayLabel: string; // "today" or a weekday name
  onClose: () => void;
}

const DAY_START = DAY_START_HOUR;
const DAY_END = DAY_END_HOUR;

const STATUS_TITLES: Record<RoomStatus, string> = {
  free: "Available now",
  occupied: "Occupied",
  "soon-free": "Freeing up soon",
  "soon-occupied": "Available briefly",
};

function getSummaryLine(
  room: Room,
  status: RoomStatus,
  statusLabel: string,
  currentHour: number,
  currentMin: number,
  dayLabel: string,
): string {
  const nowMins = toMins(currentHour, currentMin);

  if (room.schedule.length === 0) {
    return `No classes scheduled ${dayLabel}. Available all day.`;
  }

  if (status === "free") {
    // schedule is sorted by start time
    const next = room.schedule.find((s) => slotStart(s) > nowMins);

    if (!next) {
      return `No more classes ${dayLabel}. Free for the rest of the day.`;
    }

    const minsUntil = slotStart(next) - nowMins;

    if (minsUntil >= 60) {
      const hrs = Math.floor(minsUntil / 60);
      const mins = minsUntil % 60;
      return `You have about ${hrs}h${mins > 0 ? ` ${mins}m` : ""} before the next class at ${formatTime(next.startHour, next.startMin)}.`;
    }

    return `Free for ${minsUntil} minutes until ${next.label} at ${formatTime(next.startHour, next.startMin)}.`;
  }

  if (status === "occupied" || status === "soon-free") {
    const current = room.schedule.find(
      (s) => nowMins >= slotStart(s) && nowMins < slotEnd(s),
    );

    if (current) {
      const endsAt = formatTime(current.endHour, current.endMin);
      const minsLeft = slotEnd(current) - nowMins;
      const nextAfter = room.schedule.find((s) => slotStart(s) >= slotEnd(current));

      if (!nextAfter) {
        return `${current.label} ends at ${endsAt} (${minsLeft} min). Free after that for the rest of the day.`;
      }

      const gap = slotStart(nextAfter) - slotEnd(current);

      if (gap > 0) {
        return `${current.label} ends at ${endsAt} (${minsLeft} min). Then free for ${gap} min.`;
      }

      return `${current.label} ends at ${endsAt} (${minsLeft} min). Another class follows immediately.`;
    }
  }

  if (status === "soon-occupied") {
    return `${statusLabel}. Consider a different room if you need more time.`;
  }

  return statusLabel;
}

interface ScheduleBlock {
  type: "free" | "class" | "past-class";
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  label?: string;
  isCurrent?: boolean;
  isNext?: boolean;
}

function buildScheduleBlocks(
  room: Room,
  currentHour: number,
  currentMin: number,
): ScheduleBlock[] {
  const nowMins = toMins(currentHour, currentMin);
  const blocks: ScheduleBlock[] = [];
  let cursor = DAY_START * 60;
  let foundNext = false;

  for (const slot of room.schedule) {
    const effectiveStart = Math.max(slotStart(slot), DAY_START * 60);
    const effectiveEnd = Math.min(slotEnd(slot), DAY_END * 60);

    if (effectiveEnd <= cursor) continue;

    if (effectiveStart > cursor) {
      blocks.push({
        type: "free",
        startHour: Math.floor(cursor / 60),
        startMin: cursor % 60,
        endHour: Math.floor(effectiveStart / 60),
        endMin: effectiveStart % 60,
      });
    }

    const isPast = effectiveEnd <= nowMins;
    const isCurrent = nowMins >= effectiveStart && nowMins < effectiveEnd;
    const isNext = !foundNext && !isPast && !isCurrent && effectiveStart > nowMins;

    if (isNext) foundNext = true;

    blocks.push({
      type: isPast ? "past-class" : "class",
      startHour: slot.startHour,
      startMin: slot.startMin,
      endHour: slot.endHour,
      endMin: slot.endMin,
      label: slot.label,
      isCurrent,
      isNext,
    });

    cursor = Math.max(cursor, effectiveEnd);
  }

  if (cursor < DAY_END * 60) {
    blocks.push({
      type: "free",
      startHour: Math.floor(cursor / 60),
      startMin: cursor % 60,
      endHour: DAY_END,
      endMin: 0,
    });
  }

  return blocks;
}

function blockDurationMins(block: ScheduleBlock): number {
  return slotEnd(block) - slotStart(block);
}

export function RoomDetailPanel({
  room,
  currentHour,
  currentMin,
  dayLabel,
  onClose,
}: RoomDetailPanelProps) {
  const nowMins = toMins(currentHour, currentMin);

  const { status, label: statusLabel } = getRoomStatus(
    room,
    currentHour,
    currentMin,
  );

  const style = STATUS_STYLES[status];
  const summary = getSummaryLine(
    room,
    status,
    statusLabel,
    currentHour,
    currentMin,
    dayLabel,
  );
  const blocks = buildScheduleBlocks(room, currentHour, currentMin);

  const totalClasses = room.schedule.length;
  const remainingClasses = room.schedule.filter((s) => slotEnd(s) > nowMins).length;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-30 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed top-0 right-0 h-full w-[460px] max-w-[90vw] bg-background z-40 shadow-2xl flex flex-col overflow-hidden border-l border-border">
        <div className="bg-card border-b border-border px-6 py-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[20px] font-medium text-foreground tracking-tight">
                {room.buildingCode} {room.roomNumber}
              </h2>
              <div className="flex items-center gap-1.5 mt-1 text-[14px] text-muted-foreground">
                <Building2 className="w-3.5 h-3.5" />
                {room.building}
              </div>
              {room.isLab && (
                <div className="mt-2">
                  <LabTag />
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors flex-shrink-0 mt-0.5"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div
            className={`mt-4 px-4 py-3 rounded-xl ${style.bg} border ${style.border}`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-2 h-2 rounded-full ${style.dot}`} />
              <span className={`text-[14px] font-medium ${style.text}`}>
                {STATUS_TITLES[status]}
              </span>
            </div>
            <p className={`text-[13px] ${style.text} opacity-80 mt-1 ml-[18px]`}>
              {statusLabel}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-5 pb-4">
            <p className="text-[13px] text-foreground leading-relaxed">
              {summary}
            </p>
            <div className="flex items-center gap-4 mt-3 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(currentHour, currentMin)}
              </span>
              <span>
                {totalClasses === 0
                  ? `No classes ${dayLabel}`
                  : `${remainingClasses} of ${totalClasses} class${totalClasses !== 1 ? "es" : ""} remaining`}
              </span>
            </div>
          </div>

          <div className="px-6 pb-2">
            <TimelineStrip schedule={room.schedule} showNow={dayLabel === "today"} />
          </div>

          <div className="mx-6 my-4 border-t border-border" />

          <div className="px-6 pb-8">
            <h3 className="text-[12px] text-muted-foreground uppercase tracking-wide mb-4">
              Full day schedule
            </h3>

            <div className="space-y-0">
              {blocks.map((block, i) => {
                const duration = blockDurationMins(block);
                const timeRange = `${formatTime(block.startHour, block.startMin)} - ${formatTime(block.endHour, block.endMin)}`;
                const isPast = slotEnd(block) <= nowMins;
                const isCurrent = nowMins >= slotStart(block) && nowMins < slotEnd(block);

                if (block.type === "free") {
                  return (
                    <div key={`block-${i}`} className="relative flex items-stretch">
                      <div className="w-[88px] flex-shrink-0 pr-3 py-2.5 text-right">
                        <span
                          className={`text-[12px] ${
                            isPast
                              ? "text-muted-foreground/40"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatTime(block.startHour, block.startMin)}
                        </span>
                      </div>

                      <div className="w-5 flex-shrink-0 flex flex-col items-center relative">
                        <div
                          className={`w-2 h-2 rounded-full mt-3.5 z-10 ${
                            isPast
                              ? "bg-[#d4d4d4]"
                              : isCurrent
                                ? "bg-[#4caf50] ring-4 ring-[#4caf50]/20"
                                : "bg-[#4caf50]"
                          }`}
                        />
                        {i < blocks.length - 1 && (
                          <div
                            className={`flex-1 w-px ${
                              isPast ? "bg-border/40" : "bg-border"
                            }`}
                          />
                        )}
                      </div>

                      <div className="flex-1 pl-3 py-2">
                        <div
                          className={`rounded-lg px-3.5 py-2.5 ${
                            isCurrent
                              ? "bg-[#e8f5e9] border border-[#c8e6c9]"
                              : isPast
                                ? "bg-muted/30"
                                : "bg-[#f0fdf0]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[13px] font-medium ${
                                isPast
                                  ? "text-muted-foreground/50"
                                  : isCurrent
                                    ? "text-[#2e7d32]"
                                    : "text-[#2e7d32]/80"
                              }`}
                            >
                              {isCurrent ? "Free now" : "Free"}
                            </span>
                            <span
                              className={`text-[12px] ${
                                isPast
                                  ? "text-muted-foreground/30"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {formatDuration(duration)}
                            </span>
                          </div>
                          {isCurrent && (
                            <p className="text-[12px] text-[#2e7d32]/70 mt-0.5">
                              {timeRange}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={`block-${i}`} className="relative flex items-stretch">
                    <div className="w-[88px] flex-shrink-0 pr-3 py-2.5 text-right">
                      <span
                        className={`text-[12px] ${
                          block.type === "past-class"
                            ? "text-muted-foreground/40"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatTime(block.startHour, block.startMin)}
                      </span>
                    </div>

                    <div className="w-5 flex-shrink-0 flex flex-col items-center relative">
                      <div
                        className={`w-2 h-2 rounded-full mt-3.5 z-10 ${
                          block.type === "past-class"
                            ? "bg-[#d4d4d4]"
                            : block.isCurrent
                              ? "bg-[#ef5350] ring-4 ring-[#ef5350]/20"
                              : block.isNext
                                ? "bg-[#ffb300] ring-4 ring-[#ffb300]/15"
                                : "bg-[#ef9a9a]"
                        }`}
                      />
                      {i < blocks.length - 1 && (
                        <div
                          className={`flex-1 w-px ${
                            block.type === "past-class"
                              ? "bg-border/40"
                              : "bg-border"
                          }`}
                        />
                      )}
                    </div>

                    <div className="flex-1 pl-3 py-2">
                      <div
                        className={`rounded-lg px-3.5 py-2.5 border ${
                          block.type === "past-class"
                            ? "bg-muted/20 border-border/30"
                            : block.isCurrent
                              ? "bg-[#ffebee] border-[#ffcdd2]"
                              : block.isNext
                                ? "bg-[#fff8e1] border-[#ffecb3]"
                                : "bg-[#fff5f5] border-[#ffe0e0]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[13px] font-medium ${
                              block.type === "past-class"
                                ? "text-muted-foreground/40 line-through"
                                : block.isCurrent
                                  ? "text-[#c62828]"
                                  : block.isNext
                                    ? "text-[#f57f17]"
                                    : "text-foreground"
                            }`}
                          >
                            {block.label}
                          </span>
                          <span
                            className={`text-[12px] ${
                              block.type === "past-class"
                                ? "text-muted-foreground/30"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatDuration(duration)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[12px] ${
                              block.type === "past-class"
                                ? "text-muted-foreground/30"
                                : "text-muted-foreground"
                            }`}
                          >
                            {timeRange}
                          </span>
                          {block.isCurrent && (
                            <span className="text-[11px] font-medium text-[#c62828] bg-[#ffcdd2] px-1.5 py-0 rounded">
                              NOW
                            </span>
                          )}
                          {block.isNext && (
                            <span className="text-[11px] font-medium text-[#f57f17] bg-[#ffecb3] px-1.5 py-0 rounded">
                              NEXT
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="relative flex items-stretch">
                <div className="w-[88px] flex-shrink-0 pr-3 py-2.5 text-right">
                  <span className="text-[12px] text-muted-foreground/40">
                    {formatTime(DAY_END, 0)}
                  </span>
                </div>
                <div className="w-5 flex-shrink-0 flex flex-col items-center">
                  <div className="w-1.5 h-1.5 rounded-full mt-3.5 bg-border" />
                </div>
                <div className="flex-1 pl-3 py-2.5">
                  <span className="text-[12px] text-muted-foreground/50">
                    End of scheduled hours
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}