import type { TimeSlot } from "./types";

// Hours shown on the timeline and in the day schedule
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 23; // latest class ends at 10:20 PM

// Latest time a range can end
export const LATEST_MINS = 23 * 60 + 30;

export function toMins(hour: number, min: number): number {
  return hour * 60 + min;
}

type Span = Pick<TimeSlot, "startHour" | "startMin" | "endHour" | "endMin">;

export function slotStart(slot: Span): number {
  return toMins(slot.startHour, slot.startMin);
}

export function slotEnd(slot: Span): number {
  return toMins(slot.endHour, slot.endMin);
}

export function formatTime(hour: number, min: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h}:${min.toString().padStart(2, "0")} ${period}`;
}

export function fromMins(mins: number): { hour: number; min: number } {
  return { hour: Math.floor(mins / 60), min: mins % 60 };
}

// Next quarter hour at or after the given time, e.g. 4:07 PM -> 4:15 PM
export function roundUpToQuarter(date: Date): number {
  return Math.min(LATEST_MINS, Math.ceil(toMins(date.getHours(), date.getMinutes()) / 15) * 15);
}

// 45 -> "45m", 60 -> "1h", 90 -> "1h 30m"
export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
