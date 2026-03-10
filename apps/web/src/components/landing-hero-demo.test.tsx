import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const capture = vi.fn();
const playSound = vi.fn();
const playRevealSound = vi.fn();

vi.mock("@posthog/react", () => ({
  usePostHog: () => ({
    capture,
  }),
}));

vi.mock("@/hooks/use-app-sound", async () => {
  const { switch002Sound } = await import("@/lib/switch-002");

  return {
    useAppSound: (sound: { dataUri: string }) =>
      sound.dataUri === switch002Sound.dataUri ? playRevealSound : playSound,
  };
});

import LandingHeroDemo from "./landing-hero-demo";

function clickCard(value: string) {
  const button = screen.getAllByRole("button", { name: new RegExp(value) })
    .find((candidate) => candidate.className.includes("group/poker-card"));

  if (!button) {
    throw new Error(`Could not find card button for value ${value}`);
  }

  fireEvent.click(button);
}

function setRandomSequence(values: number[]) {
  let index = 0;
  vi.spyOn(Math, "random").mockImplementation(() => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  });
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

describe("LandingHeroDemo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    capture.mockReset();
    playSound.mockReset();
    playRevealSound.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders the real join form before the visitor joins", () => {
    render(<LandingHeroDemo />);

    expect(screen.getByText("Take a seat")).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join the table" })).toBeInTheDocument();
    expect(screen.queryByText("Join as")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View only" })).not.toBeInTheDocument();
  });

  it("joins the table with the entered name and renders the reused room components", async () => {
    render(<LandingHeroDemo />);

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "  Julio   " } });
    fireEvent.click(screen.getByRole("button", { name: "Join the table" }));
    await flushMicrotasks();

    expect(screen.getByText("Julio")).toBeInTheDocument();
    expect(screen.getByText("Alan")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Players")).toBeInTheDocument();
    expect(screen.getByText("Round 1")).toBeInTheDocument();
    expect(screen.getByText("Pick a card to cast your vote and watch the room react.")).toBeInTheDocument();
  });

  it("marks fake players as voted over time and waits for all votes before revealing", async () => {
    setRandomSequence([0, 0.2, 0.4, 0.6]);
    const { container } = render(<LandingHeroDemo />);

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Alex" } });
    fireEvent.click(screen.getByRole("button", { name: "Join the table" }));
    await flushMicrotasks();

    clickCard("8");

    expect(screen.getAllByText("\u2713")).toHaveLength(1);

    await advance(500);
    expect(screen.queryByText("Round 1 result")).not.toBeInTheDocument();
    expect(container.textContent?.includes("\u2713")).toBe(true);

    await advance(1000);
    expect(screen.getByText("Round 1 result")).toBeInTheDocument();
    expect(screen.getByText("consensus")).toBeInTheDocument();
  });

  it("resets after reveal and requires a fresh vote for the next round", async () => {
    setRandomSequence([0, 0.2, 0.4, 0.6, 0.1, 0.3, 0.5, 0.7, 0, 0.2, 0.4, 0.6]);
    render(<LandingHeroDemo />);

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Mia" } });
    fireEvent.click(screen.getByRole("button", { name: "Join the table" }));
    await flushMicrotasks();

    clickCard("8");

    await advance(1500);
    expect(screen.getByText("Round 1 result")).toBeInTheDocument();
    expect(screen.getByText("consensus")).toBeInTheDocument();
    expect(screen.getByText("51% threshold reached")).toBeInTheDocument();

    await advance(2500);
    expect(screen.getByText("Round 2")).toBeInTheDocument();
    expect(screen.getByText("Pick a card to cast your vote and watch the room react.")).toBeInTheDocument();
    expect(screen.queryByText("Round 2 result")).not.toBeInTheDocument();

    clickCard("8");

    await advance(1500);
    expect(screen.getByText("Round 2 result")).toBeInTheDocument();
    expect(screen.getByText("split vote")).toBeInTheDocument();
    expect(screen.getByText("8 / 5")).toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();

    await advance(2500);
    expect(screen.getByText("Round 3")).toBeInTheDocument();
    expect(screen.getByText("Pick a card to cast your vote and watch the room react.")).toBeInTheDocument();

    clickCard("8");

    await advance(1500);
    expect(screen.getByText("Round 3 result")).toBeInTheDocument();
    expect(screen.getByText("consensus")).toBeInTheDocument();
    expect(screen.getAllByText("8").length).toBeGreaterThan(1);
  });

  it("plays the reveal cue each time the demo round resolves", async () => {
    setRandomSequence([0, 0.2, 0.4, 0.6, 0.1, 0.3, 0.5, 0.7]);
    render(<LandingHeroDemo />);

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Quinn" } });
    fireEvent.click(screen.getByRole("button", { name: "Join the table" }));
    await flushMicrotasks();

    clickCard("8");
    expect(playRevealSound).not.toHaveBeenCalled();

    await advance(1500);
    expect(playRevealSound).toHaveBeenCalledTimes(1);

    await advance(2500);
    clickCard("8");

    await advance(1500);
    expect(playRevealSound).toHaveBeenCalledTimes(2);
  });

  it("switches to the special always-tie loop when the visitor selects question mark", async () => {
    setRandomSequence([0, 0.2, 0.4, 0.6, 0.1, 0.3, 0.5, 0.7]);
    render(<LandingHeroDemo />);

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Sage" } });
    fireEvent.click(screen.getByRole("button", { name: "Join the table" }));
    await flushMicrotasks();

    clickCard("\\?");

    await advance(1500);
    expect(screen.getByText("Round 1 result")).toBeInTheDocument();
    expect(screen.getByText("split vote")).toBeInTheDocument();
    expect(screen.getByText("8 / 5")).toBeInTheDocument();

    await advance(2500);
    expect(screen.getByText("Round 2")).toBeInTheDocument();
    expect(screen.getByText("Pick a card to cast your vote and watch the room react.")).toBeInTheDocument();

    clickCard("\\?");

    await advance(1500);
    expect(screen.getByText("Round 2 result")).toBeInTheDocument();
    expect(screen.getByText("split vote")).toBeInTheDocument();
  });

  it("resets back to the join form when changing name", async () => {
    render(<LandingHeroDemo />);

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Taylor" } });
    fireEvent.click(screen.getByRole("button", { name: "Join the table" }));
    await flushMicrotasks();

    fireEvent.click(screen.getByRole("button", { name: "Change name" }));

    expect(screen.getByText("Take a seat")).toBeInTheDocument();
    expect(screen.queryByText("Taylor")).not.toBeInTheDocument();
  });

  it("cleans up timers on unmount", async () => {
    setRandomSequence([0, 0.2, 0.4, 0.6]);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<LandingHeroDemo />);

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Drew" } });
    fireEvent.click(screen.getByRole("button", { name: "Join the table" }));
    await flushMicrotasks();

    clickCard("5");
    unmount();
    vi.clearAllTimers();

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
