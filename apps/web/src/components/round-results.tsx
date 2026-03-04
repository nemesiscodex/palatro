interface RoundResultsProps {
  activeRound: {
    roundNumber: number;
    resultType: "most_voted" | "tie" | null;
    resultValue: string | null;
  } | null;
}

export default function RoundResults({ activeRound }: RoundResultsProps) {
  if (!activeRound) {
    return null;
  }

  const isTie = activeRound.resultType === "tie";
  const isMostVoted = activeRound.resultType === "most_voted";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] to-transparent px-5 py-5"
      style={{
        animation: "reveal-slide 0.6s cubic-bezier(0.16, 0.84, 0.24, 1) both",
        boxShadow:
          "inset 0 1px 0 rgba(218, 185, 100, 0.08), 0 16px 48px rgba(0, 0, 0, 0.25)",
      }}
    >
      {/* Decorative corner suits */}
      <span className="absolute top-3 right-4 font-serif text-lg text-primary/10">
        {"\u2660"}
      </span>
      <span className="absolute bottom-3 left-4 rotate-180 font-serif text-lg text-primary/10">
        {"\u2660"}
      </span>

      <p className="ornate-label text-primary/70">
        Round {activeRound.roundNumber} result
      </p>

      <div className="mt-3 flex items-end gap-4">
        {/* Big result number */}
        {isMostVoted && activeRound.resultValue ? (
          <>
            <span
              className="text-gold-gradient font-serif text-6xl font-bold leading-none"
              style={{
                animation: "reveal-slide 0.7s cubic-bezier(0.16, 0.84, 0.24, 1) 0.15s both",
              }}
            >
              {activeRound.resultValue}
            </span>
            <span className="mb-1 text-sm text-muted-foreground">
              consensus
            </span>
          </>
        ) : isTie ? (
          <>
            <span
              className="font-serif text-5xl font-bold leading-none text-accent"
              style={{
                animation: "reveal-slide 0.7s cubic-bezier(0.16, 0.84, 0.24, 1) 0.15s both",
              }}
            >
              {activeRound.resultValue ? activeRound.resultValue : "Tie"}
            </span>
            <span className="mb-1 text-sm text-muted-foreground">
              split vote
            </span>
          </>
        ) : (
          <span className="font-serif text-3xl text-muted-foreground">
            No result yet
          </span>
        )}
      </div>

      {/* Decorative gold rule */}
      <div className="gold-rule mt-4" />
    </div>
  );
}
