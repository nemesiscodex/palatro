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
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("View Palatro on GitHub")).toHaveAttribute(
      "href",
      "https://github.com/nemesiscodex/palatro",
    );
    expect(screen.getByRole("button", { name: "Mute sound effects" })).toBeInTheDocument();
  });

  it("shows room pills for authenticated users", () => {
    mockState.auth = { isAuthenticated: true, isLoading: false };
    mockState.rooms = [
      {
        id: "room-1",
        slug: "demo-room",
        name: "Demo Room With An Extraordinarily Long Name For Narrow Screens",
      },
    ];

    render(<Header />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Rooms")).toBeInTheDocument();
    expect(screen.getByRole("banner").firstElementChild).toHaveClass("px-4", "sm:px-5");
    expect(screen.getByRole("link", { name: /demo room with an extraordinarily long name/i })).toHaveClass(
      "min-w-0",
      "max-w-full",
      "truncate",
    );

    mockState.auth = { isAuthenticated: false, isLoading: false };
    mockState.rooms = [];
  });

  it("uses wrapping layout classes for the mobile header chrome", () => {
    mockState.auth = { isAuthenticated: true, isLoading: false };
    mockState.rooms = [];

    render(<Header />);

    expect(screen.getByTestId("header-top")).toHaveClass("flex-wrap");
    expect(screen.getByTestId("header-actions")).toHaveClass("w-full", "flex-wrap", "justify-end");

    mockState.auth = { isAuthenticated: false, isLoading: false };
  });
});
