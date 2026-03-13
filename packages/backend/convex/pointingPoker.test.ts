import { describe, expect, it } from "vitest";

import {
  ACTIVE_PARTICIPANT_STALE_MS,
  CUSTOM_SCALE_MIN_VALUES,
  computeRoundResult,
  DEFAULT_CONSENSUS_THRESHOLD,
  DEFAULT_HOST_VOTING_ENABLED,
  MAX_VOTING_TIME_LIMIT_SECONDS,
  MIN_VOTING_TIME_LIMIT_SECONDS,
  createRoomSlug,
  createSlugCandidate,
  formatCustomScaleValues,
  getDeck,
  getVotingDeadlineMs,
  hasVotingTimeLimitExpired,
  isParticipantEligibleToVote,
  isParticipantFresh,
  normalizeDisplayName,
  normalizeConsensusThreshold,
  normalizeCustomScaleValues,
  normalizeVotingTimeLimitSeconds,
  normalizeRoomSlug,
  parseCustomScaleInput,
  resolveConsensusConfig,
  resolveCustomScaleValues,
  resolveHostVotingEnabled,
} from "./pointingPoker";

describe("pointingPoker helpers", () => {
  it("returns the expected deck for each scale", () => {
    expect(getDeck("fibonacci")).toEqual(["?", "1", "2", "3", "5", "8", "13", "21"]);
    expect(getDeck("powers_of_two")).toEqual(["?", "1", "2", "4", "8", "16", "32"]);
    expect(getDeck("t_shirt")).toEqual(["?", "XS", "S", "M", "L", "XL"]);
    expect(getDeck("custom", ["1", "2", "a"])).toEqual(["?", "1", "2", "a"]);
  });

  it("normalizes and formats custom scale values", () => {
    expect(parseCustomScaleInput(" 1, 2, a ")).toEqual(["1", "2", "a"]);
    expect(normalizeCustomScaleValues([" 1 ", "2", "a"])).toEqual(["1", "2", "a"]);
    expect(resolveCustomScaleValues("custom", ["1", "2", "a"])).toEqual(["1", "2", "a"]);
    expect(formatCustomScaleValues(["1", "2", "a"])).toBe("1, 2, a");
    expect(resolveCustomScaleValues("fibonacci", ["1", "2", "a"])).toBeUndefined();
  });

  it("rejects invalid custom scale values", () => {
    expect(() => normalizeCustomScaleValues(["1", "2"])).toThrow(
      `Custom scale must include at least ${CUSTOM_SCALE_MIN_VALUES} values`,
    );
    expect(() => normalizeCustomScaleValues(["1", "", "2"])).toThrow(
      "Custom scale values cannot be empty",
    );
    expect(() => normalizeCustomScaleValues(["1", "2", "?"])).toThrow(
      'Do not include "?" in custom scale values',
    );
    expect(() => normalizeCustomScaleValues(["1", "2", "AB"])).toThrow(
      "Custom scale values must be numbers or single characters",
    );
    expect(() => normalizeCustomScaleValues(["1", "2", "2"])).toThrow(
      "Custom scale values must be unique",
    );
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
      consensusReached: true,
    });
  });

  it("computes tie results and returns the top two tied values in descending order", () => {
    expect(computeRoundResult(["3", "8", "3", "8", "1"])).toEqual({
      resultType: "tie",
      resultValue: "8 / 3",
      consensusReached: false,
    });
    expect(computeRoundResult(["M", "XL", "M", "XL"])).toEqual({
      resultType: "tie",
      resultValue: "XL / M",
      consensusReached: false,
    });
    expect(computeRoundResult(["?", "?"])).toEqual({
      resultType: "tie",
      resultValue: null,
      consensusReached: false,
    });
  });

  it("does not mark a threshold result as consensus when the top vote misses the configured percentage", () => {
    expect(
      computeRoundResult(["8", "8", "5", "3"], {
        consensusMode: "threshold",
        consensusThreshold: 70,
      }),
    ).toEqual({
      resultType: "most_voted",
      resultValue: "8",
      consensusReached: false,
    });
  });

  it("treats 100 percent threshold as unanimous consensus", () => {
    expect(
      computeRoundResult(["?", "5", "5"], {
        consensusMode: "threshold",
        consensusThreshold: 100,
      }),
    ).toEqual({
      resultType: "most_voted",
      resultValue: "5",
      consensusReached: true,
    });
  });

  it("resolves legacy rooms to plurality with the default threshold", () => {
    expect(resolveConsensusConfig()).toEqual({
      consensusMode: "plurality",
      consensusThreshold: DEFAULT_CONSENSUS_THRESHOLD,
    });
  });

  it("defaults legacy rooms to host voting enabled", () => {
    expect(resolveHostVotingEnabled()).toBe(DEFAULT_HOST_VOTING_ENABLED);
  });

  it("excludes the host from voting when host voting is disabled", () => {
    expect(isParticipantEligibleToVote("guest", false)).toBe(true);
    expect(isParticipantEligibleToVote("viewer", true)).toBe(false);
    expect(isParticipantEligibleToVote("host", true)).toBe(true);
    expect(isParticipantEligibleToVote("host", false)).toBe(false);
  });

  it("validates threshold bounds", () => {
    expect(normalizeConsensusThreshold(51)).toBe(51);
    expect(normalizeConsensusThreshold(100)).toBe(100);
    expect(() => normalizeConsensusThreshold(50)).toThrow();
    expect(() => normalizeConsensusThreshold(101)).toThrow();
  });

  it("normalizes optional voting time limits", () => {
    expect(normalizeVotingTimeLimitSeconds()).toBeUndefined();
    expect(normalizeVotingTimeLimitSeconds(null)).toBeUndefined();
    expect(normalizeVotingTimeLimitSeconds(45.8)).toBe(45);
    expect(() => normalizeVotingTimeLimitSeconds(MIN_VOTING_TIME_LIMIT_SECONDS - 1)).toThrow();
    expect(() => normalizeVotingTimeLimitSeconds(MAX_VOTING_TIME_LIMIT_SECONDS + 1)).toThrow();
  });

  it("computes voting deadlines and expiry", () => {
    expect(getVotingDeadlineMs(1_000, undefined)).toBeNull();
    expect(getVotingDeadlineMs(1_000, 30)).toBe(31_000);
    expect(hasVotingTimeLimitExpired(1_000, 30, 30_999)).toBe(false);
    expect(hasVotingTimeLimitExpired(1_000, 30, 31_000)).toBe(true);
  });
});
