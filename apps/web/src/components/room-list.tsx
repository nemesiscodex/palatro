import { Link } from "@tanstack/react-router";

import type { ScaleType } from "@palatro/backend/convex/pointingPoker";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RoomSummary {
  id: string;
  name: string;
  slug: string;
  scaleType: ScaleType;
  status: "idle" | "voting" | "revealed";
}

export default function RoomList({ rooms }: { rooms: RoomSummary[] }) {
  if (rooms.length === 0) {
    return <p className="text-muted-foreground text-sm">No rooms yet. Create one to get started.</p>;
  }

  return (
    <div className="grid gap-3">
      {rooms.map((room) => (
        <Card key={room.id} size="sm">
          <CardHeader>
            <CardTitle>{room.name}</CardTitle>
            <CardDescription>
              {room.scaleType === "fibonacci" ? "Fibonacci" : "Power of Two"} · {room.status}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <code className="text-muted-foreground text-xs">/rooms/{room.slug}</code>
            <Link
              to="/rooms/$slug"
              params={{ slug: room.slug }}
              className="border-border hover:bg-muted inline-flex h-8 items-center rounded-none border px-3 text-xs font-medium"
            >
              Open room
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
