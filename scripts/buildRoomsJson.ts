import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";

type AttrNode = Record<string, any>;

type ParsedLocation = {
  buildingName: string;
  buildingCode: string;
  roomNumber: string;
};

type Timeblock = {
  id: string;
  day: number;
  t1: number;
  t2: number;
};

type Meeting = {
  term: string;
  course: string;
  component: string;
  section: string;
  day: number;
  startMin: number; // minutes since midnight
  endMin: number;   // minutes since midnight
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  label: string;
  teachers: string[];
};

type RoomRecord = {
  roomId: string;
  buildingCode: string;
  buildingName: string;
  roomNumber: string;
  meetings: Meeting[];
};

type RoomOutput = {
  roomId: string;
  buildingCode: string;
  buildingName: string;
  roomNumber: string;
  meetings: Meeting[];
  schedule: Record<string, Meeting[]>;
};

const XML_ROOT = path.resolve(process.cwd(), "out", "xml");
const termArg = process.argv[2];
const OUTPUT_FILE = path.resolve(process.cwd(), "public", "rooms.json");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: true,
  trimValues: true,
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function safeString(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function parseTeachers(value: unknown): string[] {
  return safeString(value)
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);
}

function collectXmlFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`Input directory does not exist: ${dir}`);
  }

  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".xml"))
    .map((name) => path.join(dir, name));
}

function resolveInputDir(): string {
  if (termArg) {
    return path.resolve(XML_ROOT, termArg);
  }

  if (!fs.existsSync(XML_ROOT)) {
    throw new Error(`XML root does not exist: ${XML_ROOT}`);
  }

  const entries = fs
    .readdirSync(XML_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  if (entries.length === 1) {
    return path.resolve(XML_ROOT, entries[0].name);
  }

  throw new Error(
    `No term folder argument provided, and could not uniquely determine one from ${XML_ROOT}`
  );
}

function buildCourseLabel(courseNode: AttrNode): string {
  const code = safeString(courseNode.code);
  const number = safeString(courseNode.number);
  return [code, number].filter(Boolean).join(" ");
}

function parseSingleLocation(location: string): ParsedLocation | null {
  if (!location) return null;

  const trimmed = location.trim();
  const upper = trimmed.toUpperCase();

  if (
    !trimmed ||
    upper.includes("ONLINE") ||
    upper.includes("VIRTUAL") ||
    upper.includes("TBA")
  ) {
    return null;
  }

  // Single-location parser should never accept multi-location strings
  if (trimmed.includes(";")) {
    return null;
  }

  // Expected format: "Burke Science Bldg. - BSB_147"
  const parts = trimmed.split(" - ");
  if (parts.length < 2) return null;

  const buildingName = parts[0].trim();
  const codeAndRoom = parts.slice(1).join(" - ").trim();

  const underscoreIndex = codeAndRoom.indexOf("_");
  if (underscoreIndex === -1) return null;

  const buildingCode = codeAndRoom.slice(0, underscoreIndex).trim();
  const roomNumber = codeAndRoom.slice(underscoreIndex + 1).trim();

  if (!buildingCode || !roomNumber) return null;

  return {
    buildingName,
    buildingCode,
    roomNumber,
  };
}

function parseMultipleLocations(location: string): ParsedLocation[] {
  if (!location) return [];

  return location
    .split(";")
    .map((part) => parseSingleLocation(part.trim()))
    .filter((loc): loc is ParsedLocation => loc !== null);
}

function parseLoosMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'string') return {};

  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const result: Record<string, string> = {};

    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === "string") {
        result[key] = val;
      }
    }

    return result;
  } catch {
    return {};
  }
}

function toHourMinute(totalMinutes: number): { hour: number; minute: number } {
  return {
    hour: Math.floor(totalMinutes / 60),
    minute: totalMinutes % 60,
  };
}

function buildMeetingLabel(course: string, component: string, section: string): string {
  return `${course} ${component} ${section}`.trim();
}

function groupMeetingsByDay(meetings: Meeting[]): Record<string, Meeting[]> {
  const schedule: Record<string, Meeting[]> = {};

  for (const meeting of meetings) {
    const key = String(meeting.day);

    if (!schedule[key]) {
      schedule[key] = [];
    }

    schedule[key].push(meeting);
  }

  for (const day in schedule) {
    schedule[day].sort((a, b) => {
      if (a.startMin !== b.startMin) return a.startMin - b.startMin;
      if (a.endMin !== b.endMin) return a.endMin - b.endMin;
      if (a.course !== b.course) return a.course.localeCompare(b.course);
      if (a.component !== b.component) return a.component.localeCompare(b.component);
      return a.section.localeCompare(b.section);
    });
  }

  return schedule;
}

function printBuildSummary(
  roomsArray: RoomRecord[],
  buildings: Array<{ code: string; name: string }>
): void {
  let totalMeetings = 0;
  let multiTeacherMeetings = 0;
  let roomsWithNoMeetings = 0;
  let suspiciousRooms = 0;
  let maxMeetingsRoom: { roomId: string; count: number } | null = null;

  const weirdRoomIds: string[] = [];
  const roomsWithMostMeetings: Array<{ roomId: string; count: number }> = [];

  for (const room of roomsArray) {
    const count = room.meetings.length;
    totalMeetings += count;

    if (count === 0) {
      roomsWithNoMeetings++;
    }

    if (
      room.roomId.includes(";") ||
      room.roomNumber.includes(";") ||
      room.roomId.length > 40 ||
      room.roomNumber.length > 20
    ) {
      suspiciousRooms++;
      weirdRoomIds.push(room.roomId);
    }

    if (!maxMeetingsRoom || count > maxMeetingsRoom.count) {
      maxMeetingsRoom = { roomId: room.roomId, count };
    }

    roomsWithMostMeetings.push({ roomId: room.roomId, count });

    for (const meeting of room.meetings) {
      if (meeting.teachers.length > 1) {
        multiTeacherMeetings++;
      }
    }
  }

  roomsWithMostMeetings.sort((a, b) => b.count - a.count);

  console.log("");
  console.log("=== Build Summary ===");
  console.log(`Buildings: ${buildings.length}`);
  console.log(`Rooms: ${roomsArray.length}`);
  console.log(`Meetings: ${totalMeetings}`);
  console.log(`Rooms with no meetings: ${roomsWithNoMeetings}`);
  console.log(`Meetings with multiple teachers: ${multiTeacherMeetings}`);
  console.log(`Suspicious room records: ${suspiciousRooms}`);

  if (maxMeetingsRoom) {
    console.log(
      `Most-booked room: ${maxMeetingsRoom.roomId} (${maxMeetingsRoom.count} meetings)`
    );
  }

  console.log("");
  console.log("Top 10 busiest rooms:");
  for (const room of roomsWithMostMeetings.slice(0, 10)) {
    console.log(`- ${room.roomId}: ${room.count} meetings`);
  }

  if (weirdRoomIds.length > 0) {
    console.log("");
    console.log("Suspicious room IDs to inspect:");
    for (const roomId of weirdRoomIds.slice(0, 20)) {
      console.log(`- ${roomId}`);
    }
  }

  console.log("=====================");
  console.log("");
}

function printQaSamples(roomsArray: RoomRecord[]): void {
  console.log("=== QA Samples ===");

  const sampleGroups: Array<{
    label: string;
    predicate: (meeting: Meeting) => boolean;
  }> = [
    {
      label: "Single-meeting rooms",
      predicate: () => true,
    },
    {
      label: "Rooms with multi-teacher meetings",
      predicate: (m) => m.teachers.length > 1,
    },
    {
      label: "Rooms with labs",
      predicate: (m) => m.component === "LAB",
    },
    {
      label: "Rooms with tutorials",
      predicate: (m) => m.component === "TUT",
    },
    {
      label: "Rooms with weekend meetings",
      predicate: (m) => m.day === 1 || m.day === 7,
    },
    {
      label: "Rooms with very early meetings",
      predicate: (m) => m.startMin <= 540,
    },
    {
      label: "Rooms with late meetings",
      predicate: (m) => m.endMin >= 1260,
    },
  ];

  for (const group of sampleGroups) {
    console.log("");
    console.log(group.label + ":");

    let matches: Array<{ room: RoomRecord; meeting: Meeting }> = [];

    if (group.label === "Single-meeting rooms") {
      matches = roomsArray
        .filter((r) => r.meetings.length === 1)
        .map((r) => ({ room: r, meeting: r.meetings[0] }));
    } else {
      for (const room of roomsArray) {
        const matchingMeeting = room.meetings.find(group.predicate);
        if (matchingMeeting) {
          matches.push({ room, meeting: matchingMeeting });
        }
      }
    }

    for (const { room, meeting } of matches.slice(0, 5)) {
      console.log(
        `- ${room.roomId} | ${meeting.course} ${meeting.component} ${meeting.section} | day ${meeting.day} | ${meeting.startMin}-${meeting.endMin}`
      );
    }

    if (matches.length === 0) {
      console.log("- none");
    }
  }

  console.log("==================");
  console.log("");
}

function main() {
  const inputDir = resolveInputDir();
  const xmlFiles = collectXmlFiles(inputDir);

  const roomMap = new Map<string, RoomRecord>();
  const meetingDedup = new Set<string>();

  for (const filePath of xmlFiles) {
    const xml = fs.readFileSync(filePath, "utf8");
    const parsed = parser.parse(xml);

    const classdata = parsed?.addcourse?.classdata;
    if (!classdata) continue;

    const term = safeString(
      classdata.term?.n ?? classdata.term?.strm ?? path.basename(inputDir)
    );

    const courses = asArray<AttrNode>(classdata.course);

    for (const courseNode of courses) {
      const courseLabel = buildCourseLabel(courseNode);
      const uselections = asArray<AttrNode>(courseNode.uselection);

      for (const uselection of uselections) {
        const selection = uselection.selection as AttrNode | undefined;
        if (!selection) continue;

        const timeblocks = asArray<AttrNode>(
          uselection.timeblock as AttrNode | AttrNode[] | undefined
        );

        const timeblockMap = new Map<string, Timeblock>();

        for (const tb of timeblocks) {
          const id = safeString(tb.id);
          const day = safeNumber(tb.day);
          const t1 = safeNumber(tb.t1);
          const t2 = safeNumber(tb.t2);

          if (!id || Number.isNaN(day) || Number.isNaN(t1) || Number.isNaN(t2)) {
            continue;
          }

          timeblockMap.set(id, { id, day, t1, t2 });
        }

        const blocks = asArray<AttrNode>(
          selection.block as AttrNode | AttrNode[] | undefined
        );

        for (const block of blocks) {
          const component = safeString(block.type);
          const section = safeString(block.secNo);
          const blockKey = safeString(block.key);
          const teachers = parseTeachers(block.teacher);

          const blockLocation = safeString(block.location);
          const fallbackLocations = parseMultipleLocations(blockLocation);
          const loosMap = parseLoosMap(block.loos);

          const timeblockIds = safeString(block.timeblockids)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

          for (const timeblockId of timeblockIds) {
            const tb = timeblockMap.get(timeblockId);
            if (!tb) continue;

            let parsedLocations: ParsedLocation[] = [];

            if (loosMap[timeblockId]) {
              parsedLocations = parseMultipleLocations(loosMap[timeblockId]);
            } else {
              parsedLocations = fallbackLocations;
            }

            if (parsedLocations.length === 0) continue;

            const { hour: startHour, minute: startMinute } = toHourMinute(tb.t1);
            const { hour: endHour, minute: endMinute } = toHourMinute(tb.t2);

            for (const parsedLocation of parsedLocations) {
              const dedupeKey = [
                term,
                courseLabel,
                component,
                section,
                blockKey,
                parsedLocation.buildingCode,
                parsedLocation.roomNumber,
                tb.day,
                tb.t1,
                tb.t2,
              ].join("|");

              if (meetingDedup.has(dedupeKey)) continue;
              meetingDedup.add(dedupeKey);

              const roomId = `${parsedLocation.buildingCode} ${parsedLocation.roomNumber}`;

              if (!roomMap.has(roomId)) {
                roomMap.set(roomId, {
                  roomId,
                  buildingCode: parsedLocation.buildingCode,
                  buildingName: parsedLocation.buildingName,
                  roomNumber: parsedLocation.roomNumber,
                  meetings: [],
                });
              }

              roomMap.get(roomId)!.meetings.push({
                term,
                course: courseLabel,
                component,
                section,
                day: tb.day,
                startMin: tb.t1,
                endMin: tb.t2,
                startHour,
                startMinute,
                endHour,
                endMinute,
                label: buildMeetingLabel(courseLabel, component, section),
                teachers,
              });
            }
          }
        }
      }
    }
  }

  const roomsArray: RoomOutput[] = Array.from(roomMap.values())
    .map((room) => {
      const sortedMeetings = room.meetings.sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        if (a.startMin !== b.startMin) return a.startMin - b.startMin;
        if (a.endMin !== b.endMin) return a.endMin - b.endMin;
        if (a.course !== b.course) return a.course.localeCompare(b.course);
        if (a.component !== b.component) return a.component.localeCompare(b.component);
        return a.section.localeCompare(b.section);
      });

      return {
        roomId: room.roomId,
        buildingCode: room.buildingCode,
        buildingName: room.buildingName,
        roomNumber: room.roomNumber,
        meetings: sortedMeetings,
        schedule: groupMeetingsByDay(sortedMeetings),
      };
    })
    .sort((a, b) => a.roomId.localeCompare(b.roomId));

  const buildingMap = new Map<string, { code: string; name: string }>();

  for (const room of roomsArray) {
    if (!buildingMap.has(room.buildingCode)) {
      buildingMap.set(room.buildingCode, {
        code: room.buildingCode,
        name: room.buildingName,
      });
    }
  }

  const buildings = Array.from(buildingMap.values()).sort((a, b) =>
    a.code.localeCompare(b.code)
  );

  const output = {
    term: roomsArray[0]?.meetings[0]?.term ?? path.basename(inputDir),
    sourceFolder: path.basename(inputDir),
    generatedAt: new Date().toISOString(),
    buildings,
    rooms: roomsArray,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf8");

  console.log(`Parsed ${xmlFiles.length} XML files`);
  console.log(`Built ${roomsArray.length} rooms`);
  console.log(`Built ${buildings.length} buildings`);
  console.log(`Wrote ${OUTPUT_FILE}`);

  printBuildSummary(
    roomsArray.map((room) => ({
      roomId: room.roomId,
      buildingCode: room.buildingCode,
      buildingName: room.buildingName,
      roomNumber: room.roomNumber,
      meetings: room.meetings,
    })),
    buildings
  );

  printQaSamples(
    roomsArray.map((room) => ({
      roomId: room.roomId,
      buildingCode: room.buildingCode,
      buildingName: room.buildingName,
      roomNumber: room.roomNumber,
      meetings: room.meetings,
    }))
  );
}

main();