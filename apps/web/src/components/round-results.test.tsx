import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RoundResults from "./round-results";

describe("RoundResults", () => {
  it("renders a most-voted result", () => {
    render(
      <RoundResults
        activeRound={{ roundNumber: 2, resultType: "most_voted", resultValue: "8" }}
      />,
    );

    expect(screen.getByText("Round 2 result")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("consensus")).toBeInTheDocument();
  });

  it("renders a tie result", () => {
    render(
      <RoundResults
        activeRound={{ roundNumber: 3, resultType: "tie", resultValue: "8 / 5" }}
      />,
    );

    expect(screen.getByText("8 / 5")).toBeInTheDocument();
    expect(screen.getByText("split vote")).toBeInTheDocument();
  });
});
