import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import type { DirectoryRoom } from "./scrapeClassroomDirectory";

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
  startDate: string;
  endDate: string;
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
  startDate: string; // YYYY-MM-DD, first date this meeting happens
  endDate: string;   // YYYY-MM-DD, last date this meeting happens
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
};

// What the app reads (src/app/lib/rooms/types.ts RoomsFile). Only fields the UI uses: no
// teachers, and course/component/section are already in the label.
type PublicMeeting = {
  day: number;   // 1=Sun ... 7=Sat
  start: number; // minutes since midnight
  end: number;
  startDate?: string; // left out when it's the term start
  endDate?: string;   // left out when it's the term end
  label: string;
};

// Who can use the room, from the classroom directory
type RoomAccess = "general" | "departmental" | "computer-lab" | "testing-centre";

// What the classroom directory says about a room, trimmed to what helps someone studying
// or meeting there
type RoomInfo = {
  type?: string;
  capacity?: number;
  access: RoomAccess;
  power: boolean; // power outlets at seats
  seating: string[];
  boards: string[];
  screenShare: string[]; // ways to connect a laptop to the room's display
  accessibility: string[];
  photo?: string;
  url?: string;
};

type PublicRoom = {
  id: string;
  buildingCode: string;
  roomNumber: string;
  info?: RoomInfo; // missing when the room isn't in the classroom directory
  meetings: PublicMeeting[];
};

function toPublicRoom(
  room: RoomOutput,
  termStart: string,
  termEnd: string,
  info: RoomInfo | undefined,
): PublicRoom {
  return {
    id: room.roomId,
    buildingCode: room.buildingCode,
    roomNumber: room.roomNumber,
    ...(info && { info }),
    meetings: room.meetings.map((m) => ({
      day: m.day,
      start: m.startMin,
      end: m.endMin,
      ...(m.startDate !== termStart && { startDate: m.startDate }),
      ...(m.endDate !== termEnd && { endDate: m.endDate }),
      label: m.label,
    })),
  };
}

const XML_ROOT = path.resolve(process.cwd(), "out", "xml");
// Written by npm run scrape:directory
const DIRECTORY_FILE = path.resolve(process.cwd(), "out", "classroom-directory.json");

// The directory names some Health Science Centre rooms "HHS-MUMC 2J13"; the timetable says "HSC_2J13"
const DIRECTORY_BUILDING_ALIASES: Record<string, string> = { "HHS-MUMC": "HSC" };

// Buildings that only have directory rooms (no classes this term), so the timetable doesn't name them
const DIRECTORY_ONLY_BUILDING_NAMES: Record<string, string> = {
  GH: "Gilmour Hall",
  LS: "Life Sciences Building",
  PC: "Psychology Building",
  TSH: "Togo Salmon Hall",
  UH: "University Hall",
};

function loadDirectory(): DirectoryRoom[] {
  if (!fs.existsSync(DIRECTORY_FILE)) {
    console.warn(`WARNING: ${DIRECTORY_FILE} not found; run npm run scrape:directory. Building without room details.`);
    return [];
  }
  return JSON.parse(fs.readFileSync(DIRECTORY_FILE, "utf8")).rooms;
}

// "ETB 235/236" is one combinable room in the directory but two in the timetable
function directoryRoomIds(name: string): { buildingCode: string; roomNumber: string; ids: string[] } {
  const [rawCode, ...rest] = name.trim().split(/\s+/);
  const buildingCode = DIRECTORY_BUILDING_ALIASES[rawCode] ?? rawCode;
  const roomNumber = rest.join(" ");
  return { buildingCode, roomNumber, ids: roomNumber.split("/").map((part) => `${buildingCode} ${part}`) };
}

function toRoomInfo(d: DirectoryRoom): RoomInfo {
  const access: RoomAccess =
    d.controlledBy === "UTS Computer Lab"
      ? "computer-lab"
      : d.type === "Testing Centre"
        ? "testing-centre"
        : d.controlledBy === "Departmental" || d.type?.startsWith("Departmental")
          ? "departmental"
          : "general";

  const hasDisplay = d.presentation.some((p) => /projector|television|display/i.test(p));
  const screenShare = hasDisplay
    ? [...new Set(d.presentation.map((p) => p.match(/^Bring Your Own Device - (\S+)/)?.[1]).filter(Boolean) as string[])]
    : [];

  return {
    ...(d.type && { type: d.type }),
    ...(d.capacity && { capacity: d.capacity }),
    access,
    power: d.seating.includes("Power at Seats"),
    seating: d.seating.filter((s) => s !== "Power at Seats"),
    boards: d.annotation.filter((a) => /board/i.test(a)).map((a) => a.replace("BlackBoard", "Blackboard")),
    screenShare,
    accessibility: d.accessibility,
    // Rooms without a photo point at a relative "unavailable.jpg" placeholder
    ...(d.photo?.startsWith("https://") && !d.photo.includes("unavailable") && { photo: d.photo }),
    ...(d.url && { url: d.url }),
  };
}
const termArg = process.argv[2];
// Imported by the app with ?url so the built file gets a content hash
const OUTPUT_FILE = path.resolve(process.cwd(), "src", "data", "rooms.json");

// MyTimetable encodes dates as days since 2007-12-31 (e.g. d1="6819" -> 2026-09-01).
const MT_EPOCH_MS = Date.UTC(2007, 11, 31);

function mtDayToIso(day: number): string {
  return new Date(MT_EPOCH_MS + day * 86_400_000).toISOString().slice(0, 10);
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  // Keep attributes as strings: numbers are converted explicitly, and course numbers like
  // "1E03" would otherwise be read as scientific notation (1000)
  parseAttributeValue: false,
  trimValues: true,
  // Names like "Heather O&#39;Reilly" use numeric entities, which 5.7+ no longer decodes by default
  htmlEntities: true,
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

  if (entries.length === 0) {
    throw new Error(`No term folders found in ${XML_ROOT}. Run the scraper first.`);
  }

  // Term ids increase over time (3202610 = 2026 Winter, 3202630 = 2026 Fall), so default to the newest
  const newest = entries.map((e) => e.name).sort((a, b) => Number(b) - Number(a))[0];
  if (entries.length > 1) {
    console.log(`Multiple term folders found; using newest (${newest}). Pass a folder name to override.`);
  }
  return path.resolve(XML_ROOT, newest);
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
  if (underscoreIndex === -1) {
    // A whole facility booked with no room number, e.g. "Adv Dynamics Lab - ADL"
    if (/^[A-Z0-9]+$/.test(codeAndRoom)) {
      return { buildingName, buildingCode: codeAndRoom, roomNumber: "" };
    }
    return null;
  }

  const buildingCode = codeAndRoom.slice(0, underscoreIndex).trim();
  const roomNumber = codeAndRoom.slice(underscoreIndex + 1).trim();

  if (!buildingCode || !roomNumber) return null;

  // Placeholders, not bookable rooms: "Mohawk College - MHK_CAMPUS", "McMaster - SEE_NOTES"
  if (roomNumber.toUpperCase() === "CAMPUS" || codeAndRoom.toUpperCase() === "SEE_NOTES") {
    return null;
  }

  return {
    buildingName,
    buildingCode,
    roomNumber,
  };
}

// Why a meeting couldn't be placed in a room, for the build summary
function skipReason(location: string): string {
  const upper = location.trim().toUpperCase();
  if (!upper) return "no location";
  if (upper.includes("ONLINE") || upper.includes("VIRTUAL")) return "online";
  if (upper.includes("TBA")) return "TBA";
  if (upper.endsWith("SEE_NOTES")) return "see notes";
  if (upper.endsWith("_CAMPUS")) return "off campus";
  return "unrecognized";
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
  const skipped = new Map<string, Set<string>>(); // reason -> course/section/timeblock keys
  const unrecognized = new Set<string>();
  let termName = "";

  for (const filePath of xmlFiles) {
    const xml = fs.readFileSync(filePath, "utf8");
    const parsed = parser.parse(xml);

    const classdata = parsed?.addcourse?.classdata;
    if (!classdata) continue;

    const term = safeString(
      classdata.term?.n ?? classdata.term?.strm ?? path.basename(inputDir)
    );
    if (!termName) termName = safeString(classdata.term?.v);

    const courses = asArray<AttrNode>(classdata.course);

    for (const courseNode of courses) {
      const courseLabel = buildCourseLabel(courseNode);
      const uselections = asArray<AttrNode>(courseNode.uselection);

      for (const uselection of uselections) {
        // A uselection holds several <selection>s when section combinations share the same
        // times (e.g. one lecture with any of several tutorials); each has its own blocks
        const selections = asArray<AttrNode>(uselection.selection);
        if (selections.length === 0) continue;

        const timeblocks = asArray<AttrNode>(
          uselection.timeblock as AttrNode | AttrNode[] | undefined
        );

        const timeblockMap = new Map<string, Timeblock>();

        for (const tb of timeblocks) {
          const id = safeString(tb.id);
          const day = safeNumber(tb.day);
          const t1 = safeNumber(tb.t1);
          const t2 = safeNumber(tb.t2);
          const d1 = safeNumber(tb.d1);
          const d2 = safeNumber(tb.d2);

          if (!id || [day, t1, t2, d1, d2].some(Number.isNaN)) {
            continue;
          }

          timeblockMap.set(id, { id, day, t1, t2, startDate: mtDayToIso(d1), endDate: mtDayToIso(d2) });
        }

        const blocks = selections.flatMap((selection) =>
          asArray<AttrNode>(selection.block as AttrNode | AttrNode[] | undefined)
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

            if (parsedLocations.length === 0) {
              const raw = loosMap[timeblockId] ?? blockLocation;
              const reason = skipReason(raw);
              if (reason === "unrecognized") unrecognized.add(raw);
              if (!skipped.has(reason)) skipped.set(reason, new Set());
              skipped.get(reason)!.add([courseLabel, component, section, tb.day, tb.t1, tb.t2].join("|"));
              continue;
            }

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
                tb.startDate,
                tb.endDate,
              ].join("|");

              if (meetingDedup.has(dedupeKey)) continue;
              meetingDedup.add(dedupeKey);

              const roomId = `${parsedLocation.buildingCode} ${parsedLocation.roomNumber}`.trim();

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
                startDate: tb.startDate,
                endDate: tb.endDate,
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

  if (roomsArray.length === 0) {
    throw new Error(
      `No rooms found in ${xmlFiles.length} XML files. MyTimetable hides locations from ` +
        `logged-out requests, so the auth session probably expired: re-run npm run auth:setup and scrape again.`
    );
  }

  const allMeetings = roomsArray.flatMap((room) => room.meetings);
  const termStart = allMeetings.reduce((min, m) => (m.startDate < min ? m.startDate : min), allMeetings[0].startDate);
  const termEnd = allMeetings.reduce((max, m) => (m.endDate > max ? m.endDate : max), allMeetings[0].endDate);

  // Classroom directory: attach details to timetable rooms, and add directory rooms that have
  // no classes this term
  const directory = loadDirectory();
  const infoById = new Map<string, RoomInfo>();
  const directoryOnlyRooms: RoomOutput[] = [];
  for (const d of directory) {
    const { buildingCode, roomNumber, ids } = directoryRoomIds(d.name);
    const info = toRoomInfo(d);
    for (const id of ids) infoById.set(id, info);
    if (!ids.some((id) => roomMap.has(id))) {
      const id = `${buildingCode} ${roomNumber}`;
      infoById.set(id, info);
      directoryOnlyRooms.push({ roomId: id, buildingCode, buildingName: "", roomNumber, meetings: [] });
      if (!buildingMap.has(buildingCode)) {
        const name = DIRECTORY_ONLY_BUILDING_NAMES[buildingCode];
        if (!name) console.warn(`WARNING: no name for directory building ${buildingCode}; add it to DIRECTORY_ONLY_BUILDING_NAMES`);
        buildingMap.set(buildingCode, { code: buildingCode, name: name ?? buildingCode });
      }
    }
  }
  const allRooms = [...roomsArray, ...directoryOnlyRooms].sort((a, b) => a.roomId.localeCompare(b.roomId));
  const allBuildings = Array.from(buildingMap.values()).sort((a, b) => a.code.localeCompare(b.code));

  const output = {
    termName: termName || path.basename(inputDir),
    termStart,
    termEnd,
    // When the newest XML was fetched, i.e. how fresh the timetable data is
    scrapedAt: new Date(Math.max(...xmlFiles.map((f) => fs.statSync(f).mtimeMs))).toISOString(),
    buildings: allBuildings,
    rooms: allRooms.map((room) => toPublicRoom(room, termStart, termEnd, infoById.get(room.roomId))),
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output), "utf8");

  console.log(`Parsed ${xmlFiles.length} XML files`);
  console.log(`Built ${roomsArray.length} rooms`);
  if (directory.length > 0) {
    const matched = roomsArray.filter((r) => infoById.has(r.roomId)).length;
    console.log(
      `Classroom directory: ${directory.length} rooms; details for ${matched} of ${roomsArray.length} timetable rooms; ` +
        `${directoryOnlyRooms.length} rooms added with no classes this term`,
    );
  }
  console.log(`Built ${buildings.length} buildings`);
  console.log(`Term: ${output.termName} (${termStart} to ${termEnd})`);
  console.log(`Weekly meetings placed in rooms: ${meetingDedup.size}`);
  console.log(
    `Weekly meetings with no room to place: ` +
      [...skipped].map(([reason, keys]) => `${reason} ${keys.size}`).join(", ")
  );
  if (unrecognized.size > 0) {
    console.warn(`WARNING: unrecognized location formats (add them to parseSingleLocation):`);
    for (const loc of unrecognized) console.warn(`  "${loc}"`);
  }
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