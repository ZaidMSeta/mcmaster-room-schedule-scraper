// scripts/buildRoomsJson.ts
import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";

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
  startMin: number;
  endMin: number;
  teacher: string;
};

type RoomRecord = {
  roomId: string;
  buildingCode: string;
  buildingName: string;
  roomNumber: string;
  meetings: Meeting[];
};

type AttrNode = Record<string, any>;

const XML_ROOT = path.resolve(process.cwd(), "out", "xml");
const termArg = process.argv[2];

function resolveInputDir(): string {
  if (termArg) {
    return path.resolve(XML_ROOT, termArg);
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

const INPUT_DIR = resolveInputDir();
const OUTPUT_FILE = path.resolve(process.cwd(), "web", "public", "rooms.json");

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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseLocation(location: string): {
  buildingName: string;
  buildingCode: string;
  roomNumber: string;
} | null {
  if (!location) return null;

  const trimmed = location.trim();

  // Skip junk / non-physical locations
  const upper = trimmed.toUpperCase();
  if (
    upper.includes("ONLINE") ||
    upper.includes("VIRTUAL") ||
    upper.includes("TBA") ||
    upper === ""
  ) {
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

function collectXmlFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`Input directory does not exist: ${dir}`);
  }

  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".xml"))
    .map((name) => path.join(dir, name));
}

function buildCourseLabel(courseNode: AttrNode): string {
  const code = String(courseNode.code ?? "").trim();
  const number = String(courseNode.number ?? "").trim();
  return [code, number].filter(Boolean).join(" ");
}

function safeString(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function main() {
  const xmlFiles = collectXmlFiles(INPUT_DIR);

  const roomMap = new Map<string, RoomRecord>();
  const meetingDedup = new Set<string>();

  for (const filePath of xmlFiles) {
    const xml = fs.readFileSync(filePath, "utf8");
    const parsed = parser.parse(xml);

    const classdata = parsed?.addcourse?.classdata;
    if (!classdata) continue;

    const term = safeString(classdata.term?.n ?? classdata.term?.strm ?? path.basename(INPUT_DIR));
    const courses = asArray<AttrNode>(classdata.course);

    for (const courseNode of courses) {
      const courseLabel = buildCourseLabel(courseNode);
      const uselections = asArray<AttrNode>(courseNode.uselection);

      for (const uselection of uselections) {
        const selection = uselection.selection as AttrNode | undefined;
        if (!selection) continue;

        const timeblocks = asArray<AttrNode>(uselection.timeblock);
        const timeblockMap = new Map<string, Timeblock>();

        for (const tb of timeblocks) {
          const id = safeString(tb.id);
          const day = safeNumber(tb.day);
          const t1 = safeNumber(tb.t1);
          const t2 = safeNumber(tb.t2);

          if (!id || Number.isNaN(day) || Number.isNaN(t1) || Number.isNaN(t2)) {
            continue;
          }

          timeblockMap.set(id, {
            id,
            day,
            t1,
            t2,
          });
        }

        const blocks = asArray<AttrNode>(selection.block);

        for (const block of blocks) {
          const location = safeString(block.location);
          const parsedLocation = parseLocation(location);
          if (!parsedLocation) continue;

          const component = safeString(block.type);
          const section = safeString(block.secNo);
          const teacher = safeString(block.teacher);
          const blockKey = safeString(block.key);
          const timeblockIds = safeString(block.timeblockids)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

          for (const timeblockId of timeblockIds) {
            const tb = timeblockMap.get(timeblockId);
            if (!tb) continue;

            const dedupKey = [
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

            if (meetingDedup.has(dedupKey)) continue;
            meetingDedup.add(dedupKey);

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
              teacher,
            });
          }
        }
      }
    }
  }

  const rooms = Array.from(roomMap.values())
    .map((room) => ({
      ...room,
      meetings: room.meetings.sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        if (a.startMin !== b.startMin) return a.startMin - b.startMin;
        if (a.endMin !== b.endMin) return a.endMin - b.endMin;
        return a.course.localeCompare(b.course);
      }),
    }))
    .sort((a, b) => a.roomId.localeCompare(b.roomId));

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(rooms, null, 2), "utf8");

  console.log(`Built ${rooms.length} rooms from ${xmlFiles.length} XML files.`);
  console.log(`Wrote ${OUTPUT_FILE}`);
}

main();