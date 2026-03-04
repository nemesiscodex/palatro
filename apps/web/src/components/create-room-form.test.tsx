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
        password: undefined,
      });
    });
  });

  it("updates the selected scale and trims the password", async () => {
    onCreateRoom.mockResolvedValue(undefined);
    render(<CreateRoomForm onCreateRoom={onCreateRoom} />);

    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "Sprint Beta" } });
    fireEvent.click(screen.getByRole("button", { name: /Power of Two$/ }));
    fireEvent.click(screen.getByRole("button", { name: /Add password \(optional\)$/ }));
    fireEvent.change(screen.getByPlaceholderText("Enter room password"), { target: { value: "  deck  " } });
    fireEvent.click(screen.getByRole("button", { name: "Open table" }));

    await waitFor(() => {
      expect(onCreateRoom).toHaveBeenCalledWith({
        name: "Sprint Beta",
        scaleType: "powers_of_two",
        password: "deck",
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
    fireEvent.submit(screen.getByRole("button", { name: "Open table" }).closest("form")!);
    fireEvent.submit(screen.getByRole("button", { name: "Creating..." }).closest("form")!);

    expect(onCreateRoom).toHaveBeenCalledTimes(1);

    resolveSubmit?.();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open table" })).toBeEnabled();
    });
  });
});
