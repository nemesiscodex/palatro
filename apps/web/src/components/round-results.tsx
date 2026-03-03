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

  return (
    <div className="border-border rounded-none border px-3 py-2">
      <p className="font-medium">Round {activeRound.roundNumber} results</p>
      <p className="text-muted-foreground text-sm">
        {activeRound.resultType === "most_voted"
          ? `Most voted: ${activeRound.resultValue}`
          : activeRound.resultType === "tie"
            ? activeRound.resultValue
              ? `Result: tie (${activeRound.resultValue})`
              : "Result: tie"
            : "No result yet"}
      </p>
    </div>
  );
}
