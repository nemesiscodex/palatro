import { Button } from "@/components/ui/button";

interface RoundControlsProps {
  status: "idle" | "voting" | "revealed";
  canManage: boolean;
  isBusy?: boolean;
  onStart: () => Promise<void>;
  onRestart: () => Promise<void>;
  onForceFinish: () => Promise<void>;
}

export default function RoundControls({
  status,
  canManage,
  isBusy = false,
  onStart,
  onRestart,
  onForceFinish,
}: RoundControlsProps) {
  if (!canManage) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        disabled={isBusy || status === "voting"}
        onClick={() => {
          void onStart();
        }}
      >
        Start pointing
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={isBusy}
        onClick={() => {
          void onRestart();
        }}
      >
        Restart pointing
      </Button>
      <Button
        type="button"
        variant="destructive"
        disabled={isBusy || status !== "voting"}
        onClick={() => {
          void onForceFinish();
        }}
      >
        Force finish
      </Button>
    </div>
  );
}
