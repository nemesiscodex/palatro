import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import JoinRoomForm from "./join-room-form";

describe("JoinRoomForm", () => {
  const onJoin = vi.fn();

  beforeEach(() => {
    onJoin.mockReset();
  });

  it("submits nickname only when no password is required", async () => {
    onJoin.mockResolvedValue(undefined);
    render(<JoinRoomForm onJoin={onJoin} />);

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Alex" } });
    fireEvent.click(screen.getByRole("button", { name: "Join the table" }));

    await waitFor(() => {
      expect(onJoin).toHaveBeenCalledWith({
        nickname: "Alex",
        password: undefined,
        joinMode: "guest",
      });
    });
  });

  it("submits nickname and password when required", async () => {
    onJoin.mockResolvedValue(undefined);
    render(<JoinRoomForm onJoin={onJoin} hasPassword />);

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Alex" } });
    fireEvent.change(screen.getByLabelText(/Room password$/), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Join the table" }));

    await waitFor(() => {
      expect(onJoin).toHaveBeenCalledWith({
        nickname: "Alex",
        password: "secret",
        joinMode: "guest",
      });
    });
  });

  it("can submit as a view-only participant", async () => {
    onJoin.mockResolvedValue(undefined);
    render(<JoinRoomForm onJoin={onJoin} />);

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Alex" } });
    fireEvent.click(screen.getByRole("button", { name: "View only" }));
    fireEvent.click(screen.getByRole("button", { name: "Join as viewer" }));

    await waitFor(() => {
      expect(onJoin).toHaveBeenCalledWith({
        nickname: "Alex",
        password: undefined,
        joinMode: "viewer",
      });
    });
  });

  it("prevents double submit while pending", async () => {
    let resolveSubmit: (() => void) | undefined;
    onJoin.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    render(<JoinRoomForm onJoin={onJoin} />);

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Alex" } });
    fireEvent.click(screen.getByRole("button", { name: "Join the table" }));
    fireEvent.click(screen.getByRole("button", { name: "Joining..." }));

    expect(onJoin).toHaveBeenCalledTimes(1);

    resolveSubmit?.();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Join the table" })).toBeEnabled();
    });
  });

  it("updates nickname when defaultValue prop changes", () => {
    const { rerender } = render(<JoinRoomForm onJoin={onJoin} defaultValue="Alex" />);
    expect(screen.getByLabelText("Your name")).toHaveValue("Alex");

    rerender(<JoinRoomForm onJoin={onJoin} defaultValue="Taylor" />);
    expect(screen.getByLabelText("Your name")).toHaveValue("Taylor");
  });
});
