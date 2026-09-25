# Room Radar

Scrapes McMaster's MyTimetable for every class meeting in the current term, turns that into a
room → schedule dataset, and serves a static React app that shows which classrooms are free.

> **Note:** This project is intended for personal/educational use.

## Layout

- `scraper/` – Playwright scraper (term detection, course listing, class-data fetches)
- `tests/` – Playwright entrypoints (`auth.setup.spec.ts`, `scrape.spec.ts`)
- `scripts/scrapeClassroomDirectory.ts` – downloads https://library.mcmaster.ca/classroom-directory
  (16 pages, 2 s apart) into `out/classroom-directory.json`
- `scripts/buildRoomsJson.ts` – converts scraped XML plus the directory into `src/data/rooms.json`
- `src/` – React + Vite frontend that reads `rooms.json`

## Updating for a new term

```bash
npm install
npx playwright install chromium

# 1. Log in once (opens a browser; sign in, then resume the Playwright inspector).
#    MyTimetable hides room locations from logged-out requests, so this is required.
npm run auth:setup

# 2. Scrape. Auto-detects the term in session today and lists every course offered in it.
npm run scrape

# 3. Fetch the Libraries' classroom directory (room type, capacity, seating, AV, photos)
npm run scrape:directory

# 4. Build src/data/rooms.json from out/xml/<termId>/ and out/classroom-directory.json (newest term folder by default)
npm run build-rooms

# 5. Build the site
npm run build
```

The scrape is resumable: progress is logged to `out/results_<termId>.ndjson` and already-processed
courses are skipped on rerun. If the session expires mid-run, re-run `auth:setup` and `scrape`.

### Overrides

| Env var        | Effect                                                         |
|----------------|----------------------------------------------------------------|
| `TERM_ID`      | Scrape a specific term, e.g. `3202710` (2027 Winter)           |
| `TERM_SEASON`  | Pick the current/next term of a season, e.g. `Winter`          |
| `COURSES_FILE` | Scrape only the course codes in this file (one per line)       |

`npm run build-rooms -- <termId>` builds from a specific term folder.

## Data notes

- `rooms.json` holds only what the app shows: per room, its meetings (day, start/end minutes, label)
  and, for rooms in the classroom directory, an `info` object (type, capacity, access, power at seats,
  seating, boards, laptop-to-screen options, accessibility, photo URL, directory link). Teacher names
  are left out.
- Rooms the directory marks Departmental or Testing Centre are tagged "may be locked". Directory rooms
  with no classes this term are included with an empty schedule.
- `build-rooms` prints how many weekly meetings it placed and why the rest couldn't be (online, TBA,
  see notes, off campus, no location), and warns on any location format it doesn't recognize.
- A meeting has `startDate`/`endDate` only when it doesn't run the whole term, so half-term
  sections only block a room on the dates they actually run.
- The file also includes `termName`, `termStart`, `termEnd`, and `scrapedAt` (when the newest XML
  was fetched), which the page shows as "updated <date>".
- The app imports it with `?url`, so the built file name has a content hash and can be cached.
- MyTimetable encodes dates as days since 2007-12-31.
- `auth.storage.json` holds your session cookies. It is gitignored; never commit it.

## Safety / rate limiting

- 250 ms delay between courses
- Non-GET calls to MyTimetable's API from the page are blocked (except the course resolver), so the
  scraper can't modify your saved schedule
