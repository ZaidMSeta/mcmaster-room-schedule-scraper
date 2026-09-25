import type { AvailabilityMode, Day, QueryState } from "./types";
import { fromMins, LATEST_MINS, roundUpToQuarter, toMins } from "./time";

// URL params for the room finder, e.g.
//   ?building=JHE&day=wed&from=13:30&to=15:00&power=1&hideLocked=1&room=JHE+264
// Defaults (any building, today, right now, sort by availability) are left out.

export type SortBy = "status" | "building";

export interface RoomFilters {
  power: boolean; // only rooms with outlets at seats
  hideLocked: boolean; // hide departmental rooms and testing centres
}

export interface UrlState {
  query: QueryState;
  sortBy: SortBy;
  filters: RoomFilters;
  roomId: string | null;
}

const DAY_PARAMS: Record<Exclude<Day, "today">, string> = {
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
};

function parseDay(value: string | null): Day {
  const match = Object.entries(DAY_PARAMS).find(([, param]) => param === value);
  return match ? (match[0] as Day) : "today";
}

// "13:30" -> minutes since midnight, or null if it isn't a valid time
function parseTime(value: string | null): number | null {
  const m = value?.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const mins = toMins(Number(m[1]), Number(m[2]));
  return Number(m[2]) < 60 && mins <= LATEST_MINS ? mins : null;
}

function formatParamTime(hour: number, min: number): string {
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function parseAvailability(params: URLSearchParams, day: Day, now: Date): AvailabilityMode {
  const at = parseTime(params.get("at"));
  const from = parseTime(params.get("from"));
  const to = parseTime(params.get("to"));
  const forMins = Number(params.get("for"));

  if (from !== null && Number.isInteger(forMins) && forMins > 0 && forMins <= 12 * 60) {
    const start = fromMins(from);
    return {
      type: "duration-from",
      hours: Math.floor(forMins / 60),
      minutes: forMins % 60,
      startHour: start.hour,
      startMin: start.min,
    };
  }
  if (from !== null && to !== null && to > from) {
    const start = fromMins(from);
    const end = fromMins(to);
    return { type: "time-range", startHour: start.hour, startMin: start.min, endHour: end.hour, endMin: end.min };
  }
  if (at !== null) {
    const { hour, min } = fromMins(at);
    return { type: "at-time", hour, min };
  }
  if (day === "today") return { type: "right-now" };

  // "right now" only applies to today
  const { hour, min } = fromMins(roundUpToQuarter(now));
  return { type: "at-time", hour, min };
}

export function parseUrlState(params: URLSearchParams, now: Date): UrlState {
  const day = parseDay(params.get("day"));
  return {
    query: {
      building: params.get("building")?.toUpperCase() ?? "",
      day,
      availability: parseAvailability(params, day, now),
    },
    sortBy: params.get("sort") === "building" ? "building" : "status",
    filters: { power: params.get("power") === "1", hideLocked: params.get("hideLocked") === "1" },
    roomId: params.get("room"),
  };
}

export function toUrlParams({ query, sortBy, filters, roomId }: UrlState): URLSearchParams {
  const params = new URLSearchParams();
  if (query.building) params.set("building", query.building);
  if (query.day !== "today") params.set("day", DAY_PARAMS[query.day]);

  const avail = query.availability;
  if (avail.type === "at-time") {
    params.set("at", formatParamTime(avail.hour, avail.min));
  } else if (avail.type === "time-range") {
    params.set("from", formatParamTime(avail.startHour, avail.startMin));
    params.set("to", formatParamTime(avail.endHour, avail.endMin));
  } else if (avail.type === "duration-from") {
    params.set("from", formatParamTime(avail.startHour, avail.startMin));
    params.set("for", String(toMins(avail.hours, avail.minutes)));
  }

  if (filters.power) params.set("power", "1");
  if (filters.hideLocked) params.set("hideLocked", "1");
  if (sortBy !== "status") params.set("sort", sortBy);
  if (roomId) params.set("room", roomId);
  return params;
}
