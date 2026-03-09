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
        consensusMode: "plurality",
        consensusThreshold: 70,
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
        consensusMode: "plurality",
        consensusThreshold: 70,
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
        consensusMode: "plurality",
        consensusThreshold: 70,
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
        consensusMode: "threshold",
        consensusThreshold: 80,
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
        consensusMode: "threshold",
        consensusThreshold: 51,
        password: undefined,
        slug: undefined,
      });
    });
  });
});
