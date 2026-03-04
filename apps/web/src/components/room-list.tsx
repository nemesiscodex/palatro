import { Link } from "@tanstack/react-router";

import type { ScaleType } from "@palatro/backend/convex/pointingPoker";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RoomSummary {
  id: string;
  name: string;
  slug: string;
  scaleType: ScaleType;
  status: "idle" | "voting" | "revealed";
  hasPassword?: boolean;
}

const STATUS_MAP = {
  idle: { label: "Waiting", color: "bg-muted-foreground/30 text-muted-foreground", dot: "bg-muted-foreground/40" },
  voting: { label: "Live", color: "bg-primary/15 text-primary", dot: "bg-primary status-voting" },
  revealed: { label: "Revealed", color: "bg-accent/15 text-accent", dot: "bg-accent" },
} as const;

export default function RoomList({
  rooms,
  onDeleteRoom,
}: {
  rooms: RoomSummary[];
  onDeleteRoom: (room: RoomSummary) => void;
}) {
  if (rooms.length === 0) {
    return (
      <div className="felt-panel flex flex-col items-center gap-4 rounded-[2rem] px-6 py-10 text-center">
        {/* Decorative empty state */}
        <div className="flex gap-3 text-3xl text-primary/15">
          <span>{"\u2660"}</span>
          <span>{"\u2665"}</span>
          <span>{"\u2666"}</span>
          <span>{"\u2663"}</span>
        </div>
        <div>
          <p className="font-serif text-2xl text-foreground">No tables open</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Create your first room from the panel on the left.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {rooms.map((room, index) => {
        const statusInfo = STATUS_MAP[room.status];

        return (
          <div
            key={room.id}
            className={cn(
              "group felt-panel relative flex flex-col gap-3 rounded-[1.6rem] px-5 py-4 transition-all duration-300",
              "hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.35)]",
            )}
            style={{
              animation: `stagger-rise 0.55s cubic-bezier(0.16, 0.84, 0.24, 1) ${index * 70}ms both`,
            }}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-serif text-xl leading-tight text-foreground">
                  {room.name}
                </h3>
                <p className="mt-1 flex items-center gap-2 text-[0.62rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">
                  {room.scaleType === "fibonacci" ? "Fibonacci" : "Power of Two"}
                  {room.hasPassword ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/[0.06] px-1.5 py-0.5 text-[0.5rem] text-primary/70" title="Password protected">
                      {"\u2660"} Locked
                    </span>
                  ) : null}
                </p>
              </div>

              {/* Status badge */}
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.16em]",
                statusInfo.color,
              )}>
                <span className={cn("h-1.5 w-1.5 rounded-full", statusInfo.dot)} />
                {statusInfo.label}
              </span>
            </div>

            {/* Footer row */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] pt-3">
              <code className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1 text-[0.62rem] text-muted-foreground/60 font-mono">
                /rooms/{room.slug}
              </code>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="px-3"
                  onClick={() => {
                    onDeleteRoom(room);
                  }}
                >
                  Delete
                </Button>
                <Link
                  to="/rooms/$slug"
                  params={{ slug: room.slug }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-foreground transition-all duration-200 hover:-translate-y-px hover:border-primary/30 hover:bg-primary/[0.06] hover:text-primary"
                >
                  <span className="text-primary/50">{"\u2192"}</span>
                  Open
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
