import { describe, expect, it } from "vitest";

import {
  ACTIVE_PARTICIPANT_STALE_MS,
  computeRoundResult,
  createRoomSlug,
  createSlugCandidate,
  getDeck,
  isParticipantFresh,
  normalizeDisplayName,
  normalizeRoomSlug,
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

  it("normalizes custom room slugs", () => {
    expect(normalizeRoomSlug("  Sprint Board  ")).toBe("sprint-board");
    expect(normalizeRoomSlug("FEATURE__123")).toBe("feature-123");
    expect(normalizeRoomSlug("!!!")).toBe("");
  });

  it("creates UUID room slugs", () => {
    const slug = createRoomSlug();
    expect(slug).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
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
