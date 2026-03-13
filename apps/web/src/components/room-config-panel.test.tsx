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
    });
    expect(onUpdateConfig).toHaveBeenNthCalledWith(2, {
      scaleType: "fibonacci",
      consensusMode: "threshold",
      consensusThreshold: 60,
      hostVotingEnabled: true,
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
    });
  });

  it("hides the password section when passwords are not allowed", () => {
    render(
      <RoomConfigPanel
        scaleType="fibonacci"
        consensusMode="plurality"
        consensusThreshold={70}
        hostVotingEnabled={true}
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
        hasPassword={false}
        onUpdateConfig={onUpdateConfig}
        onUpdatePassword={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Custom/i }));
    expect(onUpdateConfig).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Custom scale values"), { target: { value: "1, 2, a" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply custom scale" }));

    expect(onUpdateConfig).toHaveBeenCalledWith({
      scaleType: "custom",
      customScaleValues: ["1", "2", "a"],
      consensusMode: "plurality",
      consensusThreshold: 70,
      hostVotingEnabled: true,
    });
  });

  it("shows validation feedback for invalid custom values", () => {
    render(
      <RoomConfigPanel
        scaleType="fibonacci"
        consensusMode="plurality"
        consensusThreshold={70}
        hostVotingEnabled={true}
        hasPassword={false}
        onUpdateConfig={vi.fn().mockResolvedValue(undefined)}
        onUpdatePassword={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Custom/i }));
    fireEvent.change(screen.getByLabelText("Custom scale values"), { target: { value: "AA, BB, CC" } });
    fireEvent.blur(screen.getByLabelText("Custom scale values"));

    expect(screen.getByText("Custom scale values must be numbers or single characters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply custom scale" })).toBeDisabled();
  });
});
