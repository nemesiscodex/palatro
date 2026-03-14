import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const playRoundControlSound = vi.fn();

vi.mock("@/hooks/use-app-sound", () => ({
  useAppSound: () => playRoundControlSound,
}));

import RoundControls from "./round-controls";

describe("RoundControls", () => {
  it("hides controls when the viewer cannot manage rounds", () => {
    const { container } = render(
      <RoundControls
        status="idle"
        canManage={false}
        onStart={vi.fn()}
        onRestart={vi.fn()}
        onReadyCheck={vi.fn()}
        onForceFinish={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("disables the start button during active voting and enables force reveal", () => {
    render(
      <RoundControls
        status="voting"
        canManage
        onStart={vi.fn()}
        onRestart={vi.fn()}
        onReadyCheck={vi.fn()}
        onForceFinish={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Start pointing$/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Force reveal" })).toBeEnabled();
  });

  it("fires the expected callbacks", () => {
    playRoundControlSound.mockReset();
    const onStart = vi.fn().mockResolvedValue(undefined);
    const onRestart = vi.fn().mockResolvedValue(undefined);
    const onReadyCheck = vi.fn().mockResolvedValue(undefined);
    const onForceFinish = vi.fn().mockResolvedValue(undefined);

    render(
      <RoundControls
        status="idle"
        canManage
        onStart={onStart}
        onRestart={onRestart}
        onReadyCheck={onReadyCheck}
        onForceFinish={onForceFinish}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Deal the cards$/ }));
    fireEvent.click(screen.getByRole("button", { name: "Restart round" }));
    fireEvent.click(screen.getByRole("button", { name: "Ready check" }));
    fireEvent.click(screen.getByRole("button", { name: "Force reveal" }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onReadyCheck).toHaveBeenCalledTimes(1);
    expect(onForceFinish).not.toHaveBeenCalled();
    expect(playRoundControlSound).toHaveBeenCalledTimes(3);
  });

  it("plays sound for restart, ready check, and force reveal during voting", () => {
    playRoundControlSound.mockReset();
    const onStart = vi.fn().mockResolvedValue(undefined);
    const onRestart = vi.fn().mockResolvedValue(undefined);
    const onReadyCheck = vi.fn().mockResolvedValue(undefined);
    const onForceFinish = vi.fn().mockResolvedValue(undefined);

    render(
      <RoundControls
        status="voting"
        canManage
        onStart={onStart}
        onRestart={onRestart}
        onReadyCheck={onReadyCheck}
        onForceFinish={onForceFinish}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Start pointing$/ }));
    fireEvent.click(screen.getByRole("button", { name: "Restart round" }));
    fireEvent.click(screen.getByRole("button", { name: "Ready check" }));
    fireEvent.click(screen.getByRole("button", { name: "Force reveal" }));

    expect(playRoundControlSound).toHaveBeenCalledTimes(3);
    expect(onStart).not.toHaveBeenCalled();
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onReadyCheck).toHaveBeenCalledTimes(1);
    expect(onForceFinish).toHaveBeenCalledTimes(1);
  });

  it("disables ready check while one is already active", () => {
    render(
      <RoundControls
        status="idle"
        canManage
        readyCheckActive
        onStart={vi.fn()}
        onRestart={vi.fn()}
        onReadyCheck={vi.fn()}
        onForceFinish={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Ready check" })).toBeDisabled();
  });
});
