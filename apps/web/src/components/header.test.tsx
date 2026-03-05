import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MockLink } from "@/test/mocks";

const mockState = {
  auth: { isAuthenticated: false, isLoading: false },
  rooms: [] as Array<{ id: string; slug: string; name: string }>,
};

vi.mock("@tanstack/react-router", () => ({
  Link: MockLink,
}));

vi.mock("@palatro/backend/convex/_generated/api", () => ({
  api: {
    rooms: {
      listMine: "rooms.listMine",
    },
  },
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => mockState.auth,
  useQuery: () => mockState.rooms,
}));

vi.mock("./user-menu", () => ({
  default: () => <div data-testid="user-menu" />,
}));

import Header from "./header";

describe("Header", () => {
  it("renders branded mark and wordmark", () => {
    render(<Header />);

    expect(screen.getByAltText("Palatro joker mark")).toHaveAttribute("src", "/brand/palatro-logo.svg");
    expect(screen.getByAltText("Palatro")).toHaveAttribute("src", "/brand/palatro-texto-logo.svg");
    expect(screen.getByText("Pointing Poker")).toBeInTheDocument();
  });

  it("shows room pills for authenticated users", () => {
    mockState.auth = { isAuthenticated: true, isLoading: false };
    mockState.rooms = [{ id: "room-1", slug: "demo-room", name: "Demo Room" }];

    render(<Header />);

    expect(screen.getByText("Rooms")).toBeInTheDocument();
    expect(screen.getByText("Demo Room")).toBeInTheDocument();

    mockState.auth = { isAuthenticated: false, isLoading: false };
    mockState.rooms = [];
  });
});
