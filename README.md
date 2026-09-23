# McMaster Classroom Finder

Scrapes McMaster's MyTimetable for every class meeting in the current term, turns that into a
room → schedule dataset, and serves a static React app that shows which classrooms are free.

> **Note:** This project is intended for personal/educational use.

## Layout

- `scraper/` – Playwright scraper (term detection, course listing, class-data fetches)
- `tests/` – Playwright entrypoints (`auth.setup.spec.ts`, `scrape.spec.ts`)
- `scripts/buildRoomsJson.ts` – converts scraped XML into `public/rooms.json`
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

# 3. Build public/rooms.json from out/xml/<termId>/ (newest term folder by default)
npm run build-rooms

# 4. Build the site
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

- `auth.storage.json` holds your session cookies. It is gitignored; never commit it.

## Safety / rate limiting

- 250 ms delay between courses
- Non-GET calls to MyTimetable's API from the page are blocked (except the course resolver), so the
  scraper can't modify your saved schedule
