import type { ComponentProps } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "./button";

const playHoverSound = vi.fn();

vi.mock("@/hooks/use-app-sound", () => ({
  useAppSound: () => playHoverSound,
}));

describe("Button", () => {
  beforeEach(() => {
    playHoverSound.mockReset();
  });

  it.each<ComponentProps<typeof Button>["variant"]>([
    "default",
    "outline",
    "secondary",
    "destructive",
  ])("keeps the hover hit target stable for the %s variant", (variant) => {
    render(<Button variant={variant}>Stable target</Button>);

    expect(screen.getByRole("button", { name: "Stable target" }).className).not.toMatch(/hover:-translate-y/);
  });

  it("still plays the hover sound once when the cursor enters", () => {
    render(<Button>Play hover</Button>);

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Play hover" }));

    expect(playHoverSound).toHaveBeenCalledTimes(1);
  });
});
