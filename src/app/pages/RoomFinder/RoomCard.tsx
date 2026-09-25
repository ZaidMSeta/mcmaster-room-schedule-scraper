import type { Room } from "../../lib/rooms/types";
import { getRoomStatus } from "../../lib/rooms/status";
import { TimelineStrip } from "./TimelineStrip";
import { FlaskConical } from "lucide-react";
import { STATUS_STYLES } from "./statusStyles";

interface RoomCardProps {
  room: Room;
  currentHour: number;
  currentMin: number;
  showNow?: boolean;
  onClick?: () => void;
}

export function LabTag() {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-medium"
      title="Only used for labs this term, so it may be locked outside class times"
    >
      <FlaskConical className="w-3 h-3" />
      Lab – may be locked
    </span>
  );
}

export function RoomCard({
  room,
  currentHour,
  currentMin,
  showNow = true,
  onClick,
}: RoomCardProps) {
  const { status, label } = getRoomStatus(room, currentHour, currentMin);
  const config = STATUS_STYLES[status];
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
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[17px] font-medium text-foreground tracking-tight">
                {room.buildingCode} {room.roomNumber}
              </span>
              {room.isLab && <LabTag />}
            </div>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {room.building}
            </p>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium ${config.bg} ${config.text} border ${config.border}`}
          >
            <Icon className="w-3 h-3" />
            {statusLabel}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2 h-2 rounded-full ${config.dot}`} />
          <span className="text-[13px] text-foreground">{label}</span>
        </div>

        <div>
          <p className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wide">
            Schedule
          </p>
          <TimelineStrip schedule={room.schedule} compact showNow={showNow} />
        </div>
      </div>
    </div>
  );
}