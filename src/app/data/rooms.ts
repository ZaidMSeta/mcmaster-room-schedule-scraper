export interface TimeSlot {
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  label: string;
}

export interface Room {
  id: string;
  building: string;
  buildingCode: string;
  roomNumber: string;
  schedule: TimeSlot[];
}

export type RoomStatus = "free" | "occupied" | "soon-occupied" | "soon-free";

export function formatTime(hour: number, min: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h}:${min.toString().padStart(2, "0")} ${period}`;
}

export function getRoomStatus(
  room: Room,
  hour: number,
  min: number,
): { status: RoomStatus; label: string } {
  const nowMins = hour * 60 + min;

  for (const slot of room.schedule) {
    const slotStart = slot.startHour * 60 + slot.startMin;
    const slotEnd = slot.endHour * 60 + slot.endMin;

    if (nowMins >= slotStart && nowMins < slotEnd) {
      const minsLeft = slotEnd - nowMins;

      if (minsLeft <= 15) {
        return { status: "soon-free", label: `Free in ${minsLeft} min` };
      }

      return {
        status: "occupied",
        label: `Busy until ${formatTime(slot.endHour, slot.endMin)}`,
      };
    }
  }

  const upcoming = room.schedule
    .filter((s) => s.startHour * 60 + s.startMin > nowMins)
    .sort(
      (a, b) =>
        a.startHour * 60 + a.startMin - (b.startHour * 60 + b.startMin),
    );

  if (upcoming.length === 0) {
    return { status: "free", label: "Free rest of day" };
  }

  const nextStart = upcoming[0].startHour * 60 + upcoming[0].startMin;
  const minsUntil = nextStart - nowMins;

  if (minsUntil <= 20) {
    return { status: "soon-occupied", label: `Class in ${minsUntil} min` };
  }

  const hoursUntil = Math.floor(minsUntil / 60);
  const remainMins = minsUntil % 60;

  if (hoursUntil > 0) {
    return {
      status: "free",
      label: `Free for ${hoursUntil}h ${remainMins > 0 ? `${remainMins}m` : ""}`,
    };
  }

  return { status: "free", label: `Free for ${remainMins} min` };
}

export function isRoomFreeAt(room: Room, hour: number, min: number): boolean {
  const timeMins = hour * 60 + min;

  for (const slot of room.schedule) {
    const slotStart = slot.startHour * 60 + slot.startMin;
    const slotEnd = slot.endHour * 60 + slot.endMin;

    if (timeMins >= slotStart && timeMins < slotEnd) {
      return false;
    }
  }

  return true;
}