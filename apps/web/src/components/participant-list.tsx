import { cn } from "@/lib/utils";

interface ParticipantListProps {
  participants: Array<{
    id: string;
    displayName: string;
    hasVoted: boolean;
    revealedVote: string | null;
    kind: "host" | "guest";
  }>;
  status: "idle" | "voting" | "revealed";
}

export default function ParticipantList({ participants, status }: ParticipantListProps) {
  return (
    <div className="grid gap-2">
      {participants.map((participant) => (
        <div
          key={participant.id}
          className="border-border flex items-center justify-between rounded-none border px-3 py-2"
        >
          <div>
            <p className="font-medium">{participant.displayName}</p>
            <p className="text-muted-foreground text-xs">
              {participant.kind === "host" ? "Host" : "Guest"}
            </p>
          </div>
          <div className="text-right">
            {status === "revealed" ? (
              <p className="font-mono text-sm">{participant.revealedVote ?? "No vote"}</p>
            ) : (
              <span
                className={cn(
                  "inline-flex h-2.5 w-2.5 rounded-full",
                  participant.hasVoted ? "bg-emerald-500" : "bg-zinc-500",
                )}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
