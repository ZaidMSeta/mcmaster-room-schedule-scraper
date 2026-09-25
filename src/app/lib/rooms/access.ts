import type { Room } from "./types";

// Departmental rooms and testing centres are booked outside the public timetable and are
// often locked, so they're tagged and can be hidden
export function mayBeLocked(room: Room): boolean {
  return room.info?.access === "departmental" || room.info?.access === "testing-centre";
}

export const ACCESS_TAGS: Partial<Record<NonNullable<Room["info"]>["access"], { label: string; title: string }>> = {
  departmental: {
    label: "Departmental – may be locked",
    title: "Controlled by a department, which may book or lock it outside the class timetable",
  },
  "testing-centre": {
    label: "Testing centre – may be locked",
    title: "Used for tests and exams, which aren't in the class timetable",
  },
  "computer-lab": {
    label: "Computer lab",
    title: "A UTS computer lab",
  },
};
