import { Fragment, useRef } from "react";
import { Building2, Clock, ExternalLink } from "lucide-react";
import type { Room, RoomInfo } from "../../lib/rooms/types";
import { busyPeriods, CHANGEOVER_MINS, getRoomStatus } from "../../lib/rooms/status";
import { DAY_END_HOUR, DAY_START_HOUR, formatDuration, formatTime, fromMins, slotEnd, slotStart, toMins } from "../../lib/rooms/time";
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

function formatMins(mins: number): string {
  const { hour, min } = fromMins(mins);
  return formatTime(hour, min);
}

function getSummaryLine(room: Room, refMins: number, dayLabel: string): string {
  if (room.schedule.length === 0) {
    return `No classes scheduled ${dayLabel}. Available all day.`;
  }

  const periods = busyPeriods(room.schedule);
  const current = periods.find((p) => refMins >= p.start && refMins < p.end);

  if (current) {
    const inClass = current.slots.find((s) => refMins >= slotStart(s) && refMins < slotEnd(s));
    const nextInPeriod = current.slots.find((s) => slotStart(s) > refMins);
    const lead = inClass
      ? `${inClass.label} is on.`
      : `Between classes; the next one starts at ${formatMins(nextInPeriod ? slotStart(nextInPeriod) : current.end)}.`;
    const busyUntil =
      current.slots.length > 1
        ? `Classes run back to back until ${formatMins(current.end)}`
        : `Busy until ${formatMins(current.end)}`;
    const after = periods.find((p) => p.start >= current.end);
    const tail = after
      ? `Then free for ${formatDuration(after.start - current.end)}.`
      : "Free after that for the rest of the day.";
    return `${lead} ${busyUntil} (${formatDuration(current.end - refMins)} from now). ${tail}`;
  }

  const next = periods.find((p) => p.start > refMins);
  if (!next) {
    return `No more classes ${dayLabel}. Free for the rest of the day.`;
  }

  const minsUntil = next.start - refMins;
  const first = next.slots[0];
  if (minsUntil <= CHANGEOVER_MINS) {
    return `${first.label} starts in ${minsUntil} min, so it's not worth settling in.`;
  }
  return `Free for ${formatDuration(minsUntil)}, until ${first.label} at ${formatMins(next.start)}.`;
}

interface ScheduleBlock {
  // "changeover": a gap between classes too short to use the room
  type: "free" | "changeover" | "class";
  start: number;
  end: number;
  label?: string;
}

// Every class in the room (including ones nested inside another), with the gaps between
// them marked free or changeover
function buildScheduleBlocks(room: Room): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = [];
  let cursor = DAY_START * 60;

  for (const period of busyPeriods(room.schedule)) {
    if (period.start > cursor) blocks.push({ type: "free", start: cursor, end: period.start });

    let covered = period.start;
    for (const slot of period.slots) {
      if (slotStart(slot) > covered) {
        blocks.push({ type: "changeover", start: covered, end: slotStart(slot) });
      }
      blocks.push({ type: "class", start: slotStart(slot), end: slotEnd(slot), label: slot.label });
      covered = Math.max(covered, slotEnd(slot));
    }
    cursor = Math.max(cursor, period.end);
  }

  if (cursor < DAY_END * 60) blocks.push({ type: "free", start: cursor, end: DAY_END * 60 });
  return blocks;
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
  const nowMins = toMins(currentHour, currentMin);
  // The searched time is the actual current time ("right now" on today), so "now" wording applies
  const isLive = realNowMins !== undefined && realNowMins === nowMins;
  const { status, label: statusLabel } = getRoomStatus(room, currentHour, currentMin);
  const { tone, label: statusTitle } = STATUS_STYLES[status];
  const toneStyle = TONE_STYLES[tone];
  const summary = getSummaryLine(room, nowMins, dayLabel);
  const blocks = buildScheduleBlocks(room);
  const nextClassIndex = blocks.some((b) => b.type === "class" && nowMins >= b.start && nowMins < b.end)
    ? -1
    : blocks.findIndex((b) => b.type === "class" && b.start > nowMins);

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
          <p className={cn("text-sm mt-1 ml-[18px]", toneStyle.text)}>{statusLabel}</p>
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
                refMins={nowMins}
                isLive={isLive}
                isNext={i === nextClassIndex}
                isLast={i === blocks.length - 1}
              />
            ))}

            <li className="flex items-stretch">
              <div className="w-[88px] shrink-0 pr-3 py-2.5 text-right">
                <span className="text-xs text-muted-foreground">{formatTime(DAY_END, 0)}</span>
              </div>
              <div className="w-5 shrink-0 flex flex-col items-center">
                <div className="size-1.5 rounded-full mt-3.5 bg-border" />
              </div>
              <div className="flex-1 pl-3 py-2.5">
                <span className="text-xs text-muted-foreground">End of scheduled hours</span>
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
            Full details in the McMaster classroom directory
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
    </>
  );
}

function ScheduleRow({
  block,
  refMins,
  isLive,
  isNext,
  isLast,
}: {
  block: ScheduleBlock;
  refMins: number; // the searched time
  isLive: boolean; // refMins is the actual current time
  isNext: boolean;
  isLast: boolean;
}) {
  const duration = formatDuration(block.end - block.start);
  const timeRange = `${formatMins(block.start)} - ${formatMins(block.end)}`;
  const isPast = block.end <= refMins;
  const isAt = refMins >= block.start && refMins < block.end;
  const free = TONE_STYLES.free;
  const busy = TONE_STYLES.busy;
  const soon = TONE_STYLES.soon;

  let dot: string;
  let card: string;
  let title: string;
  let text: string;
  if (block.type === "free") {
    dot = isPast ? "bg-muted-foreground/30" : cn(free.dot, isAt && "ring-4 ring-emerald-500/20");
    card = isPast ? "bg-muted/30 border-transparent" : cn(free.soft, !isAt && "border-transparent");
    title = cn("text-sm font-medium", isPast ? "text-muted-foreground" : free.text);
    text = isAt && isLive ? "Free now" : "Free";
  } else if (block.type === "changeover") {
    dot = "bg-muted-foreground/30";
    card = "bg-muted/40 border-transparent";
    title = "text-sm text-muted-foreground";
    text = "Changeover";
  } else if (isPast) {
    dot = "bg-muted-foreground/30";
    card = "bg-muted/20 border-border/30";
    title = "text-sm font-medium text-muted-foreground line-through";
    text = block.label ?? "";
  } else if (isAt) {
    dot = cn(busy.dot, "ring-4 ring-red-500/20");
    card = busy.soft;
    title = cn("text-sm font-medium", busy.text);
    text = block.label ?? "";
  } else if (isNext) {
    dot = cn(soon.dot, "ring-4 ring-amber-500/15");
    card = soon.soft;
    title = cn("text-sm font-medium", soon.text);
    text = block.label ?? "";
  } else {
    dot = "bg-red-300 dark:bg-red-500/60";
    card = "bg-card border-border";
    title = "text-sm font-medium text-foreground";
    text = block.label ?? "";
  }
  const muted = block.type !== "class" && isPast;
  const showRange = block.type === "class" || isAt;

  return (
    <li className="flex items-stretch">
      <div className="w-[88px] shrink-0 pr-3 py-2.5 text-right">
        <span className={cn("text-xs", muted ? "text-muted-foreground" : "text-muted-foreground")}>
          {formatMins(block.start)}
        </span>
      </div>

      <div className="w-5 shrink-0 flex flex-col items-center">
        <div className={cn("size-2 rounded-full mt-3.5 z-10", dot)} />
        {!isLast && <div className={cn("flex-1 w-px", muted ? "bg-border/40" : "bg-border")} />}
      </div>

      <div className="flex-1 pl-3 py-2">
        <div className={cn("rounded-lg px-3.5 border", block.type === "changeover" ? "py-1.5" : "py-2.5", card)}>
          <div className="flex items-center justify-between gap-2">
            <span className={title}>{text}</span>
            <span className={cn("text-xs shrink-0", muted ? "text-muted-foreground" : "text-muted-foreground")}>
              {duration}
            </span>
          </div>
          {showRange && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn("text-xs", muted ? "text-muted-foreground" : "text-muted-foreground")}>
                {timeRange}
              </span>
              {block.type === "class" && isAt && (
                <Badge variant="outline" className={cn("px-1.5 py-0", busy.soft, busy.text)}>
                  {isLive ? "NOW" : "AT THIS TIME"}
                </Badge>
              )}
              {isNext && (
                <Badge variant="outline" className={cn("px-1.5 py-0", soon.soft, soon.text)}>NEXT</Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
