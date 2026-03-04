import { UserRoundX } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  canManage?: boolean;
  isBusy?: boolean;
  onKick?: (participantId: string) => void;
}

const SUITS = ["\u2660", "\u2665", "\u2663", "\u2666"];

export default function ParticipantList({
  participants,
  status,
  canManage = false,
  isBusy = false,
  onKick,
}: ParticipantListProps) {
  if (participants.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <span className="text-2xl opacity-20">{"\u2660"}</span>
        <p className="ornate-label text-muted-foreground/60">No players at the table</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {participants.map((participant, index) => {
        const suit = SUITS[index % SUITS.length];
        const isRedSuit = suit === "\u2665" || suit === "\u2666";

        return (
          <div
            key={participant.id}
            className={cn(
              "group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-all duration-300",
              status === "voting" && participant.hasVoted && "border-primary/15 bg-primary/[0.04]",
              status === "revealed" && "border-white/[0.08]",
            )}
            style={{
              animation: `stagger-rise 0.5s cubic-bezier(0.16, 0.84, 0.24, 1) ${index * 60}ms both`,
            }}
          >
            {/* Suit avatar */}
            <div className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm transition-colors",
              participant.kind === "host"
                ? "bg-primary/15 text-primary border border-primary/20"
                : "bg-white/[0.05] text-muted-foreground border border-white/[0.08]",
            )}>
              {participant.kind === "host" ? "\u2660" : suit}
            </div>

            {/* Name + role */}
            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {participant.displayName}
                </p>
                <p className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
                  {participant.kind === "host" ? "Dealer" : "Player"}
                </p>
              </div>

              {canManage && participant.kind === "guest" && onKick ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={isBusy}
                  aria-label={`Kick ${participant.displayName}`}
                  className={cn(
                    "mt-0.5 h-7 shrink-0 rounded-full border border-destructive/18 bg-destructive/[0.06] px-2.5 text-destructive",
                    "tracking-[0.16em] hover:border-destructive/28 hover:bg-destructive/[0.12] hover:text-destructive",
                    "focus-visible:border-destructive/30 focus-visible:ring-destructive/20",
                  )}
                  onClick={() => {
                    onKick(participant.id);
                  }}
                >
                  <UserRoundX className="size-3.5" />
                  <span className="hidden sm:inline">Kick</span>
                </Button>
              ) : null}
            </div>

            {/* Vote indicator */}
            <div className="flex shrink-0 items-center">
              {status === "revealed" ? (
                <div
                  className="card-face flex h-10 w-8 items-center justify-center rounded-lg"
                  style={{
                    animation: `deal-card 0.4s cubic-bezier(0.16, 0.84, 0.24, 1) ${200 + index * 80}ms both`,
                  }}
                >
                  <span className={cn(
                    "font-serif text-lg font-bold",
                    isRedSuit ? "text-red-700" : "text-neutral-800",
                  )}>
                    {participant.revealedVote ?? "\u2014"}
                  </span>
                </div>
              ) : status === "voting" ? (
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-500",
                  participant.hasVoted
                    ? "chip text-[0.55rem] font-bold text-primary-foreground"
                    : "border border-white/10 bg-white/[0.03] text-muted-foreground/30",
                )}>
                  {participant.hasVoted ? "\u2713" : "\u00B7"}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground/30">{"\u2014"}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
