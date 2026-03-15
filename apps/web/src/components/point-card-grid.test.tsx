import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PointCardGrid from "./point-card-grid";

const mockPlayCardPickSound = vi.fn();
const mockPlayDealCardsSound = vi.fn();
const mockPlayHoverSound = vi.fn();

vi.mock("@/hooks/use-app-sound", () => ({
  useAppSound: vi.fn((sound: { name?: string }) =>
    sound?.name === "switch-006"
      ? mockPlayCardPickSound
      : sound?.name === "select-008"
        ? mockPlayHoverSound
        : mockPlayDealCardsSound,
  ),
}));

describe("PointCardGrid", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPlayCardPickSound.mockReset();
    mockPlayDealCardsSound.mockReset();
    mockPlayHoverSound.mockReset();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders each card in the deck and highlights the selected value", () => {
    render(
      <PointCardGrid deck={["1", "2", "3"]} selectedValue="2" onSelect={vi.fn()} />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(document.querySelectorAll(".ring-2")).toHaveLength(1);
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getByTestId("point-card-grid")).toHaveClass("grid-cols-3", "min-[420px]:grid-cols-4");
    expect(screen.getAllByRole("button")[0]).toHaveClass("h-[6.25rem]", "sm:h-[7.5rem]");
  });

  it("blocks selection when disabled", () => {
    const onSelect = vi.fn();

    render(<PointCardGrid deck={["1", "2"]} selectedValue={null} disabled onSelect={onSelect} />);

    fireEvent.click(screen.getAllByRole("button")[0]);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("shows clickable cursor styling for enabled cards", () => {
    render(<PointCardGrid deck={["1"]} selectedValue={null} onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: /1/ })).toHaveClass("cursor-pointer");
  });

  it("plays a hover sound when hovering an enabled card", () => {
    render(<PointCardGrid deck={["1"]} selectedValue={null} onSelect={vi.fn()} />);

    fireEvent.mouseEnter(screen.getByRole("button", { name: /1/ }));

    expect(mockPlayHoverSound).toHaveBeenCalledTimes(1);
  });

  it("keeps the hover hit target stable by avoiding upward translation", () => {
    render(<PointCardGrid deck={["1"]} selectedValue={null} onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: /1/ }).className).not.toContain("hover:-translate-y-2");
  });

  it("plays the deal sound close to the end of the staggered animation", () => {
    render(<PointCardGrid deck={["1", "2", "3"]} selectedValue={null} onSelect={vi.fn()} />);

    // For 3 cards: last animation end = 80 + (2 * 55) + 500 = 690ms; sound at 570ms.
    expect(mockPlayDealCardsSound).not.toHaveBeenCalled();
    vi.advanceTimersByTime(570);
    expect(mockPlayDealCardsSound).toHaveBeenCalledTimes(1);
  });
});
