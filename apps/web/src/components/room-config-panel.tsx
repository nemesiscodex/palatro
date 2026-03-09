import { useEffect, useRef, useState } from "react";

import type { ConsensusMode, ScaleType } from "@palatro/backend/convex/pointingPoker";

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

interface RoomConfigPanelProps {
  scaleType: ScaleType;
  consensusMode: ConsensusMode;
  consensusThreshold: number;
  hasPassword: boolean;
  disabled?: boolean;
  onUpdateConfig: (values: {
    scaleType: ScaleType;
    consensusMode: ConsensusMode;
    consensusThreshold: number;
  }) => Promise<void>;
  onUpdatePassword: (password: string | undefined) => Promise<void>;
}

const SCALE_OPTIONS: Array<{ label: string; value: ScaleType; desc: string; icon: string }> = [
  { label: "Fibonacci", value: "fibonacci", desc: "1, 2, 3, 5, 8, 13, 21", icon: "\u2665" },
  { label: "Power of Two", value: "powers_of_two", desc: "1, 2, 4, 8, 16, 32", icon: "\u2666" },
  { label: "T-Shirt", value: "t_shirt", desc: "XS, S, M, L, XL", icon: "\u2663" },
];

export default function RoomConfigPanel({
  scaleType,
  consensusMode,
  consensusThreshold,
  hasPassword,
  disabled = false,
  onUpdateConfig,
  onUpdatePassword,
}: RoomConfigPanelProps) {
  const playHoverSound = useAppSound(select008Sound, { volumeMultiplier: 0.1 });
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [draftScaleType, setDraftScaleType] = useState(scaleType);
  const [draftConsensusMode, setDraftConsensusMode] = useState(consensusMode);
  const [draftConsensusThreshold, setDraftConsensusThreshold] = useState(consensusThreshold);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditingPassword) {
      return;
    }
    passwordInputRef.current?.focus();
  }, [isEditingPassword]);

  useEffect(() => {
    setDraftScaleType(scaleType);
  }, [scaleType]);

  useEffect(() => {
    setDraftConsensusMode(consensusMode);
  }, [consensusMode]);

  useEffect(() => {
    setDraftConsensusThreshold(consensusThreshold);
  }, [consensusThreshold]);

  async function submitConfig(nextValues: {
    scaleType?: ScaleType;
    consensusMode?: ConsensusMode;
    consensusThreshold?: number;
  }) {
    const payload = {
      scaleType: nextValues.scaleType ?? draftScaleType,
      consensusMode: nextValues.consensusMode ?? draftConsensusMode,
      consensusThreshold: nextValues.consensusThreshold ?? draftConsensusThreshold,
    };

    if (
      payload.scaleType === draftScaleType &&
      payload.consensusMode === draftConsensusMode &&
      payload.consensusThreshold === draftConsensusThreshold
    ) {
      return;
    }

    setDraftScaleType(payload.scaleType);
    setDraftConsensusMode(payload.consensusMode);
    setDraftConsensusThreshold(payload.consensusThreshold);
    await onUpdateConfig(payload);
  }

  return (
    <div className="grid gap-5">
      {/* Scale type */}
      <div className="grid gap-3">
        <p className="ornate-label text-muted-foreground/70">Point scale</p>
        <div className="grid gap-2">
          {SCALE_OPTIONS.map((option) => {
            const isActive = draftScaleType === option.value;
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
                  <p className="text-[0.65rem] text-muted-foreground/60 font-mono tracking-wider">{option.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/50">
          {disabled ? "Finish the current round to change scale" : "Changes apply instantly"}
        </p>
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
            <div className="grid grid-cols-5 gap-2 text-center text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground/60">
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

      {/* Room password */}
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
                  {hasPassword ? "Guests must enter the password to join" : "Anyone with the link can join"}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
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
              type="password"
              value={passwordDraft}
              onChange={(event) => setPasswordDraft(event.target.value)}
              placeholder="Enter new password"
              className="bg-black/10"
            />
            <div className="flex gap-2">
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
    </div>
  );
}
