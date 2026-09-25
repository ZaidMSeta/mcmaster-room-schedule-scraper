import { Fragment, useRef } from "react";
import { Building2, Clock, ExternalLink } from "lucide-react";
import type { Room, RoomInfo, RoomStatus } from "../../lib/rooms/types";
import { getRoomStatus } from "../../lib/rooms/status";
import { DAY_END_HOUR, DAY_START_HOUR, formatDuration, formatTime, slotEnd, slotStart, toMins } from "../../lib/rooms/time";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import { cn } from "../../components/ui/utils";
import { STATUS_STYLES, TONE_STYLES } from "./statusStyles";
import { TimelineStrip } from "./TimelineStrip";
import { AccessTag, PowerBadge, roomSummary } from "./RoomCard";
import { Badge } from "../../components/ui/badge";

interface RoomDetailPanelProps {
  room: Room | null;
  // Reference time: the current time for today, or the queried time for other days
  currentHour: number;
  currentMin: number;
  dayLabel: string; // "today" or a weekday name
  nowMins?: number; // set when looking at today
  onClose: () => void;
}

const DAY_START = DAY_START_HOUR;
const DAY_END = DAY_END_HOUR;

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

export function RoomDetailPanel(props: RoomDetailPanelProps) {
  // Keep showing the last room while the sheet animates closed
  const lastRoom = useRef<Room | null>(null);
  if (props.room) lastRoom.current = props.room;
  const room = props.room ?? lastRoom.current;

  return (
    <Sheet open={!!props.room} onOpenChange={(open) => !open && props.onClose()}>
      <SheetContent className="w-full sm:max-w-md gap-0 p-0">
        {room && <RoomDetails {...props} room={room} />}
      </SheetContent>
    </Sheet>
  );
}

function RoomDetails({
  room,
  currentHour,
  currentMin,
  dayLabel,
  nowMins: realNowMins,
}: RoomDetailPanelProps & { room: Room }) {
  const isToday = realNowMins !== undefined;
  const nowMins = toMins(currentHour, currentMin);
  const { status, label: statusLabel } = getRoomStatus(room, currentHour, currentMin);
  const { tone, label: statusTitle } = STATUS_STYLES[status];
  const toneStyle = TONE_STYLES[tone];
  const summary = getSummaryLine(room, status, statusLabel, currentHour, currentMin, dayLabel);
  const blocks = buildScheduleBlocks(room, currentHour, currentMin);

  const totalClasses = room.schedule.length;
  const remainingClasses = room.schedule.filter((s) => slotEnd(s) > nowMins).length;

  return (
    <>
      <SheetHeader className="border-b p-6 pb-4">
        <SheetTitle className="text-xl">
          {room.buildingCode} {room.roomNumber}
        </SheetTitle>
        <SheetDescription className="flex items-center gap-1.5">
          <Building2 className="size-3.5 shrink-0" />
          {[room.building, roomSummary(room)].filter(Boolean).join(" · ")}
        </SheetDescription>
        {(room.info?.power || (room.info && room.info.access !== "general")) && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            <AccessTag room={room} />
            {room.info?.power && <PowerBadge />}
          </div>
        )}

        <div className={cn("mt-3 px-4 py-3 rounded-xl border", toneStyle.soft)}>
          <div className="flex items-center gap-2.5">
            <span className={cn("size-2 rounded-full", toneStyle.dot)} />
            <span className={cn("text-sm font-medium", toneStyle.text)}>{statusTitle}</span>
          </div>
          <p className={cn("text-sm opacity-80 mt-1 ml-[18px]", toneStyle.text)}>{statusLabel}</p>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto">
        {room.info?.photo && (
          <img
            src={room.info.photo}
            alt={`${room.buildingCode} ${room.roomNumber}`}
            loading="lazy"
            // The photo is on the Libraries' site; hide it rather than show a broken image
            onError={(e) => {
              e.currentTarget.hidden = true;
            }}
            className="w-full aspect-[5/3] object-cover bg-muted"
          />
        )}

        <div className="px-6 pt-5 pb-4">
          {!room.hasClassesThisTerm && (
            <p className="text-sm text-muted-foreground mb-2">
              No classes are scheduled here this term.
              {room.info?.access !== "general" && " It may still be booked by its department."}
            </p>
          )}
          <p className="text-sm text-foreground leading-relaxed">{summary}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
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
          <TimelineStrip schedule={room.schedule} refMins={nowMins} nowMins={realNowMins} />
        </div>

        {room.info && <RoomFacts info={room.info} />}

        <div className="mx-6 my-4 border-t" />

        <div className="px-6 pb-8">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-4">
            Full day schedule
          </h3>

          <ol>
            {blocks.map((block, i) => (
              <ScheduleRow
                key={i}
                block={block}
                nowMins={nowMins}
                isToday={isToday}
                isLast={i === blocks.length - 1}
              />
            ))}

            <li className="flex items-stretch">
              <div className="w-[88px] shrink-0 pr-3 py-2.5 text-right">
                <span className="text-xs text-muted-foreground/60">{formatTime(DAY_END, 0)}</span>
              </div>
              <div className="w-5 shrink-0 flex flex-col items-center">
                <div className="size-1.5 rounded-full mt-3.5 bg-border" />
              </div>
              <div className="flex-1 pl-3 py-2.5">
                <span className="text-xs text-muted-foreground/60">End of scheduled hours</span>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </>
  );
}

// Details from the Libraries' classroom directory that matter for studying or meeting in a room
function RoomFacts({ info }: { info: RoomInfo }) {
  const facts: [string, string][] = [
    ["Seating", info.seating.join(", ")],
    ["Power at seats", info.power ? "Yes" : ""],
    ["Boards", info.boards.join(", ")],
    ["Laptop to screen", info.screenShare.join(", ")],
    ["Accessibility", info.accessibility.join(", ")],
  ].filter((f): f is [string, string] => Boolean(f[1]));

  return (
    <>
      <div className="mx-6 my-4 border-t" />
      <div className="px-6">
        <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-3">About this room</h3>
        {facts.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {facts.map(([label, value]) => (
              <Fragment key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-foreground">{value}</dd>
              </Fragment>
            ))}
          </dl>
        )}
        {info.url && (
          <a
            href={info.url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline underline-offset-2"
          >
            Full details in the McMaster Libraries classroom directory
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
    </>
  );
}

function ScheduleRow({
  block,
  nowMins,
  isToday,
  isLast,
}: {
  block: ScheduleBlock;
  nowMins: number;
  isToday: boolean;
  isLast: boolean;
}) {
  const duration = formatDuration(blockDurationMins(block));
  const timeRange = `${formatTime(block.startHour, block.startMin)} - ${formatTime(block.endHour, block.endMin)}`;
  const isPast = slotEnd(block) <= nowMins;
  const isCurrent = nowMins >= slotStart(block) && nowMins < slotEnd(block);
  const free = TONE_STYLES.free;
  const busy = TONE_STYLES.busy;
  const soon = TONE_STYLES.soon;

  let dot: string;
  let card: string;
  let title: string;
  if (block.type === "free") {
    dot = isPast ? "bg-muted-foreground/30" : cn(free.dot, isCurrent && "ring-4 ring-emerald-500/20");
    card = isPast ? "bg-muted/30 border-transparent" : cn(free.soft, !isCurrent && "border-transparent");
    title = cn("text-sm font-medium", isPast ? "text-muted-foreground/60" : free.text);
  } else if (block.type === "past-class") {
    dot = "bg-muted-foreground/30";
    card = "bg-muted/20 border-border/30";
    title = "text-sm font-medium text-muted-foreground/60 line-through";
  } else if (block.isCurrent) {
    dot = cn(busy.dot, "ring-4 ring-red-500/20");
    card = busy.soft;
    title = cn("text-sm font-medium", busy.text);
  } else if (block.isNext) {
    dot = cn(soon.dot, "ring-4 ring-amber-500/15");
    card = soon.soft;
    title = cn("text-sm font-medium", soon.text);
  } else {
    dot = "bg-red-300 dark:bg-red-500/60";
    card = "bg-card border-border";
    title = "text-sm font-medium text-foreground";
  }
  const muted = block.type !== "class" && isPast;

  return (
    <li className="flex items-stretch">
      <div className="w-[88px] shrink-0 pr-3 py-2.5 text-right">
        <span className={cn("text-xs", muted ? "text-muted-foreground/60" : "text-muted-foreground")}>
          {formatTime(block.startHour, block.startMin)}
        </span>
      </div>

      <div className="w-5 shrink-0 flex flex-col items-center">
        <div className={cn("size-2 rounded-full mt-3.5 z-10", dot)} />
        {!isLast && <div className={cn("flex-1 w-px", muted ? "bg-border/40" : "bg-border")} />}
      </div>

      <div className="flex-1 pl-3 py-2">
        <div className={cn("rounded-lg px-3.5 py-2.5 border", card)}>
          <div className="flex items-center justify-between gap-2">
            <span className={title}>
              {block.type === "free" ? (isCurrent && isToday ? "Free now" : "Free") : block.label}
            </span>
            <span className={cn("text-xs shrink-0", muted ? "text-muted-foreground/50" : "text-muted-foreground")}>
              {duration}
            </span>
          </div>
          {(block.type !== "free" || isCurrent) && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn("text-xs", muted ? "text-muted-foreground/50" : "text-muted-foreground")}>
                {timeRange}
              </span>
              {block.isCurrent && (
                <Badge variant="outline" className={cn("px-1.5 py-0", busy.soft, busy.text)}>
                  {isToday ? "NOW" : "AT THIS TIME"}
                </Badge>
              )}
              {block.isNext && (
                <Badge variant="outline" className={cn("px-1.5 py-0", soon.soft, soon.text)}>NEXT</Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
