export const ACTIVE_PARTICIPANT_STALE_MS = 2 * 60 * 1000;

export const SCALE_TYPES = ["fibonacci", "powers_of_two", "t_shirt", "custom"] as const;
export type ScaleType = (typeof SCALE_TYPES)[number];
export const CUSTOM_SCALE_MIN_VALUES = 3;

export const CONSENSUS_MODES = ["plurality", "threshold"] as const;
export type ConsensusMode = (typeof CONSENSUS_MODES)[number];

export const DEFAULT_CONSENSUS_THRESHOLD = 70;
export const MIN_CONSENSUS_THRESHOLD = 51;
export const MAX_CONSENSUS_THRESHOLD = 100;
export const DEFAULT_HOST_VOTING_ENABLED = true;

export const ROOM_STATUSES = ["idle", "voting", "revealed"] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const ROUND_END_REASONS = ["all_voted", "forced"] as const;
export type RoundEndReason = (typeof ROUND_END_REASONS)[number];

export const RESULT_TYPES = ["most_voted", "tie"] as const;
export type ResultType = (typeof RESULT_TYPES)[number];

export const PARTICIPANT_KINDS = ["host", "guest", "viewer"] as const;
export type ParticipantKind = (typeof PARTICIPANT_KINDS)[number];

const FIBONACCI_DECK = ["?", "1", "2", "3", "5", "8", "13", "21"] as const;
const POWERS_OF_TWO_DECK = ["?", "1", "2", "4", "8", "16", "32"] as const;
const T_SHIRT_DECK = ["?", "XS", "S", "M", "L", "XL"] as const;
const CUSTOM_SCALE_NUMERIC_PATTERN = /^-?\d+(?:\.\d+)?$/;
const T_SHIRT_RANK = {
  XS: 1,
  S: 2,
  M: 3,
  L: 4,
  XL: 5,
} as const;

export interface ConsensusConfig {
  consensusMode: ConsensusMode;
  consensusThreshold: number;
}

export interface RoundResult {
  resultType: ResultType;
  resultValue: string | null;
  consensusReached: boolean;
}

export function resolveHostVotingEnabled(value?: boolean) {
  return value ?? DEFAULT_HOST_VOTING_ENABLED;
}

export function isGuestSessionParticipant(kind: ParticipantKind) {
  return kind === "guest" || kind === "viewer";
}

export function isParticipantEligibleToVote(kind: ParticipantKind, hostVotingEnabled?: boolean) {
  if (kind === "viewer") {
    return false;
  }

  if (kind === "guest") {
    return true;
  }

  return resolveHostVotingEnabled(hostVotingEnabled);
}

function isValidCustomScaleValue(value: string) {
  if (CUSTOM_SCALE_NUMERIC_PATTERN.test(value)) {
    return Number.isFinite(Number(value));
  }

  return Array.from(value).length === 1 && value !== "?";
}

export function normalizeCustomScaleValues(values: string[]) {
  const trimmedValues = values.map((value) => value.trim());
  const nonEmptyValues = trimmedValues.filter((value) => value.length > 0);

  if (nonEmptyValues.length !== trimmedValues.length) {
    throw new Error("Custom scale values cannot be empty");
  }

  if (nonEmptyValues.length < CUSTOM_SCALE_MIN_VALUES) {
    throw new Error(`Custom scale must include at least ${CUSTOM_SCALE_MIN_VALUES} values`);
  }

  if (nonEmptyValues.includes("?")) {
    throw new Error('Do not include "?" in custom scale values');
  }

  const uniqueValues = new Set<string>();

  for (const value of nonEmptyValues) {
    if (!isValidCustomScaleValue(value)) {
      throw new Error("Custom scale values must be numbers or single characters");
    }

    if (uniqueValues.has(value)) {
      throw new Error("Custom scale values must be unique");
    }

    uniqueValues.add(value);
  }

  return nonEmptyValues;
}

export function parseCustomScaleInput(value: string) {
  return normalizeCustomScaleValues(value.split(","));
}

export function formatCustomScaleValues(values?: string[]) {
  return values?.join(", ") ?? "";
}

export function resolveCustomScaleValues(scaleType: ScaleType, customScaleValues?: string[]) {
  if (scaleType !== "custom") {
    return undefined;
  }

  return normalizeCustomScaleValues(customScaleValues ?? []);
}

export function getDeck(scaleType: ScaleType, customScaleValues?: string[]) {
  if (scaleType === "custom") {
    const resolvedCustomScaleValues = resolveCustomScaleValues(scaleType, customScaleValues);
    return ["?", ...(resolvedCustomScaleValues ?? [])];
  }
  if (scaleType === "powers_of_two") {
    return [...POWERS_OF_TWO_DECK] as string[];
  }
  if (scaleType === "t_shirt") {
    return [...T_SHIRT_DECK] as string[];
  }
  return [...FIBONACCI_DECK] as string[];
}

export function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function createSlugCandidate(name: string) {
  const base = normalizeDisplayName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "room";
}

export function normalizeRoomSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createRoomSlug() {
  return crypto.randomUUID();
}

export function createGuestToken() {
  return crypto.randomUUID();
}

export function hashGuestToken(token: string) {
  return token.trim();
}

export function isParticipantFresh(lastSeenAt: number, now = Date.now()) {
  return now - lastSeenAt <= ACTIVE_PARTICIPANT_STALE_MS;
}

export function normalizeConsensusThreshold(value: number) {
  const threshold = Math.trunc(value);

  if (threshold < MIN_CONSENSUS_THRESHOLD || threshold > MAX_CONSENSUS_THRESHOLD) {
    throw new Error(
      `Consensus threshold must be between ${MIN_CONSENSUS_THRESHOLD} and ${MAX_CONSENSUS_THRESHOLD}`,
    );
  }

  return threshold;
}

export function resolveConsensusConfig(config?: Partial<ConsensusConfig>): ConsensusConfig {
  return {
    consensusMode: config?.consensusMode ?? "plurality",
    consensusThreshold: normalizeConsensusThreshold(
      config?.consensusThreshold ?? DEFAULT_CONSENSUS_THRESHOLD,
    ),
  };
}

export function computeRoundResult(values: string[], config?: Partial<ConsensusConfig>): RoundResult {
  const consensusConfig = resolveConsensusConfig(config);
  const counts = new Map<string, number>();
  let eligibleVotes = 0;

  for (const value of values) {
    if (value === "?") {
      continue;
    }
    eligibleVotes += 1;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return {
      resultType: "tie" as const,
      resultValue: null,
      consensusReached: false,
    };
  }

  let maxCount = 0;
  let winners: string[] = [];

  for (const [value, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      winners = [value];
      continue;
    }
    if (count === maxCount) {
      winners.push(value);
    }
  }

  if (winners.length !== 1) {
    const allNumeric = winners.every((value) => Number.isFinite(Number(value)));
    const allTShirt = winners.every((value) => value in T_SHIRT_RANK);
    let sortedWinners = [...winners];

    if (allNumeric) {
      sortedWinners = sortedWinners.sort((left, right) => Number(right) - Number(left));
    } else if (allTShirt) {
      sortedWinners = sortedWinners.sort(
        (left, right) =>
          T_SHIRT_RANK[right as keyof typeof T_SHIRT_RANK] -
          T_SHIRT_RANK[left as keyof typeof T_SHIRT_RANK],
      );
    } else {
      sortedWinners = sortedWinners.sort((left, right) => right.localeCompare(left));
    }

    const tieValues = sortedWinners.slice(0, 2).join(" / ");

    return {
      resultType: "tie" as const,
      resultValue: tieValues || null,
      consensusReached: false,
    };
  }

  const winner = winners[0];
  const winnerCount = counts.get(winner) ?? 0;
  const consensusReached =
    consensusConfig.consensusMode === "plurality"
      ? true
      : eligibleVotes > 0 &&
        winnerCount / eligibleVotes >= consensusConfig.consensusThreshold / 100;

  return {
    resultType: "most_voted" as const,
    resultValue: winner,
    consensusReached,
  };
}
