import { useState } from "react";

import {
  parseCustomScaleInput,
  type ConsensusMode,
  type ScaleType,
} from "@palatro/backend/convex/pointingPoker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CONSENSUS_THRESHOLD_PRESETS,
  DEFAULT_CONSENSUS_THRESHOLD,
  getConsensusThresholdForStep,
  getConsensusThresholdStepIndex,
} from "@/lib/consensus";
import { cn } from "@/lib/utils";
import {
  formatVotingTimeLimitLabel,
  getVotingTimeLimitForStep,
  getVotingTimeLimitStepIndex,
  VOTING_TIME_LIMIT_OPTION_VALUES,
} from "@/lib/voting-time-limit";

const SCALE_OPTIONS: Array<{ label: string; value: ScaleType; icon: string }> = [
  { label: "Fibonacci", value: "fibonacci", icon: "\u2660" },
  { label: "Power of Two", value: "powers_of_two", icon: "\u2666" },
  { label: "T-Shirt", value: "t_shirt", icon: "\u2663" },
  { label: "Custom", value: "custom", icon: "\u2665" },
];

interface CreateRoomFormProps {
  mode?: "registered" | "guest";
  onCreateRoom: (values: {
    name: string;
    scaleType: ScaleType;
    customScaleValues?: string[];
    consensusMode: ConsensusMode;
    consensusThreshold: number;
    hostVotingEnabled: boolean;
    votingTimeLimitSeconds?: number;
    password?: string;
    slug?: string;
  }) => Promise<void>;
}

export default function CreateRoomForm({
  mode = "registered",
  onCreateRoom,
}: CreateRoomFormProps) {
  const [name, setName] = useState("");
  const [scaleType, setScaleType] = useState<ScaleType>("fibonacci");
  const [consensusMode, setConsensusMode] = useState<ConsensusMode>("plurality");
  const [consensusThreshold, setConsensusThreshold] = useState(DEFAULT_CONSENSUS_THRESHOLD);
  const [hostVotingEnabled, setHostVotingEnabled] = useState(true);
  const [votingTimeLimitSeconds, setVotingTimeLimitSeconds] = useState<number | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [customScaleInput, setCustomScaleInput] = useState("");
  const [customScaleTouched, setCustomScaleTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isGuestMode = mode === "guest";
  const isCustomScale = scaleType === "custom";
  const firstVotingTimeLimit = VOTING_TIME_LIMIT_OPTION_VALUES[0];
  const lastVotingTimeLimit = VOTING_TIME_LIMIT_OPTION_VALUES[VOTING_TIME_LIMIT_OPTION_VALUES.length - 1];
  const firstConsensusThreshold = CONSENSUS_THRESHOLD_PRESETS[0];
  const lastConsensusThreshold = CONSENSUS_THRESHOLD_PRESETS[CONSENSUS_THRESHOLD_PRESETS.length - 1];
  let customScaleValues: string[] | undefined;
  let customScaleError: string | null = null;

  if (isCustomScale && customScaleInput.trim().length > 0) {
    try {
      customScaleValues = parseCustomScaleInput(customScaleInput);
    } catch (error) {
      customScaleError = error instanceof Error ? error.message : "Invalid custom scale";
    }
  }

  const customScaleValidationMessage = customScaleTouched
    ? (customScaleError ?? (isCustomScale && !customScaleValues ? "Enter at least 3 comma-separated values." : null))
    : null;
  const canSubmit = !isSubmitting && (!isCustomScale || !!customScaleValues);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (isCustomScale && !customScaleValues) {
          setCustomScaleTouched(true);
          return;
        }

        if (!canSubmit) {
          return;
        }

        setIsSubmitting(true);
        try {
          await onCreateRoom({
            name,
            scaleType,
            customScaleValues,
            consensusMode,
            consensusThreshold,
            hostVotingEnabled,
            votingTimeLimitSeconds,
            password: isGuestMode ? undefined : password.trim() || undefined,
            slug: isGuestMode ? undefined : slug.trim() || undefined,
          });
          setName("");
          setScaleType("fibonacci");
          setConsensusMode("plurality");
          setConsensusThreshold(DEFAULT_CONSENSUS_THRESHOLD);
          setHostVotingEnabled(true);
          setVotingTimeLimitSeconds(undefined);
          setPassword("");
          setSlug("");
          setShowPassword(false);
          setCustomScaleInput("");
          setCustomScaleTouched(false);
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="room-name">Room name</Label>
        <Input
          id="room-name"
          name="roomName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Sprint planning"
          className="bg-black/10"
          autoComplete="off"
        />
      </div>

      {isGuestMode ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-muted-foreground">
          Guest rooms are temporary, saved only on this device, and limited to one active room.
          Sign up to unlock custom links, passwords, and long-term ownership.
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="room-slug">Custom URL slug (optional)</Label>
          <Input
            id="room-slug"
            name="roomSlug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="Leave blank for random UUID"
            className="bg-black/10"
            autoComplete="off"
          />
        </div>
      )}

      {/* Scale type as pill selector */}
      <div className="grid gap-2">
        <p className="gap-2 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/80 leading-none flex items-center select-none">
          Point scale
        </p>
        <div className="grid gap-2">
          {SCALE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setScaleType(option.value)}
              className={cn(
                "flex w-full items-center justify-start gap-2 rounded-full border px-4 py-2.5 text-[0.7rem] font-medium uppercase tracking-[0.12em] transition-all duration-200",
                scaleType === option.value
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.12] hover:text-foreground",
              )}
            >
              <span className="text-xs">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
        {isCustomScale ? (
          <div className="grid gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
            <Label htmlFor="custom-scale-values">Custom scale values</Label>
            <Input
              id="custom-scale-values"
              name="customScaleValues"
              value={customScaleInput}
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
            <p className="text-xs text-muted-foreground">
              Enter at least 3 comma-separated values. Use numbers or single characters.
              {" "}
              {"?"}
              {" "}
              is added automatically.
            </p>
            {customScaleValidationMessage ? (
              <p className="text-xs text-destructive">{customScaleValidationMessage}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3">
        <p className="gap-2 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/80 leading-none flex items-center select-none">
          Voting timer
        </p>
        <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setVotingTimeLimitSeconds(undefined);
              }}
              className={cn(
                "rounded-full border px-4 py-2 text-[0.72rem] font-medium uppercase tracking-[0.12em] transition-all duration-200",
                votingTimeLimitSeconds === undefined
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.12] hover:text-foreground",
              )}
            >
              Timer off
            </button>
            <button
              type="button"
              onClick={() => {
                setVotingTimeLimitSeconds(votingTimeLimitSeconds ?? 45);
              }}
              className={cn(
                "rounded-full border px-4 py-2 text-[0.72rem] font-medium uppercase tracking-[0.12em] transition-all duration-200",
                votingTimeLimitSeconds !== undefined
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.12] hover:text-foreground",
              )}
            >
              Timer on
            </button>
          </div>
          {votingTimeLimitSeconds !== undefined ? (
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="voting-time-limit-slider">Time limit</Label>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[0.72rem] font-medium uppercase tracking-[0.12em] text-primary">
                  {formatVotingTimeLimitLabel(votingTimeLimitSeconds)}
                </span>
              </div>
              <input
                id="voting-time-limit-slider"
                aria-label="Voting time limit"
                name="votingTimeLimit"
                type="range"
                min={0}
                max={VOTING_TIME_LIMIT_OPTION_VALUES.length - 1}
                step={1}
                value={getVotingTimeLimitStepIndex(votingTimeLimitSeconds)}
                onChange={(event) => {
                  setVotingTimeLimitSeconds(getVotingTimeLimitForStep(Number(event.target.value)));
                }}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-[hsl(var(--primary))]"
              />
              <div
                data-testid="voting-time-limit-mobile-labels"
                className="grid grid-cols-3 gap-2 text-center text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground/60 sm:hidden"
              >
                <span>{firstVotingTimeLimit}</span>
                <span className="font-medium text-primary">{votingTimeLimitSeconds}</span>
                <span>{lastVotingTimeLimit}</span>
              </div>
              <div
                data-testid="voting-time-limit-desktop-labels"
                className="hidden grid-cols-6 gap-2 text-center text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground/60 sm:grid"
              >
                {VOTING_TIME_LIMIT_OPTION_VALUES.map((value) => (
                  <span
                    key={value}
                    className={cn(value === votingTimeLimitSeconds && "text-primary")}
                  >
                    {value}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                When the timer ends, anyone who has not picked a card is counted as {"?"}.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3">
        <p className="gap-2 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/80 leading-none flex items-center select-none">
          Consensus rule
        </p>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => setConsensusMode("plurality")}
            className={cn(
              "flex w-full items-start justify-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200",
              consensusMode === "plurality"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.12] hover:text-foreground",
            )}
          >
            <span className="text-xs text-primary/70">{"#"}</span>
            <div>
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em]">Most voted</p>
              <p className="mt-1 text-xs text-muted-foreground">A single top card wins, even without a majority.</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setConsensusMode("threshold")}
            className={cn(
              "flex w-full items-start justify-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200",
              consensusMode === "threshold"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.12] hover:text-foreground",
            )}
          >
            <span className="text-xs text-primary/70">{"%"}</span>
            <div>
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em]">Consensus threshold</p>
              <p className="mt-1 text-xs text-muted-foreground">One card must reach a minimum share of non-? votes.</p>
            </div>
          </button>
        </div>

        {consensusMode === "threshold" ? (
          <div className="grid gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                Required agreement
              </p>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[0.72rem] font-medium uppercase tracking-[0.12em] text-primary">
                {consensusThreshold}%
              </span>
            </div>
            <input
              aria-label="Consensus threshold"
              name="consensusThreshold"
              type="range"
              min={0}
              max={CONSENSUS_THRESHOLD_PRESETS.length - 1}
              step={1}
              value={getConsensusThresholdStepIndex(consensusThreshold)}
              onChange={(event) => {
                setConsensusThreshold(getConsensusThresholdForStep(Number(event.target.value)));
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-[hsl(var(--primary))]"
            />
            <div
              data-testid="consensus-threshold-mobile-labels"
              className="grid grid-cols-3 gap-2 text-center text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground/60 sm:hidden"
            >
              <span>{firstConsensusThreshold}%</span>
              <span className="font-medium text-primary">{consensusThreshold}%</span>
              <span>{lastConsensusThreshold}%</span>
            </div>
            <div
              data-testid="consensus-threshold-desktop-labels"
              className="hidden grid-cols-5 gap-2 text-center text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground/60 sm:grid"
            >
              {CONSENSUS_THRESHOLD_PRESETS.map((value) => (
                <span
                  key={value}
                  className={cn(
                    value === consensusThreshold && "text-primary",
                  )}
                >
                  {value}%
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3">
        <p className="gap-2 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/80 leading-none flex items-center select-none">
          Host role
        </p>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => setHostVotingEnabled(true)}
            className={cn(
              "flex w-full items-start justify-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200",
              hostVotingEnabled
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.12] hover:text-foreground",
            )}
          >
            <span className="text-xs text-primary/70">{"\u2660"}</span>
            <div>
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em]">Host votes</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Dealer gets a card and counts toward the round result.
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setHostVotingEnabled(false)}
            className={cn(
              "flex w-full items-start justify-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200",
              !hostVotingEnabled
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.12] hover:text-foreground",
            )}
          >
            <span className="text-xs text-primary/70">{"\u2663"}</span>
            <div>
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em]">Host only</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Dealer manages the room without voting or affecting consensus.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Optional password */}
      {isGuestMode ? null : (
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2.5 text-[0.7rem] font-medium uppercase tracking-[0.14em] transition-all duration-200",
              showPassword
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.12] hover:text-foreground",
            )}
          >
            <span className="text-xs">{showPassword ? "\u2665" : "\u2663"}</span>
            {showPassword ? "Password enabled" : "Add password (optional)"}
          </button>
          {showPassword ? (
            <Input
              id="room-password"
              name="roomPassword"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter room password"
              className="bg-black/10"
              autoComplete="new-password"
            />
          ) : null}
        </div>
      )}

      <Button type="submit" disabled={!canSubmit} className="w-full">
        {isSubmitting ? "Creating..." : "Open table"}
      </Button>
    </form>
  );
}
