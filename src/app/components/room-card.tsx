import { Room, getRoomStatus, RoomStatus } from "../data/rooms";
import { TimelineStrip } from "./timeline-strip";
import { Clock, CircleCheck, CircleAlert, Timer } from "lucide-react";

interface RoomCardProps {
  room: Room;
  onClick?: () => void;
}

const statusConfig: Record<
  RoomStatus,
  { bg: string; text: string; dot: string; border: string; icon: typeof Clock }
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

export function RoomCard({ room, onClick }: RoomCardProps) {
  const { status, label } = getRoomStatus(room);
  const config = statusConfig[status];
  const Icon = config.icon;

  const statusLabel =
    status === "free"
      ? "Available"
      : status === "occupied"
        ? "Occupied"
        : status === "soon-free"
          ? "Freeing up"
          : "Filling soon";

  return (
    <div
      className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-primary/20"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[17px] font-medium text-foreground tracking-tight">
                {room.buildingCode} {room.roomNumber}
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground mt-0.5">{room.building}</p>
          </div>

          {/* Status badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium ${config.bg} ${config.text} border ${config.border}`}
          >
            <Icon className="w-3 h-3" />
            {statusLabel}
          </div>
        </div>

        {/* Status detail */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2 h-2 rounded-full ${config.dot}`} />
          <span className="text-[13px] text-foreground">{label}</span>
        </div>

        {/* Timeline */}
        <div>
          <p className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wide">
            Today's schedule
          </p>
          <TimelineStrip schedule={room.schedule} compact />
        </div>
      </div>
    </div>
  );
}