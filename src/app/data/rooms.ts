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

// Current simulated time: 10:35 AM on a weekday
export const CURRENT_HOUR = 10;
export const CURRENT_MIN = 35;

export const BUILDINGS = [
  "All Buildings",
  "Anderson Hall",
  "Baker Science Center",
  "Crawford Library",
  "Dawson Engineering",
  "Ellis Humanities",
  "Foster Hall",
];

export const rooms: Room[] = [
  {
    id: "ah-101",
    building: "Anderson Hall",
    buildingCode: "AH",
    roomNumber: "101",
    schedule: [
      { startHour: 8, startMin: 0, endHour: 9, endMin: 15, label: "MATH 201" },
      { startHour: 11, startMin: 0, endHour: 12, endMin: 15, label: "MATH 305" },
      { startHour: 14, startMin: 0, endHour: 15, endMin: 15, label: "STAT 110" },
    ],
  },
  {
    id: "ah-203",
    building: "Anderson Hall",
    buildingCode: "AH",
    roomNumber: "203",
    schedule: [
      { startHour: 9, startMin: 30, endHour: 10, endMin: 45, label: "PHYS 101" },
      { startHour: 13, startMin: 0, endHour: 14, endMin: 15, label: "PHYS 202" },
      { startHour: 15, startMin: 30, endHour: 16, endMin: 45, label: "PHYS 301" },
    ],
  },
  {
    id: "ah-315",
    building: "Anderson Hall",
    buildingCode: "AH",
    roomNumber: "315",
    schedule: [
      { startHour: 10, startMin: 0, endHour: 11, endMin: 15, label: "CHEM 101" },
      { startHour: 12, startMin: 30, endHour: 13, endMin: 45, label: "CHEM 210" },
    ],
  },
  {
    id: "bsc-102",
    building: "Baker Science Center",
    buildingCode: "BSC",
    roomNumber: "102",
    schedule: [
      { startHour: 8, startMin: 30, endHour: 9, endMin: 45, label: "BIO 110" },
      { startHour: 10, startMin: 0, endHour: 11, endMin: 15, label: "BIO 210" },
      { startHour: 13, startMin: 30, endHour: 14, endMin: 45, label: "BIO 315" },
      { startHour: 16, startMin: 0, endHour: 17, endMin: 15, label: "BIO 410" },
    ],
  },
  {
    id: "bsc-210",
    building: "Baker Science Center",
    buildingCode: "BSC",
    roomNumber: "210",
    schedule: [
      { startHour: 9, startMin: 0, endHour: 10, endMin: 15, label: "CHEM 301" },
      { startHour: 14, startMin: 0, endHour: 15, endMin: 15, label: "CHEM 420" },
    ],
  },
  {
    id: "bsc-305",
    building: "Baker Science Center",
    buildingCode: "BSC",
    roomNumber: "305",
    schedule: [],
  },
  {
    id: "cl-110",
    building: "Crawford Library",
    buildingCode: "CL",
    roomNumber: "110",
    schedule: [
      { startHour: 8, startMin: 0, endHour: 9, endMin: 15, label: "ENG 101" },
      { startHour: 11, startMin: 30, endHour: 12, endMin: 45, label: "ENG 205" },
      { startHour: 15, startMin: 0, endHour: 16, endMin: 15, label: "ENG 310" },
    ],
  },
  {
    id: "cl-204",
    building: "Crawford Library",
    buildingCode: "CL",
    roomNumber: "204",
    schedule: [
      { startHour: 10, startMin: 30, endHour: 11, endMin: 45, label: "HIST 201" },
    ],
  },
  {
    id: "de-101",
    building: "Dawson Engineering",
    buildingCode: "DE",
    roomNumber: "101",
    schedule: [
      { startHour: 8, startMin: 0, endHour: 9, endMin: 50, label: "CS 201" },
      { startHour: 10, startMin: 0, endHour: 10, endMin: 50, label: "CS 301" },
      { startHour: 11, startMin: 0, endHour: 11, endMin: 50, label: "CS 401" },
      { startHour: 13, startMin: 0, endHour: 14, endMin: 15, label: "CS 150" },
      { startHour: 15, startMin: 0, endHour: 16, endMin: 15, label: "CS 480" },
    ],
  },
  {
    id: "de-215",
    building: "Dawson Engineering",
    buildingCode: "DE",
    roomNumber: "215",
    schedule: [
      { startHour: 9, startMin: 0, endHour: 10, endMin: 15, label: "ECE 200" },
      { startHour: 12, startMin: 0, endHour: 13, endMin: 15, label: "ECE 310" },
    ],
  },
  {
    id: "de-320",
    building: "Dawson Engineering",
    buildingCode: "DE",
    roomNumber: "320",
    schedule: [
      { startHour: 14, startMin: 0, endHour: 15, endMin: 30, label: "ME 400" },
    ],
  },
  {
    id: "eh-105",
    building: "Ellis Humanities",
    buildingCode: "EH",
    roomNumber: "105",
    schedule: [
      { startHour: 9, startMin: 0, endHour: 10, endMin: 15, label: "PHIL 101" },
      { startHour: 11, startMin: 0, endHour: 12, endMin: 15, label: "PHIL 301" },
      { startHour: 14, startMin: 30, endHour: 15, endMin: 45, label: "PHIL 210" },
    ],
  },
  {
    id: "eh-220",
    building: "Ellis Humanities",
    buildingCode: "EH",
    roomNumber: "220",
    schedule: [
      { startHour: 8, startMin: 0, endHour: 9, endMin: 15, label: "SOC 101" },
      { startHour: 10, startMin: 0, endHour: 11, endMin: 15, label: "SOC 220" },
      { startHour: 13, startMin: 0, endHour: 14, endMin: 15, label: "SOC 305" },
    ],
  },
  {
    id: "fh-101",
    building: "Foster Hall",
    buildingCode: "FH",
    roomNumber: "101",
    schedule: [
      { startHour: 8, startMin: 30, endHour: 9, endMin: 45, label: "PSY 101" },
      { startHour: 11, startMin: 30, endHour: 12, endMin: 45, label: "PSY 250" },
    ],
  },
  {
    id: "fh-208",
    building: "Foster Hall",
    buildingCode: "FH",
    roomNumber: "208",
    schedule: [
      { startHour: 10, startMin: 0, endHour: 11, endMin: 15, label: "ECON 201" },
      { startHour: 13, startMin: 0, endHour: 14, endMin: 15, label: "ECON 310" },
      { startHour: 15, startMin: 30, endHour: 16, endMin: 45, label: "ECON 405" },
    ],
  },
];

export type RoomStatus = "free" | "occupied" | "soon-occupied" | "soon-free";

export function getRoomStatus(
  room: Room,
  hour: number = CURRENT_HOUR,
  min: number = CURRENT_MIN
): { status: RoomStatus; label: string } {
  const nowMins = hour * 60 + min;

  // Check if currently in a class
  for (const slot of room.schedule) {
    const slotStart = slot.startHour * 60 + slot.startMin;
    const slotEnd = slot.endHour * 60 + slot.endMin;

    if (nowMins >= slotStart && nowMins < slotEnd) {
      const minsLeft = slotEnd - nowMins;
      if (minsLeft <= 15) {
        return { status: "soon-free", label: `Free in ${minsLeft} min` };
      }
      const endFormatted = formatTime(slot.endHour, slot.endMin);
      return { status: "occupied", label: `Busy until ${endFormatted}` };
    }
  }

  // Room is currently free, check when next class starts
  const upcoming = room.schedule
    .filter((s) => s.startHour * 60 + s.startMin > nowMins)
    .sort((a, b) => a.startHour * 60 + a.startMin - (b.startHour * 60 + b.startMin));

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

export function formatTime(hour: number, min: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h}:${min.toString().padStart(2, "0")} ${period}`;
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
