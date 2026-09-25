import { Lock, Plug } from "lucide-react";
import type { Room } from "../../lib/rooms/types";
import { getRoomStatus } from "../../lib/rooms/status";
import { toMins } from "../../lib/rooms/time";
import { ACCESS_TAGS } from "../../lib/rooms/access";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { cn } from "../../components/ui/utils";
import { TimelineStrip } from "./TimelineStrip";
import { STATUS_STYLES, TONE_STYLES } from "./statusStyles";

interface RoomCardProps {
  room: Room;
  currentHour: number;
  currentMin: number;
  nowMins?: number;
  onClick?: () => void;
}

export function AccessTag({ room }: { room: Room }) {
  const tag = room.info && ACCESS_TAGS[room.info.access];
  if (!tag) return null;
  return (
    <Badge variant="secondary" className="text-muted-foreground" title={tag.title}>
      <Lock />
      {tag.label}
    </Badge>
  );
}

export function PowerBadge() {
  return (
    <Badge variant="outline" className="text-muted-foreground" title="Power outlets at the seats">
      <Plug />
      Outlets at seats
    </Badge>
  );
}

// "Classroom · 70 seats"
export function roomSummary(room: Room): string | null {
  const parts = [
    room.info?.type,
    room.info?.capacity ? `${room.info.capacity} seats` : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function RoomCard({
  room,
  currentHour,
  currentMin,
  nowMins,
  onClick,
}: RoomCardProps) {
  const { status, label } = getRoomStatus(room, currentHour, currentMin);
  const { tone, label: statusLabel, icon: Icon } = STATUS_STYLES[status];
  const toneStyle = TONE_STYLES[tone];

  return (
    <Card
      className="gap-0 p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${room.buildingCode} ${room.roomNumber}, ${statusLabel}, ${label}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-foreground leading-tight">
              {room.buildingCode} {room.roomNumber}
            </h4>
            <AccessTag room={room} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {[room.building, roomSummary(room)].filter(Boolean).join(" · ")}
          </p>
        </div>

        <Badge variant="outline" className={cn("rounded-full shrink-0", toneStyle.soft, toneStyle.text)}>
          <Icon />
          {statusLabel}
        </Badge>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={cn("size-2 rounded-full", toneStyle.dot)} />
        <span className="text-sm text-foreground">{label}</span>
        {room.info?.power && <PowerBadge />}
      </div>

      <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Schedule</p>
      <TimelineStrip
        schedule={room.schedule}
        refMins={toMins(currentHour, currentMin)}
        nowMins={nowMins}
        compact
      />
    </Card>
  );
}
