import { useEffect, useRef, useState } from "react";

import {
  formatCustomScaleValues,
  parseCustomScaleInput,
  type ConsensusMode,
  type ScaleType,
} from "@palatro/backend/convex/pointingPoker";

import { Button } from "@/components/ui/button";
import { useAppSound } from "@/hooks/use-app-sound";
import { Input } from "@/components/ui/input";
import {
  CONSENSUS_THRESHOLD_PRESETS,
  DEFAULT_CONSENSUS_THRESHOLD,
  getConsensusThresholdForStep,
  getConsensusThresholdStepIndex,
} from "@/lib/consensus";
import { select008Sound } from "@/lib/select-008";
import { cn } from "@/lib/utils";
import {
  formatVotingTimeLimitLabel,
  getVotingTimeLimitForStep,
  getVotingTimeLimitStepIndex,
  VOTING_TIME_LIMIT_OPTION_VALUES,
} from "@/lib/voting-time-limit";

interface RoomConfigPanelProps {
  scaleType: ScaleType;
  customScaleValues?: string[];
  consensusMode: ConsensusMode;
  consensusThreshold: number;
  hostVotingEnabled: boolean;
  votingTimeLimitSeconds?: number | null;
  hasPassword: boolean;
  allowPassword?: boolean;
  disabled?: boolean;
  statusMessage?: string;
  onUpdateConfig: (values: {
    scaleType: ScaleType;
    customScaleValues?: string[];
    consensusMode: ConsensusMode;
    consensusThreshold: number;
    hostVotingEnabled: boolean;
    votingTimeLimitSeconds?: number;
  }) => Promise<void>;
  onUpdatePassword: (password: string | undefined) => Promise<void>;
}

const SCALE_OPTIONS: Array<{ label: string; value: ScaleType; desc: string; icon: string }> = [
  { label: "Fibonacci", value: "fibonacci", desc: "1, 2, 3, 5, 8, 13, 21", icon: "\u2665" },
  { label: "Power of Two", value: "powers_of_two", desc: "1, 2, 4, 8, 16, 32", icon: "\u2666" },
  { label: "T-Shirt", value: "t_shirt", desc: "XS, S, M, L, XL", icon: "\u2663" },
  { label: "Custom", value: "custom", desc: "Numbers or single characters", icon: "\u2660" },
];

export default function RoomConfigPanel({
  scaleType,
  customScaleValues,
  consensusMode,
  consensusThreshold,
  hostVotingEnabled,
  votingTimeLimitSeconds,
  hasPassword,
  allowPassword = true,
  disabled = false,
  statusMessage,
  onUpdateConfig,
  onUpdatePassword,
}: RoomConfigPanelProps) {
  const playHoverSound = useAppSound(select008Sound, { volumeMultiplier: 0.1 });
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [draftScaleType, setDraftScaleType] = useState(scaleType);
  const [draftCustomScaleValues, setDraftCustomScaleValues] = useState(customScaleValues);
  const [customScaleInput, setCustomScaleInput] = useState(formatCustomScaleValues(customScaleValues));
  const [customScaleTouched, setCustomScaleTouched] = useState(false);
  const [isDraftingCustomScale, setIsDraftingCustomScale] = useState(false);
  const [draftConsensusMode, setDraftConsensusMode] = useState(consensusMode);
  const [draftConsensusThreshold, setDraftConsensusThreshold] = useState(consensusThreshold);
  const [draftHostVotingEnabled, setDraftHostVotingEnabled] = useState(hostVotingEnabled);
  const [draftVotingTimeLimitSeconds, setDraftVotingTimeLimitSeconds] = useState<number | undefined>(
    votingTimeLimitSeconds ?? undefined,
  );
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const firstConsensusThreshold = CONSENSUS_THRESHOLD_PRESETS[0];
  const lastConsensusThreshold = CONSENSUS_THRESHOLD_PRESETS[CONSENSUS_THRESHOLD_PRESETS.length - 1];
  const firstVotingTimeLimit = VOTING_TIME_LIMIT_OPTION_VALUES[0];
  const lastVotingTimeLimit = VOTING_TIME_LIMIT_OPTION_VALUES[VOTING_TIME_LIMIT_OPTION_VALUES.length - 1];

  useEffect(() => {
    if (!isEditingPassword) {
      return;
    }
    passwordInputRef.current?.focus();
  }, [isEditingPassword]);

  useEffect(() => {
    setDraftScaleType(scaleType);
    setIsDraftingCustomScale(false);
  }, [scaleType]);

  useEffect(() => {
    setDraftCustomScaleValues(customScaleValues);
    setCustomScaleInput(formatCustomScaleValues(customScaleValues));
    setCustomScaleTouched(false);
  }, [customScaleValues]);

  useEffect(() => {
    setDraftConsensusMode(consensusMode);
  }, [consensusMode]);

  useEffect(() => {
    setDraftConsensusThreshold(consensusThreshold);
  }, [consensusThreshold]);

  useEffect(() => {
    setDraftHostVotingEnabled(hostVotingEnabled);
  }, [hostVotingEnabled]);

  useEffect(() => {
    const nextVotingTimeLimitSeconds = votingTimeLimitSeconds ?? undefined;
    setDraftVotingTimeLimitSeconds(nextVotingTimeLimitSeconds);
  }, [votingTimeLimitSeconds]);

  async function submitConfig(nextValues: {
    scaleType?: ScaleType;
    customScaleValues?: string[];
    consensusMode?: ConsensusMode;
    consensusThreshold?: number;
    hostVotingEnabled?: boolean;
    votingTimeLimitSeconds?: number;
  }) {
    const nextScaleType = nextValues.scaleType ?? draftScaleType;
    const hasVotingTimeLimitOverride = Object.prototype.hasOwnProperty.call(
      nextValues,
      "votingTimeLimitSeconds",
    );
    const payload = {
      scaleType: nextScaleType,
      customScaleValues: nextScaleType === "custom"
        ? (nextValues.customScaleValues ?? draftCustomScaleValues)
        : undefined,
      consensusMode: nextValues.consensusMode ?? draftConsensusMode,
      consensusThreshold: nextValues.consensusThreshold ?? draftConsensusThreshold,
      hostVotingEnabled: nextValues.hostVotingEnabled ?? draftHostVotingEnabled,
      votingTimeLimitSeconds: hasVotingTimeLimitOverride
        ? nextValues.votingTimeLimitSeconds
        : draftVotingTimeLimitSeconds,
    };

    if (
      payload.scaleType === draftScaleType &&
      payload.consensusMode === draftConsensusMode &&
      payload.consensusThreshold === draftConsensusThreshold &&
      payload.hostVotingEnabled === draftHostVotingEnabled &&
      payload.votingTimeLimitSeconds === draftVotingTimeLimitSeconds &&
      JSON.stringify(payload.customScaleValues ?? []) === JSON.stringify(draftCustomScaleValues ?? [])
    ) {
      return;
    }

    setDraftScaleType(payload.scaleType);
    setDraftCustomScaleValues(payload.customScaleValues);
    setDraftConsensusMode(payload.consensusMode);
    setDraftConsensusThreshold(payload.consensusThreshold);
    setDraftHostVotingEnabled(payload.hostVotingEnabled);
    setDraftVotingTimeLimitSeconds(payload.votingTimeLimitSeconds);
    await onUpdateConfig(payload);
  }

  const isCustomScaleSelected = draftScaleType === "custom" || isDraftingCustomScale;
  let parsedCustomScaleValues: string[] | undefined;
  let customScaleError: string | null = null;

  if (isCustomScaleSelected && customScaleInput.trim().length > 0) {
    try {
      parsedCustomScaleValues = parseCustomScaleInput(customScaleInput);
    } catch (error) {
      customScaleError = error instanceof Error ? error.message : "Invalid custom scale";
    }
  }

  const customScaleValidationMessage = customScaleTouched
    ? (customScaleError ?? (isCustomScaleSelected && !parsedCustomScaleValues ? "Enter at least 3 comma-separated values." : null))
    : null;

  const scaleSummary = draftScaleType === "custom"
    ? draftCustomScaleValues?.length
      ? `Custom ${draftCustomScaleValues.join(", ")}`
      : "Custom scale"
    : SCALE_OPTIONS.find((option) => option.value === draftScaleType)?.label ?? "Unknown";
  const consensusSummary = draftConsensusMode === "threshold"
    ? `Threshold at ${draftConsensusThreshold}%`
    : "Most voted wins";
  const timerSummary = draftVotingTimeLimitSeconds === undefined
    ? "Off"
    : formatVotingTimeLimitLabel(draftVotingTimeLimitSeconds);
  const hostSummary = draftHostVotingEnabled ? "Host votes" : "Host only";
  const passwordSummary = hasPassword ? "Protected" : "Open";
  const editorStatusMessage = statusMessage ?? (disabled
    ? "Finish the current round to change configuration"
    : "Changes apply instantly");

  function toggleEditor() {
    if (isEditorOpen) {
      setIsEditorOpen(false);
      setIsDraftingCustomScale(false);
      setCustomScaleTouched(false);
      setCustomScaleInput(formatCustomScaleValues(draftCustomScaleValues));
      setIsEditingPassword(false);
      setPasswordDraft("");
      return;
    }

    setIsEditorOpen(true);
  }

  return (
    <div className="grid gap-5">

      {isEditorOpen && <p className="mt-1.5 w-full inline-flex items-center gap-1.5 rounded-full border border-white/6 bg-white/3 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground/50">
          <span className="h-1 w-1 rounded-full bg-current opacity-60" />
          {editorStatusMessage}
        </p>}
      {!isEditorOpen ? (
        <div className="grid min-w-0 gap-4 overflow-hidden rounded-[1.75rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          {/* Header — stacked to avoid wrapping in narrow sidebar */}
          <div className="grid min-w-0 gap-3">
            <div className="min-w-0">
              <p className="ornate-label wrap-break-words text-muted-foreground/70">Current configuration</p>
              
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="w-full rounded-full px-4 text-[0.65rem] uppercase tracking-[0.14em]"
              onClick={toggleEditor}
            >
              Edit configuration
            </Button>
          </div>

          <div className="gold-rule" />

          {/* Config tiles */}
          <div className="grid min-w-0 gap-2 sm:grid-cols-2">
            <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-white/[0.06] bg-black/20 px-3.5 py-3">
              <span className="mt-0.5 text-sm text-primary/30">{"♠"}</span>
              <div className="min-w-0">
                <p className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground/45">Scale</p>
                <p className="mt-0.5 break-words text-sm font-medium text-foreground">{scaleSummary}</p>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-white/[0.06] bg-black/20 px-3.5 py-3">
              <span className="mt-0.5 text-sm text-primary/30">{"♦"}</span>
              <div className="min-w-0">
                <p className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground/45">Consensus</p>
                <p className="mt-0.5 break-words text-sm font-medium text-foreground">{consensusSummary}</p>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-white/[0.06] bg-black/20 px-3.5 py-3">
              <span className="mt-0.5 text-sm text-primary/30">{"♣"}</span>
              <div className="min-w-0">
                <p className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground/45">Voting timer</p>
                <p className="mt-0.5 break-words text-sm font-medium text-foreground">{timerSummary}</p>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-white/[0.06] bg-black/20 px-3.5 py-3">
              <span className="mt-0.5 text-sm text-primary/30">{"♥"}</span>
              <div className="min-w-0">
                <p className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground/45">Host role</p>
                <p className="mt-0.5 break-words text-sm font-medium text-foreground">{hostSummary}</p>
              </div>
            </div>
            {allowPassword ? (
              <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-white/[0.06] bg-black/20 px-3.5 py-3 sm:col-span-2">
                <span className="mt-0.5 text-sm text-primary/30">{"♠"}</span>
                <div className="min-w-0">
                  <p className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground/45">Room password</p>
                  <p className="mt-0.5 break-words text-sm font-medium text-foreground">{passwordSummary}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="w-full rounded-full px-4 text-[0.65rem] uppercase tracking-[0.14em]"
            onClick={toggleEditor}
          >
            Hide editor
          </Button>
        </div>
      )}

      {isEditorOpen ? (
        <div className="grid gap-3">
          {/* Scale type */}
          <div className="grid gap-3">
            <div className="gold-rule" />
            <p className="ornate-label text-muted-foreground/70">Point scale</p>
            <div className="grid gap-2">
              {SCALE_OPTIONS.map((option) => {
                const isActive = option.value === "custom" ? isCustomScaleSelected : draftScaleType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    onMouseEnter={() => {
                      if (!disabled) {
                        playHoverSound();
                      }
                    }}
                    onClick={() => {
                      if (option.value === "custom") {
                        setIsDraftingCustomScale(true);
                        return;
                      }

                      setIsDraftingCustomScale(false);
                      void submitConfig({ scaleType: option.value });
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200",
                      "cursor-pointer disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
                      isActive
                        ? "border-primary/25 bg-primary/[0.06] text-foreground"
                        : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.1] hover:bg-white/[0.04]",
                    )}
                  >
                    <span className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm transition-colors",
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "bg-white/[0.04] text-muted-foreground/50",
                    )}>
                      {option.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-[0.65rem] font-mono tracking-wider text-muted-foreground/60">{option.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            {isCustomScaleSelected ? (
              <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="grid gap-2">
                  <label
                    htmlFor="room-custom-scale-values"
                    className="text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-foreground/70"
                  >
                    Custom scale values
                  </label>
                  <Input
                    id="room-custom-scale-values"
                    name="roomCustomScaleValues"
                    value={customScaleInput}
                    disabled={disabled}
                    onBlur={() => setCustomScaleTouched(true)}
                    onChange={(event) => {
                      setCustomScaleInput(event.target.value);
                      if (!customScaleTouched && event.target.value.trim().length > 0) {
                        setCustomScaleTouched(true);
                      }
                    }}
                    placeholder="1, 2, 3"
                    className="bg-black/10"
                  />
                  <p className="text-xs text-muted-foreground/70">
                    Enter at least 3 comma-separated values. Use numbers or single characters.
                    {" "}
                    {"?"}
                    {" "}
                    is always added first.
                  </p>
                  {customScaleValidationMessage ? (
                    <p className="text-xs text-destructive">{customScaleValidationMessage}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  disabled={disabled || !parsedCustomScaleValues}
                  onClick={() => {
                    setCustomScaleTouched(true);
                    if (!parsedCustomScaleValues) {
                      return;
                    }

                    setIsDraftingCustomScale(false);
                    void submitConfig({
                      scaleType: "custom",
                      customScaleValues: parsedCustomScaleValues,
                    });
                  }}
                >
                  Apply custom scale
                </Button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3">
            <div className="gold-rule" />
            <p className="ornate-label text-muted-foreground/70">Consensus rule</p>
            <div className="grid gap-2">
              <button
                type="button"
                disabled={disabled}
                onMouseEnter={() => {
                  if (!disabled) {
                    playHoverSound();
                  }
                }}
                onClick={() => {
                  void submitConfig({ consensusMode: "plurality" });
                }}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200",
                  "cursor-pointer disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
                  draftConsensusMode === "plurality"
                    ? "border-primary/25 bg-primary/[0.06] text-foreground"
                    : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.1] hover:bg-white/[0.04]",
                )}
              >
                <span className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm transition-colors",
                  draftConsensusMode === "plurality"
                    ? "bg-primary/20 text-primary"
                    : "bg-white/[0.04] text-muted-foreground/50",
                )}>
                  {"#"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Most voted</p>
                  <p className="text-[0.65rem] text-muted-foreground/60">
                    Reveal the unique top card even if it does not reach a majority.
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={disabled}
                onMouseEnter={() => {
                  if (!disabled) {
                    playHoverSound();
                  }
                }}
                onClick={() => {
                  void submitConfig({ consensusMode: "threshold" });
                }}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200",
                  "cursor-pointer disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
                  draftConsensusMode === "threshold"
                    ? "border-primary/25 bg-primary/[0.06] text-foreground"
                    : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.1] hover:bg-white/[0.04]",
                )}
              >
                <span className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm transition-colors",
                  draftConsensusMode === "threshold"
                    ? "bg-primary/20 text-primary"
                    : "bg-white/[0.04] text-muted-foreground/50",
                )}>
                  {"%"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Consensus threshold</p>
                  <p className="text-[0.65rem] text-muted-foreground/60">
                    Require one card to reach a minimum share of non-? votes.
                  </p>
                </div>
              </button>
            </div>

            {draftConsensusMode === "threshold" ? (
              <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                    Required agreement
                  </p>
                  <span className="rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-[0.7rem] uppercase tracking-[0.12em] text-foreground">
                    {draftConsensusThreshold}%
                    {draftConsensusThreshold === DEFAULT_CONSENSUS_THRESHOLD ? " Recommended" : ""}
                  </span>
                </div>
                <input
                  aria-label="Consensus threshold"
                  name="roomConsensusThreshold"
                  type="range"
                  min={0}
                  max={CONSENSUS_THRESHOLD_PRESETS.length - 1}
                  step={1}
                  disabled={disabled}
                  value={getConsensusThresholdStepIndex(draftConsensusThreshold)}
                  onChange={(event) => {
                    void submitConfig({
                      consensusThreshold: getConsensusThresholdForStep(Number(event.target.value)),
                    });
                  }}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-40"
                />
                <div
                  data-testid="room-consensus-threshold-mobile-labels"
                  className="grid grid-cols-3 gap-2 text-center text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground/60 sm:hidden"
                >
                  <span>{firstConsensusThreshold}%</span>
                  <span className="font-medium text-primary">{draftConsensusThreshold}%</span>
                  <span>{lastConsensusThreshold}%</span>
                </div>
                <div
                  data-testid="room-consensus-threshold-desktop-labels"
                  className="hidden grid-cols-5 gap-2 text-center text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground/60 sm:grid"
                >
                  {CONSENSUS_THRESHOLD_PRESETS.map((value) => (
                    <span
                      key={value}
                      className={cn(value === draftConsensusThreshold && "text-primary")}
                    >
                      {value}%
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3">
            <div className="gold-rule" />
            <p className="ornate-label text-muted-foreground/70">Voting timer</p>
            <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={disabled}
                  onMouseEnter={() => {
                    if (!disabled) {
                      playHoverSound();
                    }
                  }}
                  onClick={() => {
                    void submitConfig({ votingTimeLimitSeconds: undefined });
                  }}
                  className={cn(
                    "cursor-pointer rounded-full border px-4 py-2 text-[0.72rem] font-medium uppercase tracking-[0.12em] transition-all duration-200 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
                    draftVotingTimeLimitSeconds === undefined
                      ? "border-primary/25 bg-primary/[0.06] text-foreground"
                      : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.1] hover:bg-white/[0.04]",
                  )}
                >
                  Timer off
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onMouseEnter={() => {
                    if (!disabled) {
                      playHoverSound();
                    }
                  }}
                  onClick={() => {
                    void submitConfig({ votingTimeLimitSeconds: draftVotingTimeLimitSeconds ?? 45 });
                  }}
                  className={cn(
                    "cursor-pointer rounded-full border px-4 py-2 text-[0.72rem] font-medium uppercase tracking-[0.12em] transition-all duration-200 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
                    draftVotingTimeLimitSeconds !== undefined
                      ? "border-primary/25 bg-primary/[0.06] text-foreground"
                      : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.1] hover:bg-white/[0.04]",
                  )}
                >
                  Timer on
                </button>
              </div>

              {draftVotingTimeLimitSeconds !== undefined ? (
                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                      Time limit
                    </p>
                    <span className="rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-[0.7rem] uppercase tracking-[0.12em] text-foreground">
                      {formatVotingTimeLimitLabel(draftVotingTimeLimitSeconds)}
                    </span>
                  </div>
                  <input
                    aria-label="Voting time limit"
                    name="roomVotingTimeLimit"
                    type="range"
                    min={0}
                    max={VOTING_TIME_LIMIT_OPTION_VALUES.length - 1}
                    step={1}
                    disabled={disabled}
                    value={getVotingTimeLimitStepIndex(draftVotingTimeLimitSeconds)}
                    onChange={(event) => {
                      void submitConfig({
                        votingTimeLimitSeconds: getVotingTimeLimitForStep(Number(event.target.value)),
                      });
                    }}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-40"
                  />
                  <div
                    data-testid="room-voting-time-limit-mobile-labels"
                    className="grid grid-cols-3 gap-2 text-center text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground/60 sm:hidden"
                  >
                    <span>{firstVotingTimeLimit}</span>
                    <span className="font-medium text-primary">{draftVotingTimeLimitSeconds}</span>
                    <span>{lastVotingTimeLimit}</span>
                  </div>
                  <div
                    data-testid="room-voting-time-limit-desktop-labels"
                    className="hidden grid-cols-6 gap-2 text-center text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground/60 sm:grid"
                  >
                    {VOTING_TIME_LIMIT_OPTION_VALUES.map((value) => (
                      <span
                        key={value}
                        className={cn(value === draftVotingTimeLimitSeconds && "text-primary")}
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground/70">
                    When time is up, anyone without a card is counted as {"?"}.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="gold-rule" />
            <p className="ornate-label text-muted-foreground/70">Host role</p>
            <div className="grid gap-2">
              <button
                type="button"
                disabled={disabled}
                onMouseEnter={() => {
                  if (!disabled) {
                    playHoverSound();
                  }
                }}
                onClick={() => {
                  void submitConfig({ hostVotingEnabled: true });
                }}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200",
                  "cursor-pointer disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
                  draftHostVotingEnabled
                    ? "border-primary/25 bg-primary/[0.06] text-foreground"
                    : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.1] hover:bg-white/[0.04]",
                )}
              >
                <span className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm transition-colors",
                  draftHostVotingEnabled
                    ? "bg-primary/20 text-primary"
                    : "bg-white/[0.04] text-muted-foreground/50",
                )}>
                  {"\u2660"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Host votes</p>
                  <p className="text-[0.65rem] text-muted-foreground/60">
                    Dealer gets a card and counts toward reveal and consensus.
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={disabled}
                onMouseEnter={() => {
                  if (!disabled) {
                    playHoverSound();
                  }
                }}
                onClick={() => {
                  void submitConfig({ hostVotingEnabled: false });
                }}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200",
                  "cursor-pointer disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
                  !draftHostVotingEnabled
                    ? "border-primary/25 bg-primary/[0.06] text-foreground"
                    : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.1] hover:bg-white/[0.04]",
                )}
              >
                <span className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm transition-colors",
                  !draftHostVotingEnabled
                    ? "bg-primary/20 text-primary"
                    : "bg-white/[0.04] text-muted-foreground/50",
                )}>
                  {"\u2663"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Host only</p>
                  <p className="text-[0.65rem] text-muted-foreground/60">
                    Dealer manages the table without voting or affecting consensus.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Room password */}
          {allowPassword ? (
            <div className="grid gap-3">
              <div className="gold-rule" />
              <p className="ornate-label text-muted-foreground/70">Room password</p>

              {!isEditingPassword ? (
                <div className="grid gap-2">
                  <div className={cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200",
                    hasPassword
                      ? "border-primary/25 bg-primary/[0.06]"
                      : "border-white/[0.06] bg-white/[0.02]",
                  )}>
                    <span className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm",
                      hasPassword
                        ? "bg-primary/20 text-primary"
                        : "bg-white/[0.04] text-muted-foreground/50",
                    )}>
                      {hasPassword ? "\u2660" : "\u2663"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {hasPassword ? "Password protected" : "No password"}
                      </p>
                      <p className="text-[0.65rem] text-muted-foreground/60">
                        {hasPassword
                          ? "Guests must enter the password to join"
                          : "Anyone with the link can join"}
                      </p>
                    </div>
                  </div>

                  <div
                    data-testid="room-password-actions"
                    className="flex flex-col gap-2 sm:flex-row"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled || isSaving}
                      className="flex-1 text-[0.65rem] uppercase tracking-[0.14em]"
                      onClick={() => {
                        setPasswordDraft("");
                        setIsEditingPassword(true);
                      }}
                    >
                      {hasPassword ? "Change password" : "Set password"}
                    </Button>
                    {hasPassword ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled || isSaving}
                        className="flex-1 text-[0.65rem] uppercase tracking-[0.14em] text-destructive hover:text-destructive"
                        onClick={async () => {
                          setIsSaving(true);
                          try {
                            await onUpdatePassword(undefined);
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                      >
                        Remove password
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <form
                  className="grid gap-2"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const trimmed = passwordDraft.trim();
                    if (!trimmed) return;

                    setIsSaving(true);
                    try {
                      await onUpdatePassword(trimmed);
                      setIsEditingPassword(false);
                      setPasswordDraft("");
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                >
                  <Input
                    ref={passwordInputRef}
                    name="roomPasswordDraft"
                    type="password"
                    value={passwordDraft}
                    onChange={(event) => setPasswordDraft(event.target.value)}
                    placeholder="Enter new password"
                    className="bg-black/10"
                    autoComplete="new-password"
                  />
                  <div
                    data-testid="room-password-editor-actions"
                    className="flex flex-col gap-2 sm:flex-row"
                  >
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSaving || !passwordDraft.trim()}
                      className="flex-1"
                    >
                      {isSaving ? "Saving..." : "Save password"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isSaving}
                      className="flex-1"
                      onClick={() => {
                        setIsEditingPassword(false);
                        setPasswordDraft("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
