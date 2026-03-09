import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RoundResults from "./round-results";

describe("RoundResults", () => {
  it("renders a most-voted result", () => {
    render(
      <RoundResults
        activeRound={{ roundNumber: 2, resultType: "most_voted", resultValue: "8", consensusReached: true }}
        consensusMode="plurality"
      />,
    );

    expect(screen.getByText("Round 2 result")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("most voted")).toBeInTheDocument();
  });

  it("renders a tie result", () => {
    render(
      <RoundResults
        activeRound={{ roundNumber: 3, resultType: "tie", resultValue: "8 / 5", consensusReached: false }}
      />,
    );

    expect(screen.getByText("8 / 5")).toBeInTheDocument();
    expect(screen.getByText("split vote")).toBeInTheDocument();
  });

  it("renders a threshold miss as no consensus", () => {
    render(
      <RoundResults
        activeRound={{ roundNumber: 4, resultType: "most_voted", resultValue: "5", consensusReached: false }}
        consensusMode="threshold"
        consensusThreshold={70}
      />,
    );

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("no consensus")).toBeInTheDocument();
    expect(screen.getByText("70% threshold required")).toBeInTheDocument();
  });
});
