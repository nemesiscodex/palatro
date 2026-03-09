import {
  DEFAULT_CONSENSUS_THRESHOLD,
  MAX_CONSENSUS_THRESHOLD,
  MIN_CONSENSUS_THRESHOLD,
} from "@palatro/backend/convex/pointingPoker";

export const CONSENSUS_THRESHOLD_PRESETS = [51, 60, 70, 80, 100] as const;

export function isPresetConsensusThreshold(value: number) {
  return CONSENSUS_THRESHOLD_PRESETS.includes(value as (typeof CONSENSUS_THRESHOLD_PRESETS)[number]);
}

export function getConsensusThresholdStepIndex(value: number) {
  const index = CONSENSUS_THRESHOLD_PRESETS.indexOf(
    value as (typeof CONSENSUS_THRESHOLD_PRESETS)[number],
  );

  return index >= 0 ? index : CONSENSUS_THRESHOLD_PRESETS.indexOf(DEFAULT_CONSENSUS_THRESHOLD);
}

export function getConsensusThresholdForStep(step: number) {
  return CONSENSUS_THRESHOLD_PRESETS[
    Math.min(Math.max(step, 0), CONSENSUS_THRESHOLD_PRESETS.length - 1)
  ];
}

export function normalizeConsensusThresholdInput(value: string) {
  if (!/^\d+$/.test(value.trim())) {
    return null;
  }

  const threshold = Number.parseInt(value, 10);
  if (threshold < MIN_CONSENSUS_THRESHOLD || threshold > MAX_CONSENSUS_THRESHOLD) {
    return null;
  }

  return threshold;
}

export {
  DEFAULT_CONSENSUS_THRESHOLD,
  MAX_CONSENSUS_THRESHOLD,
  MIN_CONSENSUS_THRESHOLD,
};
