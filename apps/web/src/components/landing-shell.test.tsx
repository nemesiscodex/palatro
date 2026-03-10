import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
}));

vi.mock("@/components/sign-in-form", () => ({
  default: () => <div data-testid="sign-in-form" />,
}));

vi.mock("@/components/sign-up-form", () => ({
  default: () => <div data-testid="sign-up-form" />,
}));

vi.mock("@/components/landing-hero-demo", () => ({
  default: () => <div data-testid="landing-hero-demo" />,
}));

vi.mock("@/components/create-room-form", () => ({
  default: ({ mode }: { mode?: string }) => <div data-testid={`create-room-form-${mode}`} />,
}));

import LandingShell from "./landing-shell";

describe("LandingShell", () => {
  it("renders the updated hero content", () => {
    render(<LandingShell />);

    expect(screen.getByText(/Join a table/i)).toBeInTheDocument();
    expect(screen.getByText(/Reveal!/i)).toBeInTheDocument();
    expect(screen.getByTestId("landing-hero-demo")).toBeInTheDocument();
    expect(screen.getByTestId("sign-up-form")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try one guest room" })).toBeInTheDocument();
  });

  it("switches to the guest room trial form", () => {
    render(<LandingShell />);

    fireEvent.click(screen.getByRole("button", { name: "Try one guest room" }));

    expect(screen.getByTestId("create-room-form-guest")).toBeInTheDocument();
  });
});
