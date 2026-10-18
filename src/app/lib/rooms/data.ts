import roomsUrl from "../../../data/rooms.json?url";
import { campusNow } from "./clock";
import { calendarNoteFor } from "./calendar";
import type { Day, RawMeeting, RawRoom, RawRoomsFile, Room } from "./types";
import { fromMins, slotStart } from "./time";

export async function loadRoomsFile(): Promise<RawRoomsFile> {
  // ?url makes the built file name include a content hash, so it can be cached for good
  const response = await fetch(roomsUrl);

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
  saturday: 6,
};

// Resolves a Day choice to a concrete date: today, or the next occurrence of that weekday
// (today counts if it matches).
export function dayToDate(day: Day, now: Date = campusNow()): Date {
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

// rooms.json uses 1=Sun, 2=Mon, ..., 7=Sat
function dateToExportDay(date: Date): number {
  return date.getDay() + 1;
}

// Missing dates mean the meeting runs all term (rooms.json leaves out dates equal to the
// term's), so fall back to the term bounds, not "forever"
function meetingRunsOn(meeting: RawMeeting, isoDate: string, term: TermBounds): boolean {
  return isoDate >= (meeting.startDate ?? term.termStart) && isoDate <= (meeting.endDate ?? term.termEnd);
}

type TermBounds = Pick<RawRoomsFile, "termStart" | "termEnd">;

export function mapRawRoomToRoom(rawRoom: RawRoom, buildingName: string, date: Date, term: TermBounds): Room {
  const dayNumber = dateToExportDay(date);
  const isoDate = toIsoDate(date);
  // Holidays and recess: the timetable still lists classes, but none run
  const noClasses = calendarNoteFor(isoDate)?.kind === "no-classes";

  return {
    id: rawRoom.id,
    building: buildingName,
    buildingCode: rawRoom.buildingCode,
    roomNumber: rawRoom.roomNumber,
    info: rawRoom.info,
    hasClassesThisTerm: rawRoom.meetings.length > 0,
    schedule: rawRoom.meetings
      .filter((meeting) => !noClasses && meeting.day === dayNumber && meetingRunsOn(meeting, isoDate, term))
      .map((meeting) => {
        const start = fromMins(meeting.start);
        const end = fromMins(meeting.end);
        return {
          startHour: start.hour,
          startMin: start.min,
          endHour: end.hour,
          endMin: end.min,
          label: meeting.label,
        };
      })
      .sort((a, b) => slotStart(a) - slotStart(b)),
  };
}
