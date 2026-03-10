import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ParticipantList from "./participant-list";

describe("ParticipantList", () => {
  it("renders an empty state when there are no participants", () => {
    render(<ParticipantList participants={[]} status="idle" />);

    expect(screen.getByText("No one is in the room yet")).toBeInTheDocument();
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

  it("renders viewers separately and allows the owner to remove them", () => {
    const onKick = vi.fn();

    render(
      <ParticipantList
        status="idle"
        canManage
        onKick={onKick}
        participants={[
          { id: "viewer-1", displayName: "Pat", hasVoted: false, revealedVote: null, kind: "viewer" },
        ]}
      />,
    );

    expect(screen.getByText("Viewer")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Kick Pat"));

    expect(onKick).toHaveBeenCalledWith("viewer-1");
  });
});
