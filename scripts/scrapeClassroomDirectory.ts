import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

// Downloads the Libraries' campus classroom directory (room type, capacity, seating, AV,
// accessibility, photo) into out/classroom-directory.json for build-rooms to merge in.
// Every listing page embeds each room's full details, so this is one request per page
// (~16 pages), not one per room.

const BASE = "https://library.mcmaster.ca/classroom-directory";
const OUTPUT_FILE = path.resolve(process.cwd(), "out", "classroom-directory.json");
const DELAY_MS = 2000;
const USER_AGENT = "McMaster room finder (build script; run once per term)";

// The site answers Node's fetch (and Playwright's request client) with 403 whatever the
// User-Agent, but serves curl with the same honest User-Agent, so fetch through curl.
async function get(url: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      return execFileSync("curl", ["-sS", "--fail", "-A", USER_AGENT, url], {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      });
    } catch (err) {
      // The site occasionally refuses a request; back off and retry
      if (attempt >= 4) throw err;
      console.log(`  retrying ${url} (attempt ${attempt + 1})`);
      await new Promise((r) => setTimeout(r, attempt * 5000));
    }
  }
}

export type DirectoryRoom = {
  name: string; // as listed, e.g. "ABB 102", "ETB 235/236", "HHS-MUMC 2J13"
  type: string | null; // "Classroom", "Lecture Theatre", "Departmental Room", ...
  capacity: number | null;
  seating: string[]; // e.g. "Power at Seats", "Moveable Chairs And Tables"
  controlledBy: string | null; // "Registrar", "Departmental", "UTS Computer Lab"
  presentation: string[];
  annotation: string[]; // boards, document camera, ...
  accessibility: string[];
  accessibleSeating: string | null;
  photo: string | null;
  url: string | null;
};

function text(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, "")
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// "<strong>Capacity:</strong> 204<br>"
function field(block: string, label: string): string | null {
  const m = block.match(new RegExp(`<strong>${label}:?</strong>:?\\s*([\\s\\S]*?)(?:<br|</p>|</div>)`));
  return m ? text(m[1]) || null : null;
}

// "<strong>Presentation Technology</strong><br><ul><li>...</li></ul>"
function list(block: string, label: string): string[] {
  const m = block.match(new RegExp(`<strong>${label}</strong><br>\\s*<ul>([\\s\\S]*?)</ul>`));
  if (!m) return [];
  return [...m[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((li) => text(li[1])).filter(Boolean);
}

function parsePage(html: string): DirectoryRoom[] {
  const rooms: DirectoryRoom[] = [];
  const re = /<div class="[^"]*roomdetails" id="detailsroom\d+">([\s\S]*?)(?=<div class="[^"]*roomdetails" id="detailsroom\d+">|<\/section>|$)/g;
  for (const [, block] of html.matchAll(re)) {
    const name = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
    if (!name) continue;
    const capacity = Number(field(block, "Capacity"));
    rooms.push({
      name: text(name[1]),
      type: field(block, "Room type"),
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null,
      seating: (field(block, "Seating Style") ?? "").split(/,\s*/).filter(Boolean),
      controlledBy: field(block, "Controlled by"),
      presentation: list(block, "Presentation Technology"),
      annotation: list(block, "Annotation Technology"),
      accessibility: list(block, "Accessibility Features"),
      accessibleSeating: field(block, "Accessible Seating"),
      photo: block.match(/<img src="([^"]+)"/)?.[1] ?? null,
      url: block.match(/href="(https:\/\/library\.mcmaster\.ca\/cct\/class-dir\/[^"]+)"/)?.[1] ?? null,
    });
  }
  return rooms;
}

async function main() {
  const rooms = new Map<string, DirectoryRoom>();

  for (let page = 0; ; page++) {
    const found = parsePage(await get(`${BASE}?page=${page}`));
    const fresh = found.filter((r) => !rooms.has(r.name));
    // Past the last page the site repeats the final page, so stop when nothing is new
    if (fresh.length === 0) break;
    for (const r of fresh) rooms.set(r.name, r);
    console.log(`page ${page}: ${found.length} rooms`);

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  if (rooms.size < 100) {
    throw new Error(`Only found ${rooms.size} rooms; the directory's page layout may have changed`);
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify({ scrapedAt: new Date().toISOString(), source: BASE, rooms: [...rooms.values()] }, null, 2),
  );
  console.log(`Wrote ${rooms.size} rooms to ${OUTPUT_FILE}`);
}

main();
