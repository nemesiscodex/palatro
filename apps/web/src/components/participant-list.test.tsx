import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ParticipantList from "./participant-list";

describe("ParticipantList", () => {
  it("renders an empty state when there are no participants", () => {
    render(<ParticipantList participants={[]} status="idle" />);

    expect(screen.getByText("No players at the table")).toBeInTheDocument();
  });

  it("shows voting indicators and allows kicking guests when manageable", () => {
    const onKick = vi.fn();

    render(
      <ParticipantList
        status="voting"
        canManage
        onKick={onKick}
        participants={[
          { id: "host-1", displayName: "Dealer", hasVoted: true, revealedVote: null, kind: "host" },
          { id: "guest-1", displayName: "Alex", hasVoted: false, revealedVote: null, kind: "guest" },
        ]}
      />,
    );

    expect(screen.getAllByText("Dealer").length).toBeGreaterThan(0);
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByLabelText("Kick Alex")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Kick Alex"));

    expect(onKick).toHaveBeenCalledWith("guest-1");
  });

  it("shows revealed votes after the round is revealed", () => {
    render(
      <ParticipantList
        status="revealed"
        participants={[
          { id: "guest-1", displayName: "Alex", hasVoted: true, revealedVote: "8", kind: "guest" },
        ]}
      />,
    );

    expect(screen.getByText("8")).toBeInTheDocument();
  });
});
