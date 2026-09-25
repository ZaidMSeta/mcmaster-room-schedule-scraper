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
  // Every class booked here this term is a lab, so it's likely locked outside class times
  isLab: boolean;
  schedule: TimeSlot[];
}

export type RoomStatus = "free" | "occupied" | "soon-occupied" | "soon-free";

export type Day =
  | "today"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

export type AvailabilityMode =
  | { type: "right-now" }
  | { type: "at-time"; hour: number; min: number }
  | {
      type: "time-range";
      startHour: number;
      startMin: number;
      endHour: number;
      endMin: number;
    }
  | {
      type: "duration-from";
      hours: number;
      minutes: number;
      startHour: number;
      startMin: number;
    };

export interface QueryState {
  building: string;
  day: Day;
  availability: AvailabilityMode;
}

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
