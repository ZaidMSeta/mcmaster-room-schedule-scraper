import type { Room, RoomStatus, TimeSlot } from "./types";
import { formatDuration, formatTime, fromMins, slotEnd, slotStart, toMins } from "./time";

// A gap this short between classes is a changeover (one class leaving, the next arriving),
// not a chance to use the room, so it counts as busy
export const CHANGEOVER_MINS = 20;

// A class ending within this many minutes shows as "freeing up soon"
const SOON_FREE_MINS = 15;
// A class starting within this many minutes makes a free room "class starting soon"
const SOON_BUSY_MINS = 20;

// A stretch of classes with no usable gap: overlapping, back-to-back, or separated only
// by changeovers
export interface BusyPeriod {
  start: number;
  end: number;
  slots: TimeSlot[];
}

export function busyPeriods(schedule: TimeSlot[]): BusyPeriod[] {
  const sorted = [...schedule].sort((a, b) => slotStart(a) - slotStart(b) || slotEnd(a) - slotEnd(b));
  const periods: BusyPeriod[] = [];
  for (const slot of sorted) {
    const last = periods[periods.length - 1];
    if (last && slotStart(slot) - last.end <= CHANGEOVER_MINS) {
      last.end = Math.max(last.end, slotEnd(slot));
      last.slots.push(slot);
    } else {
      periods.push({ start: slotStart(slot), end: slotEnd(slot), slots: [slot] });
    }
  }
  return periods;
}

function formatMins(mins: number): string {
  const { hour, min } = fromMins(mins);
  return formatTime(hour, min);
}

export function getRoomStatus(
  room: Room,
  hour: number,
  min: number,
): { status: RoomStatus; label: string } {
  const nowMins = toMins(hour, min);
  const periods = busyPeriods(room.schedule);

  const current = periods.find((p) => nowMins >= p.start && nowMins < p.end);
  if (current) {
    const minsLeft = current.end - nowMins;
    if (minsLeft <= SOON_FREE_MINS) {
      return { status: "soon-free", label: `Free in ${minsLeft} min` };
    }
    const inClass = current.slots.some((s) => nowMins >= slotStart(s) && nowMins < slotEnd(s));
    return {
      status: "occupied",
      label: `${inClass ? "Busy" : "Between classes · busy"} until ${formatMins(current.end)}`,
    };
  }

  const next = periods.find((p) => p.start > nowMins);
  if (!next) {
    return { status: "free", label: "Free rest of day" };
  }

  const minsUntil = next.start - nowMins;
  if (minsUntil <= SOON_BUSY_MINS) {
    return { status: "soon-occupied", label: `Class in ${minsUntil} min` };
  }

  return { status: "free", label: `Free for ${formatDuration(minsUntil)}` };
}

// True if [startMins, endMins) doesn't touch a class or a changeover between classes
export function isRoomFreeBetween(room: Room, startMins: number, endMins: number): boolean {
  return busyPeriods(room.schedule).every((p) => p.start >= endMins || p.end <= startMins);
}
