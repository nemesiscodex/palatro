import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/sign-in-form", () => ({
  default: () => <div data-testid="sign-in-form" />,
}));

vi.mock("@/components/sign-up-form", () => ({
  default: () => <div data-testid="sign-up-form" />,
}));

import LandingShell from "./landing-shell";

describe("LandingShell", () => {
  it("renders the branded logos", () => {
    render(<LandingShell />);

    expect(screen.getByAltText("Palatro joker mark")).toHaveAttribute("src", "/brand/palatro-logo.svg");
    expect(screen.getByAltText("Palatro")).toHaveAttribute("src", "/brand/palatro-texto-logo.svg");
    expect(screen.getByText(/A smoky/i)).toBeInTheDocument();
  });
});
