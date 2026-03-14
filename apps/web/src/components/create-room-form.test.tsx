import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CreateRoomForm from "./create-room-form";

describe("CreateRoomForm", () => {
  const onCreateRoom = vi.fn();

  beforeEach(() => {
    onCreateRoom.mockReset();
  });

  it("submits defaults and omits a blank password", async () => {
    onCreateRoom.mockResolvedValue(undefined);
    render(<CreateRoomForm onCreateRoom={onCreateRoom} />);

    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "Sprint Alpha" } });
    fireEvent.click(screen.getByRole("button", { name: "Open table" }));

    await waitFor(() => {
      expect(onCreateRoom).toHaveBeenCalledWith({
        name: "Sprint Alpha",
        scaleType: "fibonacci",
        customScaleValues: undefined,
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        votingTimeLimitSeconds: undefined,
        password: undefined,
        slug: undefined,
      });
    });
  });

  it("updates the selected scale and trims the password", async () => {
    onCreateRoom.mockResolvedValue(undefined);
    render(<CreateRoomForm onCreateRoom={onCreateRoom} />);

    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "Sprint Beta" } });
    fireEvent.click(screen.getByRole("button", { name: /T-Shirt$/ }));
    fireEvent.click(screen.getByRole("button", { name: /Add password \(optional\)$/ }));
    fireEvent.change(screen.getByPlaceholderText("Enter room password"), { target: { value: "  deck  " } });
    fireEvent.click(screen.getByRole("button", { name: "Open table" }));

    await waitFor(() => {
      expect(onCreateRoom).toHaveBeenCalledWith({
        name: "Sprint Beta",
        scaleType: "t_shirt",
        customScaleValues: undefined,
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        votingTimeLimitSeconds: undefined,
        password: "deck",
        slug: undefined,
      });
    });
  });

  it("submits a trimmed custom slug", async () => {
    onCreateRoom.mockResolvedValue(undefined);
    render(<CreateRoomForm onCreateRoom={onCreateRoom} />);

    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "Sprint Epsilon" } });
    fireEvent.change(screen.getByLabelText("Custom URL slug (optional)"), {
      target: { value: "  Feature Board  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open table" }));

    await waitFor(() => {
      expect(onCreateRoom).toHaveBeenCalledWith({
        name: "Sprint Epsilon",
        scaleType: "fibonacci",
        customScaleValues: undefined,
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        votingTimeLimitSeconds: undefined,
        password: undefined,
        slug: "Feature Board",
      });
    });
  });

  it("resets fields after a successful submit", async () => {
    onCreateRoom.mockResolvedValue(undefined);
    render(<CreateRoomForm onCreateRoom={onCreateRoom} />);

    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "Sprint Gamma" } });
    fireEvent.click(screen.getByRole("button", { name: /Add password \(optional\)$/ }));
    fireEvent.change(screen.getByPlaceholderText("Enter room password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Open table" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Room name")).toHaveValue("");
    });
    expect(screen.getByLabelText("Custom URL slug (optional)")).toHaveValue("");
    expect(screen.getByRole("button", { name: /Fibonacci$/ })).toHaveClass("border-primary/30");
    expect(screen.queryByPlaceholderText("Enter room password")).not.toBeInTheDocument();
  });

  it("prevents a second submit while the first request is pending", async () => {
    let resolveSubmit: (() => void) | undefined;
    onCreateRoom.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    render(<CreateRoomForm onCreateRoom={onCreateRoom} />);

    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "Sprint Delta" } });
    fireEvent.click(screen.getByRole("button", { name: "Open table" }));
    fireEvent.click(screen.getByRole("button", { name: "Creating..." }));

    expect(onCreateRoom).toHaveBeenCalledTimes(1);

    resolveSubmit?.();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open table" })).toBeEnabled();
    });
  });

  it("submits a preset threshold when threshold mode is selected", async () => {
    onCreateRoom.mockResolvedValue(undefined);
    render(<CreateRoomForm onCreateRoom={onCreateRoom} />);

    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "Sprint Theta" } });
    fireEvent.click(screen.getByRole("button", { name: /Consensus threshold/i }));
    fireEvent.change(screen.getByLabelText("Consensus threshold"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Open table" }));

    await waitFor(() => {
      expect(onCreateRoom).toHaveBeenCalledWith({
        name: "Sprint Theta",
        scaleType: "fibonacci",
        customScaleValues: undefined,
        consensusMode: "threshold",
        consensusThreshold: 80,
        hostVotingEnabled: true,
        votingTimeLimitSeconds: undefined,
        password: undefined,
        slug: undefined,
      });
    });
  });

  it("submits the lowest fixed threshold value", async () => {
    onCreateRoom.mockResolvedValue(undefined);
    render(<CreateRoomForm onCreateRoom={onCreateRoom} />);

    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "Sprint Lambda" } });
    fireEvent.click(screen.getByRole("button", { name: /Consensus threshold/i }));
    fireEvent.change(screen.getByLabelText("Consensus threshold"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Open table" }));

    await waitFor(() => {
      expect(onCreateRoom).toHaveBeenCalledWith({
        name: "Sprint Lambda",
        scaleType: "fibonacci",
        customScaleValues: undefined,
        consensusMode: "threshold",
        consensusThreshold: 51,
        hostVotingEnabled: true,
        votingTimeLimitSeconds: undefined,
        password: undefined,
        slug: undefined,
      });
    });
  });

  it("lets the host be configured as host only", async () => {
    onCreateRoom.mockResolvedValue(undefined);
    render(<CreateRoomForm onCreateRoom={onCreateRoom} />);

    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "Sprint Dealer" } });
    fireEvent.click(screen.getByRole("button", { name: /Host only/i }));
    fireEvent.click(screen.getByRole("button", { name: "Open table" }));

    await waitFor(() => {
      expect(onCreateRoom).toHaveBeenCalledWith({
        name: "Sprint Dealer",
        scaleType: "fibonacci",
        customScaleValues: undefined,
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: false,
        votingTimeLimitSeconds: undefined,
        password: undefined,
        slug: undefined,
      });
    });
  });

  it("submits custom scale values without asking for question mark", async () => {
    onCreateRoom.mockResolvedValue(undefined);
    render(<CreateRoomForm onCreateRoom={onCreateRoom} />);

    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "Sprint Custom" } });
    fireEvent.click(screen.getByRole("button", { name: /Custom$/ }));
    fireEvent.change(screen.getByLabelText("Custom scale values"), { target: { value: "1, 2, a" } });
    fireEvent.click(screen.getByRole("button", { name: "Open table" }));

    await waitFor(() => {
      expect(onCreateRoom).toHaveBeenCalledWith({
        name: "Sprint Custom",
        scaleType: "custom",
        customScaleValues: ["1", "2", "a"],
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        votingTimeLimitSeconds: undefined,
        password: undefined,
        slug: undefined,
      });
    });
  });

  it("blocks invalid custom scale values", () => {
    render(<CreateRoomForm onCreateRoom={onCreateRoom} />);

    fireEvent.click(screen.getByRole("button", { name: /Custom$/ }));
    fireEvent.change(screen.getByLabelText("Custom scale values"), { target: { value: "AA, BB, CC" } });
    fireEvent.blur(screen.getByLabelText("Custom scale values"));

    expect(screen.getByText("Custom scale values must be numbers or single characters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open table" })).toBeDisabled();
  });

  it("hides slug and password controls in guest mode", () => {
    render(<CreateRoomForm mode="guest" onCreateRoom={onCreateRoom} />);

    expect(screen.queryByLabelText("Custom URL slug (optional)")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add password/i })).not.toBeInTheDocument();
    expect(screen.getByText(/saved only on this device/i)).toBeInTheDocument();
  });

  it("omits guest-only disabled fields from guest mode submissions", async () => {
    onCreateRoom.mockResolvedValue(undefined);
    render(<CreateRoomForm mode="guest" onCreateRoom={onCreateRoom} />);

    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "Guest Dealer" } });
    fireEvent.click(screen.getByRole("button", { name: "Open table" }));

    await waitFor(() => {
      expect(onCreateRoom).toHaveBeenCalledWith({
        name: "Guest Dealer",
        scaleType: "fibonacci",
        customScaleValues: undefined,
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        votingTimeLimitSeconds: undefined,
        password: undefined,
        slug: undefined,
      });
    });
  });

  it("submits a preset voting time limit", async () => {
    onCreateRoom.mockResolvedValue(undefined);
    render(<CreateRoomForm onCreateRoom={onCreateRoom} />);

    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "Sprint Timer" } });
    fireEvent.click(screen.getByRole("button", { name: /Timer on/i }));
    fireEvent.click(screen.getByRole("button", { name: "Open table" }));

    await waitFor(() => {
      expect(onCreateRoom).toHaveBeenCalledWith({
        name: "Sprint Timer",
        scaleType: "fibonacci",
        customScaleValues: undefined,
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        votingTimeLimitSeconds: 45,
        password: undefined,
        slug: undefined,
      });
    });
  });

  it("submits a custom voting time limit", async () => {
    onCreateRoom.mockResolvedValue(undefined);
    render(<CreateRoomForm onCreateRoom={onCreateRoom} />);

    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "Sprint Slider Timer" } });
    fireEvent.click(screen.getByRole("button", { name: /Timer on/i }));
    fireEvent.change(screen.getByLabelText("Voting time limit"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Open table" }));

    await waitFor(() => {
      expect(onCreateRoom).toHaveBeenCalledWith({
        name: "Sprint Slider Timer",
        scaleType: "fibonacci",
        customScaleValues: undefined,
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        votingTimeLimitSeconds: 75,
        password: undefined,
        slug: undefined,
      });
    });
  });

  it("shows the slider only when the timer is enabled", () => {
    render(<CreateRoomForm onCreateRoom={onCreateRoom} />);

    expect(screen.queryByLabelText("Voting time limit")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Timer on/i }));
    expect(screen.getByLabelText("Voting time limit")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Timer off/i }));
    expect(screen.queryByLabelText("Voting time limit")).not.toBeInTheDocument();
  });

  it("uses mobile-safe classes for timer and consensus controls", () => {
    render(<CreateRoomForm onCreateRoom={onCreateRoom} />);

    fireEvent.click(screen.getByRole("button", { name: /Timer on/i }));
    fireEvent.click(screen.getByRole("button", { name: /Consensus threshold/i }));

    const timerToggleRow = screen.getByRole("button", { name: /Timer off/i }).parentElement;
    const timerTicks = screen.getByTestId("voting-time-limit-desktop-labels");
    const thresholdTicks = screen.getByTestId("consensus-threshold-desktop-labels");
    const mobileTimerTicks = screen.getByTestId("voting-time-limit-mobile-labels");
    const mobileThresholdTicks = screen.getByTestId("consensus-threshold-mobile-labels");

    expect(timerToggleRow).toHaveClass("grid-cols-1", "sm:grid-cols-2");
    expect(timerTicks).toHaveClass("hidden", "sm:grid");
    expect(thresholdTicks).toHaveClass("hidden", "sm:grid");
    expect(mobileTimerTicks).toHaveClass("sm:hidden");
    expect(mobileThresholdTicks).toHaveClass("sm:hidden");
  });
});
