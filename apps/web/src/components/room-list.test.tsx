import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MockLink } from "@/test/mocks";

vi.mock("@tanstack/react-router", () => ({
  Link: MockLink,
}));

import RoomList from "./room-list";

describe("RoomList", () => {
  it("renders an empty state", () => {
    render(<RoomList rooms={[]} onDeleteRoom={vi.fn()} />);

    expect(screen.getByText("No tables open")).toBeInTheDocument();
  });

  it("renders room summaries and forwards delete actions", () => {
    const onDeleteRoom = vi.fn();

    render(
      <RoomList
        rooms={[
          {
            id: "room-1",
            name: "Sprint Poker",
            slug: "sprint-poker",
            scaleType: "fibonacci",
            status: "voting",
            hasPassword: true,
          },
        ]}
        onDeleteRoom={onDeleteRoom}
      />,
    );

    expect(screen.getByText("Sprint Poker")).toBeInTheDocument();
    expect(screen.getByText("/rooms/sprint-poker")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText(/Locked/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDeleteRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "room-1",
        slug: "sprint-poker",
      }),
    );
  });
});
