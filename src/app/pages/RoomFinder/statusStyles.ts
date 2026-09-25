import { CircleAlert, CircleCheck, Timer, type LucideIcon } from "lucide-react";
import type { RoomStatus } from "../../lib/rooms/types";

type Tone = "free" | "busy" | "soon";

// Tailwind palette classes with dark variants, the same approach mactrack's pages use
export const TONE_STYLES: Record<Tone, { soft: string; text: string; dot: string }> = {
  free: {
    soft: "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  busy: {
    soft: "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
  soon: {
    soft: "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
};

export const STATUS_STYLES: Record<
  RoomStatus,
  { tone: Tone; label: string; icon: LucideIcon }
> = {
  free: { tone: "free", label: "Available", icon: CircleCheck },
  occupied: { tone: "busy", label: "Occupied", icon: CircleAlert },
  "soon-free": { tone: "soon", label: "Freeing up soon", icon: Timer },
  "soon-occupied": { tone: "soon", label: "Class starting soon", icon: Timer },
};

// Timeline bar colours
export const TIMELINE = {
  track: "bg-emerald-100 dark:bg-emerald-500/15",
  class: "bg-red-300 dark:bg-red-500/60",
  pastClass: "bg-muted-foreground/25",
  now: "bg-foreground",
};
