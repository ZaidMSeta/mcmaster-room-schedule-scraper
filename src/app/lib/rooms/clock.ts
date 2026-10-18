// Class times are Toronto wall-clock times, so "now" must be too, whatever timezone the
// visitor's device is set to (a laptop on UTC, someone checking from Vancouver).
const CAMPUS_TIME_ZONE = "America/Toronto";

const campusParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAMPUS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

// The current time on campus, as a Date whose local fields (getHours, getDate, getDay)
// read as Toronto time. Only use it for those fields, not as an absolute instant.
export function campusNow(): Date {
  const p = Object.fromEntries(campusParts.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return new Date(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
}
