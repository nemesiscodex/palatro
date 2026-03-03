import type { ScaleType } from "@palatro/backend/convex/pointingPoker";

import { Label } from "@/components/ui/label";

interface RoomConfigPanelProps {
  scaleType: ScaleType;
  disabled?: boolean;
  onUpdateScale: (scaleType: ScaleType) => Promise<void>;
}

export default function RoomConfigPanel({
  scaleType,
  disabled = false,
  onUpdateScale,
}: RoomConfigPanelProps) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="room-scale-config">Point scale</Label>
        <select
          id="room-scale-config"
          value={scaleType}
          disabled={disabled}
          onChange={(event) => {
            void onUpdateScale(event.target.value as ScaleType);
          }}
          className="border-input bg-background h-8 rounded-none border px-2 text-sm disabled:opacity-50"
        >
          <option value="fibonacci">Fibonacci</option>
          <option value="powers_of_two">Power of Two</option>
        </select>
      </div>
      {disabled ? (
        <p className="text-muted-foreground text-xs">Finish the current round before changing scale.</p>
      ) : (
        <p className="text-muted-foreground text-xs">Changes apply immediately.</p>
      )}
    </div>
  );
}
