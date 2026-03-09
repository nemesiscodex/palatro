import { useState } from "react";

import type { ConsensusMode, ScaleType } from "@palatro/backend/convex/pointingPoker";

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

const SCALE_OPTIONS: Array<{ label: string; value: ScaleType; icon: string }> = [
  { label: "Fibonacci", value: "fibonacci", icon: "\u2660" },
  { label: "Power of Two", value: "powers_of_two", icon: "\u2666" },
  { label: "T-Shirt", value: "t_shirt", icon: "\u2663" },
];

interface CreateRoomFormProps {
  onCreateRoom: (values: {
    name: string;
    scaleType: ScaleType;
    consensusMode: ConsensusMode;
    consensusThreshold: number;
    password?: string;
    slug?: string;
  }) => Promise<void>;
}

export default function CreateRoomForm({ onCreateRoom }: CreateRoomFormProps) {
  const [name, setName] = useState("");
  const [scaleType, setScaleType] = useState<ScaleType>("fibonacci");
  const [consensusMode, setConsensusMode] = useState<ConsensusMode>("plurality");
  const [consensusThreshold, setConsensusThreshold] = useState(DEFAULT_CONSENSUS_THRESHOLD);
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = !isSubmitting;

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!canSubmit) {
          return;
        }

        setIsSubmitting(true);
        try {
          await onCreateRoom({
            name,
            scaleType,
            consensusMode,
            consensusThreshold,
            password: password.trim() || undefined,
            slug: slug.trim() || undefined,
          });
          setName("");
          setScaleType("fibonacci");
          setConsensusMode("plurality");
          setConsensusThreshold(DEFAULT_CONSENSUS_THRESHOLD);
          setPassword("");
          setSlug("");
          setShowPassword(false);
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="room-name">Room name</Label>
        <Input
          id="room-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Sprint planning"
          className="bg-black/10"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="room-slug">Custom URL slug (optional)</Label>
        <Input
          id="room-slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="Leave blank for random UUID"
          className="bg-black/10"
        />
      </div>

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
            <div className="grid grid-cols-5 gap-2 text-center text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground/60">
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

      {/* Optional password */}
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
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter room password"
            className="bg-black/10"
          />
        ) : null}
      </div>

      <Button type="submit" disabled={!canSubmit} className="w-full">
        {isSubmitting ? "Creating..." : "Open table"}
      </Button>
    </form>
  );
}
