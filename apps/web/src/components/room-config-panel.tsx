import { useEffect, useRef, useState } from "react";

import type { ScaleType } from "@palatro/backend/convex/pointingPoker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface RoomConfigPanelProps {
  scaleType: ScaleType;
  hasPassword: boolean;
  disabled?: boolean;
  onUpdateScale: (scaleType: ScaleType) => Promise<void>;
  onUpdatePassword: (password: string | undefined) => Promise<void>;
}

const SCALE_OPTIONS: Array<{ label: string; value: ScaleType; desc: string; icon: string }> = [
  { label: "Fibonacci", value: "fibonacci", desc: "1, 2, 3, 5, 8, 13, 21", icon: "\u2665" },
  { label: "Power of Two", value: "powers_of_two", desc: "1, 2, 4, 8, 16, 32", icon: "\u2666" },
  { label: "T-Shirt", value: "t_shirt", desc: "XS, S, M, L, XL", icon: "\u2663" },
];

export default function RoomConfigPanel({
  scaleType,
  hasPassword,
  disabled = false,
  onUpdateScale,
  onUpdatePassword,
}: RoomConfigPanelProps) {
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditingPassword) {
      return;
    }
    passwordInputRef.current?.focus();
  }, [isEditingPassword]);

  return (
    <div className="grid gap-5">
      {/* Scale type */}
      <div className="grid gap-3">
        <p className="ornate-label text-muted-foreground/70">Point scale</p>
        <div className="grid gap-2">
          {SCALE_OPTIONS.map((option) => {
            const isActive = scaleType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => {
                  void onUpdateScale(option.value);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200",
                  "disabled:pointer-events-none disabled:opacity-40",
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
