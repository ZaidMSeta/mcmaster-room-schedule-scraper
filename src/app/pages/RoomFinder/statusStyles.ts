import { CircleAlert, CircleCheck, Timer, type LucideIcon } from "lucide-react";
import type { RoomStatus } from "../../lib/rooms/types";

export const STATUS_STYLES: Record<
  RoomStatus,
  { bg: string; text: string; dot: string; border: string; icon: LucideIcon }
> = {
  free: {
    bg: "bg-[#e8f5e9]",
    text: "text-[#2e7d32]",
    dot: "bg-[#4caf50]",
    border: "border-[#c8e6c9]",
    icon: CircleCheck,
  },
  occupied: {
    bg: "bg-[#ffebee]",
    text: "text-[#c62828]",
    dot: "bg-[#ef5350]",
    border: "border-[#ffcdd2]",
    icon: CircleAlert,
  },
  "soon-free": {
    bg: "bg-[#fff8e1]",
    text: "text-[#f57f17]",
    dot: "bg-[#ffb300]",
    border: "border-[#ffecb3]",
    icon: Timer,
  },
  "soon-occupied": {
    bg: "bg-[#fff8e1]",
    text: "text-[#f57f17]",
    dot: "bg-[#ffb300]",
    border: "border-[#ffecb3]",
    icon: Timer,
  },
};
