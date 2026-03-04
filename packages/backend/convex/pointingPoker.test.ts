import { describe, expect, it } from "vitest";

import {
  ACTIVE_PARTICIPANT_STALE_MS,
  computeRoundResult,
  createSlugCandidate,
  getDeck,
  isParticipantFresh,
  normalizeDisplayName,
} from "./pointingPoker";

describe("pointingPoker helpers", () => {
  it("returns the expected deck for each scale", () => {
    expect(getDeck("fibonacci")).toEqual(["?", "1", "2", "3", "5", "8", "13", "21"]);
    expect(getDeck("powers_of_two")).toEqual(["?", "1", "2", "4", "8", "16", "32"]);
  });

  it("normalizes display names", () => {
    expect(normalizeDisplayName("  Sprint   Planning   ")).toBe("Sprint Planning");
  });

  it("creates stable slug candidates", () => {
    expect(createSlugCandidate("  Team Alpha!  ")).toBe("team-alpha");
    expect(createSlugCandidate("!!!")).toBe("room");
  });

  it("checks participant freshness against the stale window", () => {
    const now = 1_000_000;

    expect(isParticipantFresh(now - ACTIVE_PARTICIPANT_STALE_MS + 1, now)).toBe(true);
    expect(isParticipantFresh(now - ACTIVE_PARTICIPANT_STALE_MS - 1, now)).toBe(false);
  });

  it("computes a most-voted result and ignores unknown votes", () => {
    expect(computeRoundResult(["?", "8", "8", "5"])).toEqual({
      resultType: "most_voted",
      resultValue: "8",
    });
  });

  it("computes tie results and returns the top two tied values in descending order", () => {
    expect(computeRoundResult(["3", "8", "3", "8", "1"])).toEqual({
      resultType: "tie",
      resultValue: "8 / 3",
    });
    expect(computeRoundResult(["?", "?"])).toEqual({
      resultType: "tie",
      resultValue: null,
    });
  });
});
