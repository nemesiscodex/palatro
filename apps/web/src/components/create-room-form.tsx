import { useState } from "react";

import type { ScaleType } from "@palatro/backend/convex/pointingPoker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const SCALE_OPTIONS: Array<{ label: string; value: ScaleType; icon: string }> = [
  { label: "Fibonacci", value: "fibonacci", icon: "\u2660" },
  { label: "Power of Two", value: "powers_of_two", icon: "\u2666" },
];

interface CreateRoomFormProps {
  onCreateRoom: (values: { name: string; scaleType: ScaleType; password?: string }) => Promise<void>;
}

export default function CreateRoomForm({ onCreateRoom }: CreateRoomFormProps) {
  const [name, setName] = useState("");
  const [scaleType, setScaleType] = useState<ScaleType>("fibonacci");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (isSubmitting) {
          return;
        }

        setIsSubmitting(true);
        try {
          await onCreateRoom({
            name,
            scaleType,
            password: password.trim() || undefined,
          });
          setName("");
          setScaleType("fibonacci");
          setPassword("");
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

      {/* Scale type as pill selector */}
      <div className="grid gap-2">
        <Label>Point scale</Label>
        <div className="flex gap-2">
          {SCALE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setScaleType(option.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-full border py-2.5 text-[0.7rem] font-medium uppercase tracking-[0.14em] transition-all duration-200",
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

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Creating..." : "Open table"}
      </Button>
    </form>
  );
}
