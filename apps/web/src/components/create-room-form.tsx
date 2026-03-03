import { useState } from "react";

import type { ScaleType } from "@palatro/backend/convex/pointingPoker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SCALE_OPTIONS: Array<{ label: string; value: ScaleType }> = [
  { label: "Fibonacci", value: "fibonacci" },
  { label: "Power of Two", value: "powers_of_two" },
];

interface CreateRoomFormProps {
  onCreateRoom: (values: { name: string; scaleType: ScaleType }) => Promise<void>;
}

export default function CreateRoomForm({ onCreateRoom }: CreateRoomFormProps) {
  const [name, setName] = useState("");
  const [scaleType, setScaleType] = useState<ScaleType>("fibonacci");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      className="grid gap-3"
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
          });
          setName("");
          setScaleType("fibonacci");
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
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="room-scale">Point scale</Label>
        <select
          id="room-scale"
          value={scaleType}
          onChange={(event) => setScaleType(event.target.value as ScaleType)}
          className="border-input bg-background h-8 rounded-none border px-2 text-sm"
        >
          {SCALE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create room"}
      </Button>
    </form>
  );
}
