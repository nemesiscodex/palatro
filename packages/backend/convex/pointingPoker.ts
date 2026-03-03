export const ACTIVE_PARTICIPANT_STALE_MS = 2 * 60 * 1000;

export const SCALE_TYPES = ["fibonacci", "powers_of_two"] as const;
export type ScaleType = (typeof SCALE_TYPES)[number];

export const ROOM_STATUSES = ["idle", "voting", "revealed"] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const ROUND_END_REASONS = ["all_voted", "forced"] as const;
export type RoundEndReason = (typeof ROUND_END_REASONS)[number];

export const RESULT_TYPES = ["most_voted", "tie"] as const;
export type ResultType = (typeof RESULT_TYPES)[number];

const FIBONACCI_DECK = ["?", "1", "2", "3", "5", "8", "13", "21"] as const;
const POWERS_OF_TWO_DECK = ["?", "1", "2", "4", "8", "16", "32"] as const;

export function getDeck(scaleType: ScaleType) {
  return (scaleType === "powers_of_two" ? [...POWERS_OF_TWO_DECK] : [...FIBONACCI_DECK]) as string[];
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

export function createGuestToken() {
  return crypto.randomUUID();
}

export function hashGuestToken(token: string) {
  return token.trim();
}

export function isParticipantFresh(lastSeenAt: number, now = Date.now()) {
  return now - lastSeenAt <= ACTIVE_PARTICIPANT_STALE_MS;
}

export function computeRoundResult(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    if (value === "?") {
      continue;
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return {
      resultType: "tie" as const,
      resultValue: null,
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
    const tieValues = winners
      .map((value) => Number(value))
      .sort((left, right) => right - left)
      .slice(0, 2)
      .map((value) => String(value))
      .join(" / ");

    return {
      resultType: "tie" as const,
      resultValue: tieValues || null,
    };
  }

  return {
    resultType: "most_voted" as const,
    resultValue: winners[0],
  };
}
