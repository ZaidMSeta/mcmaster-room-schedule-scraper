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
  info?: RoomInfo; // from the Libraries' classroom directory; missing for rooms not listed there
  hasClassesThisTerm: boolean;
  schedule: TimeSlot[];
}

// Who can use a room, per the classroom directory
export type RoomAccess = "general" | "departmental" | "computer-lab" | "testing-centre";

// What the classroom directory says about a room (written by scripts/buildRoomsJson.ts)
export interface RoomInfo {
  type?: string; // "Classroom", "Lecture Theatre", "Departmental Room", ...
  capacity?: number;
  access: RoomAccess;
  power: boolean; // power outlets at seats
  seating: string[];
  boards: string[];
  screenShare: string[]; // ways to connect a laptop to the room's display: "HDMI", "USB-C", ...
  accessibility: string[];
  photo?: string;
  url?: string; // the room's page in the directory
}

export type RoomStatus = "free" | "occupied" | "soon-occupied" | "soon-free";

export type Day =
  | "today"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

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
  building: string; // building code, "" for any building
  day: Day;
  availability: AvailabilityMode;
}

// rooms.json, written by scripts/buildRoomsJson.ts
export interface RawMeeting {
  day: number;   // 1=Sun ... 7=Sat
  start: number; // minutes since midnight
  end: number;
  startDate?: string; // YYYY-MM-DD; missing means the term start
  endDate?: string;   // YYYY-MM-DD; missing means the term end
  label: string;
}

export interface RawRoom {
  id: string;
  buildingCode: string;
  roomNumber: string;
  info?: RoomInfo;
  meetings: RawMeeting[];
}

export interface RawBuilding {
  code: string;
  name: string;
}

export interface RawRoomsFile {
  termName: string;
  termStart: string; // YYYY-MM-DD
  termEnd: string;   // YYYY-MM-DD
  scrapedAt: string; // ISO timestamp
  buildings: RawBuilding[];
  rooms: RawRoom[];
}
