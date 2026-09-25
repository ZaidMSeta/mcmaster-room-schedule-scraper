import type { Room, RoomStatus } from "./types";
import { formatDuration, formatTime, slotEnd, slotStart, toMins } from "./time";

export function getRoomStatus(
  room: Room,
  hour: number,
  min: number,
): { status: RoomStatus; label: string } {
  const nowMins = toMins(hour, min);

  const current = room.schedule.find(
    (slot) => nowMins >= slotStart(slot) && nowMins < slotEnd(slot),
  );
  if (current) {
    const minsLeft = slotEnd(current) - nowMins;
    if (minsLeft <= 15) {
      return { status: "soon-free", label: `Free in ${minsLeft} min` };
    }
    return {
      status: "occupied",
      label: `Busy until ${formatTime(current.endHour, current.endMin)}`,
    };
  }

  // schedule is sorted by start time
  const next = room.schedule.find((slot) => slotStart(slot) > nowMins);
  if (!next) {
    return { status: "free", label: "Free rest of day" };
  }

  const minsUntil = slotStart(next) - nowMins;
  if (minsUntil <= 20) {
    return { status: "soon-occupied", label: `Class in ${minsUntil} min` };
  }

  return { status: "free", label: `Free for ${formatDuration(minsUntil)}` };
}

// True if no class overlaps [startMins, endMins)
export function isRoomFreeBetween(room: Room, startMins: number, endMins: number): boolean {
  return room.schedule.every(
    (slot) => slotStart(slot) >= endMins || slotEnd(slot) <= startMins,
  );
}

export function isRoomFreeAt(room: Room, hour: number, min: number): boolean {
  const mins = toMins(hour, min);
  return isRoomFreeBetween(room, mins, mins + 1);
}
