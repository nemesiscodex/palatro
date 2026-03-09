import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/sign-in-form", () => ({
  default: () => <div data-testid="sign-in-form" />,
}));

vi.mock("@/components/sign-up-form", () => ({
  default: () => <div data-testid="sign-up-form" />,
}));

vi.mock("@/components/landing-hero-demo", () => ({
  default: () => <div data-testid="landing-hero-demo" />,
}));

import LandingShell from "./landing-shell";

describe("LandingShell", () => {
  it("renders the updated hero content", () => {
    render(<LandingShell />);

    expect(screen.getByText(/Join a table/i)).toBeInTheDocument();
    expect(screen.getByText(/Reveal!/i)).toBeInTheDocument();
    expect(screen.getByTestId("landing-hero-demo")).toBeInTheDocument();
    expect(screen.getByTestId("sign-up-form")).toBeInTheDocument();
  });
});
