import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RoomConfigPanel from "./room-config-panel";

const playHoverSound = vi.fn();

vi.mock("@/hooks/use-app-sound", () => ({
  useAppSound: () => playHoverSound,
}));

describe("RoomConfigPanel", () => {
  it("plays hover sound when hovering a scale option", () => {
    playHoverSound.mockReset();

    render(
      <RoomConfigPanel
        scaleType="fibonacci"
        consensusMode="plurality"
        consensusThreshold={70}
        hostVotingEnabled={true}
        votingTimeLimitSeconds={null}
        hasPassword={false}
        onUpdateConfig={vi.fn().mockResolvedValue(undefined)}
        onUpdatePassword={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.mouseEnter(screen.getByRole("button", { name: /Power of Two/i }));

    expect(playHoverSound).toHaveBeenCalledTimes(1);
  });

  it("shows pointer cursor for clickable scale options", () => {
    render(
      <RoomConfigPanel
        scaleType="fibonacci"
        consensusMode="plurality"
        consensusThreshold={70}
        hostVotingEnabled={true}
        votingTimeLimitSeconds={null}
        hasPassword={false}
        onUpdateConfig={vi.fn().mockResolvedValue(undefined)}
        onUpdatePassword={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByRole("button", { name: /Power of Two/i })).toHaveClass("cursor-pointer");
  });

  it("submits threshold changes through the shared config callback", async () => {
    const onUpdateConfig = vi.fn().mockResolvedValue(undefined);

    render(
      <RoomConfigPanel
        scaleType="fibonacci"
        consensusMode="plurality"
        consensusThreshold={70}
        hostVotingEnabled={true}
        votingTimeLimitSeconds={null}
        hasPassword={false}
        onUpdateConfig={onUpdateConfig}
        onUpdatePassword={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Consensus threshold/i }));
    fireEvent.change(screen.getByLabelText("Consensus threshold"), { target: { value: "1" } });

    expect(onUpdateConfig).toHaveBeenNthCalledWith(1, {
      scaleType: "fibonacci",
      consensusMode: "threshold",
      consensusThreshold: 70,
      hostVotingEnabled: true,
      votingTimeLimitSeconds: undefined,
    });
    expect(onUpdateConfig).toHaveBeenNthCalledWith(2, {
      scaleType: "fibonacci",
      consensusMode: "threshold",
      consensusThreshold: 60,
      hostVotingEnabled: true,
      votingTimeLimitSeconds: undefined,
    });
  });

  it("submits host-only changes through the shared config callback", () => {
    const onUpdateConfig = vi.fn().mockResolvedValue(undefined);

    render(
      <RoomConfigPanel
        scaleType="fibonacci"
        consensusMode="plurality"
        consensusThreshold={70}
        hostVotingEnabled={true}
        votingTimeLimitSeconds={null}
        hasPassword={false}
        onUpdateConfig={onUpdateConfig}
        onUpdatePassword={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Host only/i }));

    expect(onUpdateConfig).toHaveBeenCalledWith({
      scaleType: "fibonacci",
      consensusMode: "plurality",
      consensusThreshold: 70,
      hostVotingEnabled: false,
      votingTimeLimitSeconds: undefined,
    });
  });

  it("hides the password section when passwords are not allowed", () => {
    render(
      <RoomConfigPanel
        scaleType="fibonacci"
        consensusMode="plurality"
        consensusThreshold={70}
        hostVotingEnabled={true}
        votingTimeLimitSeconds={null}
        hasPassword={false}
        allowPassword={false}
        onUpdateConfig={vi.fn().mockResolvedValue(undefined)}
        onUpdatePassword={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.queryByText("Room password")).not.toBeInTheDocument();
  });

  it("requires applying a valid custom scale before submitting it", () => {
    const onUpdateConfig = vi.fn().mockResolvedValue(undefined);

    render(
      <RoomConfigPanel
        scaleType="fibonacci"
        consensusMode="plurality"
        consensusThreshold={70}
        hostVotingEnabled={true}
        votingTimeLimitSeconds={null}
        hasPassword={false}
        onUpdateConfig={onUpdateConfig}
        onUpdatePassword={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Custom Numbers or single characters/i }));
    expect(onUpdateConfig).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Custom scale values"), { target: { value: "1, 2, a" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply custom scale" }));

    expect(onUpdateConfig).toHaveBeenCalledWith({
      scaleType: "custom",
      customScaleValues: ["1", "2", "a"],
      consensusMode: "plurality",
      consensusThreshold: 70,
      hostVotingEnabled: true,
      votingTimeLimitSeconds: undefined,
    });
  });

  it("shows validation feedback for invalid custom values", () => {
    render(
      <RoomConfigPanel
        scaleType="fibonacci"
        consensusMode="plurality"
        consensusThreshold={70}
        hostVotingEnabled={true}
        votingTimeLimitSeconds={null}
        hasPassword={false}
        onUpdateConfig={vi.fn().mockResolvedValue(undefined)}
        onUpdatePassword={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Custom Numbers or single characters/i }));
    fireEvent.change(screen.getByLabelText("Custom scale values"), { target: { value: "AA, BB, CC" } });
    fireEvent.blur(screen.getByLabelText("Custom scale values"));

    expect(screen.getByText("Custom scale values must be numbers or single characters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply custom scale" })).toBeDisabled();
  });

  it("submits preset voting timer changes through the shared config callback", () => {
    const onUpdateConfig = vi.fn().mockResolvedValue(undefined);

    render(
      <RoomConfigPanel
        scaleType="fibonacci"
        consensusMode="plurality"
        consensusThreshold={70}
        hostVotingEnabled={true}
        votingTimeLimitSeconds={null}
        hasPassword={false}
        onUpdateConfig={onUpdateConfig}
        onUpdatePassword={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Timer on/i }));

    expect(onUpdateConfig).toHaveBeenCalledWith({
      scaleType: "fibonacci",
      consensusMode: "plurality",
      consensusThreshold: 70,
      hostVotingEnabled: true,
      votingTimeLimitSeconds: 45,
    });
  });

  it("updates the voting timer through the shared slider", () => {
    const onUpdateConfig = vi.fn().mockResolvedValue(undefined);

    render(
      <RoomConfigPanel
        scaleType="fibonacci"
        consensusMode="plurality"
        consensusThreshold={70}
        hostVotingEnabled={true}
        votingTimeLimitSeconds={null}
        hasPassword={false}
        onUpdateConfig={onUpdateConfig}
        onUpdatePassword={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Timer on/i }));
    fireEvent.change(screen.getByLabelText("Voting time limit"), { target: { value: "4" } });

    expect(onUpdateConfig).toHaveBeenNthCalledWith(1, {
      scaleType: "fibonacci",
      consensusMode: "plurality",
      consensusThreshold: 70,
      hostVotingEnabled: true,
      votingTimeLimitSeconds: 45,
    });
    expect(onUpdateConfig).toHaveBeenNthCalledWith(2, {
      scaleType: "fibonacci",
      consensusMode: "plurality",
      consensusThreshold: 70,
      hostVotingEnabled: true,
      votingTimeLimitSeconds: 75,
    });
  });

  it("uses mobile-safe slider label rows and stack-safe password actions", () => {
    render(
      <RoomConfigPanel
        scaleType="fibonacci"
        consensusMode="plurality"
        consensusThreshold={70}
        hostVotingEnabled={true}
        votingTimeLimitSeconds={45}
        hasPassword={true}
        onUpdateConfig={vi.fn().mockResolvedValue(undefined)}
        onUpdatePassword={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Consensus threshold/i }));

    const votingTicks = screen.getByTestId("room-voting-time-limit-desktop-labels");
    const consensusTicks = screen.getByTestId("room-consensus-threshold-desktop-labels");
    const passwordActions = screen.getByTestId("room-password-actions");
    const mobileVotingTicks = screen.getByTestId("room-voting-time-limit-mobile-labels");
    const mobileConsensusTicks = screen.getByTestId("room-consensus-threshold-mobile-labels");

    expect(votingTicks).toHaveClass("hidden", "sm:grid");
    expect(consensusTicks).toHaveClass("hidden", "sm:grid");
    expect(mobileVotingTicks).toHaveClass("sm:hidden");
    expect(mobileConsensusTicks).toHaveClass("sm:hidden");
    expect(passwordActions).toHaveClass("flex-col", "sm:flex-row");
  });
});
