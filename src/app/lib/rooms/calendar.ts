// Dates the class timetable doesn't know about, from the Registrar's sessional dates:
// https://registrar.mcmaster.ca/dates-and-deadlines/ (update once per term).

export interface CalendarNote {
  from: string; // YYYY-MM-DD, inclusive
  to: string;
  // "no-classes": the timetable still lists classes, but none run, so rooms show no schedule
  // "exams": exams use rooms but aren't in the timetable
  kind: "no-classes" | "exams";
  message: string;
}

export const CALENDAR_NOTES: CalendarNote[] = [
  {
    from: "2026-09-30",
    to: "2026-09-30",
    kind: "no-classes",
    message: "No classes on the National Day for Truth and Reconciliation, so every room shows as free. Some buildings may be locked.",
  },
  {
    from: "2026-10-12",
    to: "2026-10-18",
    kind: "no-classes",
    message: "No classes during the mid-term recess (Oct 12–18), so every room shows as free. Some buildings may be locked, especially on Thanksgiving Monday.",
  },
  {
    from: "2026-12-11",
    to: "2026-12-23",
    kind: "exams",
    message: "It's the exam period (Dec 11–23). Exams use many rooms but aren't in the class timetable, so a room shown as free may be in use.",
  },
];

export function calendarNoteFor(isoDate: string): CalendarNote | undefined {
  return CALENDAR_NOTES.find((note) => isoDate >= note.from && isoDate <= note.to);
}
