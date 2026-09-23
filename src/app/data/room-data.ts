import type { Room } from "./rooms";
import type { Day } from "../components/query-builder";

export interface RawMeeting {
  term: string;
  course: string;
  component: string;
  section: string;
  day: number;
  startMin: number;
  endMin: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  label: string;
  teachers: string[];
}

export interface RawRoom {
  roomId: string;
  buildingCode: string;
  buildingName: string;
  roomNumber: string;
  meetings: RawMeeting[];
}

export interface RawBuilding {
  code: string;
  name: string;
}

export interface RawRoomsFile {
  term: string;
  termName?: string;
  termStart?: string; // YYYY-MM-DD
  termEnd?: string;   // YYYY-MM-DD
  sourceFolder: string;
  generatedAt: string;
  buildings: RawBuilding[];
  rooms: RawRoom[];
}

export async function loadRoomsFile(): Promise<RawRoomsFile> {
  const response = await fetch("/rooms.json");

  if (!response.ok) {
    throw new Error("Failed to load rooms.json");
  }

  return response.json();
}

const WEEKDAY_INDEX: Record<Exclude<Day, "today">, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
};

// Resolves a Day choice to a concrete date: today, or the next occurrence of that weekday
// (today counts if it matches).
export function dayToDate(day: Day, now: Date = new Date()): Date {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (day === "today") return date;
  const diff = (WEEKDAY_INDEX[day] - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + diff);
  return date;
}

export function toIsoDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

// Export uses 1=Sun, 2=Mon, ..., 7=Sat
function dateToExportDay(date: Date): number {
  return date.getDay() + 1;
}

function meetingRunsOn(meeting: RawMeeting, isoDate: string): boolean {
  if (meeting.startDate && isoDate < meeting.startDate) return false;
  if (meeting.endDate && isoDate > meeting.endDate) return false;
  return true;
}

export function mapRawRoomToRoom(rawRoom: RawRoom, date: Date): Room {
  const dayNumber = dateToExportDay(date);
  const isoDate = toIsoDate(date);

  return {
    id: rawRoom.roomId,
    building: rawRoom.buildingName,
    buildingCode: rawRoom.buildingCode,
    roomNumber: rawRoom.roomNumber,
    schedule: rawRoom.meetings
      .filter((meeting) => meeting.day === dayNumber && meetingRunsOn(meeting, isoDate))
      .map((meeting) => ({
        startHour: meeting.startHour,
        startMin: meeting.startMinute,
        endHour: meeting.endHour,
        endMin: meeting.endMinute,
        label: meeting.label,
      }))
      .sort(
        (a, b) =>
          a.startHour * 60 + a.startMin - (b.startHour * 60 + b.startMin),
      ),
  };
}

export function getBuildingOptions(data: RawRoomsFile): string[] {
  return ["All Buildings", ...data.buildings.map((building) => building.name)];
}

