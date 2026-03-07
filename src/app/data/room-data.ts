import type { Room } from "./rooms";

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

export function dayToExportNumber(day: Day): number {
    if (day === "today") {
      const jsDay = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  
      if (jsDay === 0) return 1; // Sunday
      return jsDay + 1; // Mon->2, Tue->3, ..., Sat->7
    }
  
    const map: Record<Exclude<Day, "today">, number> = {
      monday: 2,
      tuesday: 3,
      wednesday: 4,
      thursday: 5,
      friday: 6,
    };
  
    return map[day];
  }

export function mapRawRoomToRoom(rawRoom: RawRoom, dayNumber: number): Room {
  return {
    id: rawRoom.roomId,
    building: rawRoom.buildingName,
    buildingCode: rawRoom.buildingCode,
    roomNumber: rawRoom.roomNumber,
    schedule: rawRoom.meetings
      .filter((meeting) => meeting.day === dayNumber)
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

