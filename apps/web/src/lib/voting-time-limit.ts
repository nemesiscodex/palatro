export const VOTING_TIME_LIMIT_OPTION_VALUES = [15, 30, 45, 60, 75, 90] as const;

export function isVotingTimeLimitPreset(value?: number | null) {
  return value !== undefined &&
    value !== null &&
    VOTING_TIME_LIMIT_OPTION_VALUES.includes(value as (typeof VOTING_TIME_LIMIT_OPTION_VALUES)[number]);
}

export function formatVotingTimeLimitLabel(value?: number | null) {
  if (value === undefined || value === null) {
    return "No limit";
  }

  if (value === 60) {
    return "1 minute";
  }

  if (value < 60) {
    return `${value} seconds`;
  }

  return `${value} sec`;
}

export function formatVotingCountdown(remainingSeconds: number) {
  if (remainingSeconds <= 60) {
    return `${remainingSeconds}s left`;
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")} left`;
}

export function getVotingTimeLimitForStep(step: number) {
  const index = Math.max(0, Math.min(VOTING_TIME_LIMIT_OPTION_VALUES.length - 1, Math.trunc(step)));
  return VOTING_TIME_LIMIT_OPTION_VALUES[index];
}

export function getVotingTimeLimitStepIndex(value?: number | null) {
  if (value === undefined || value === null) {
    return 0;
  }

  const exactIndex = VOTING_TIME_LIMIT_OPTION_VALUES.indexOf(
    value as (typeof VOTING_TIME_LIMIT_OPTION_VALUES)[number],
  );

  if (exactIndex >= 0) {
    return exactIndex;
  }

  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const [index, option] of VOTING_TIME_LIMIT_OPTION_VALUES.entries()) {
    const distance = Math.abs(option - value);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }

  return nearestIndex;
}
