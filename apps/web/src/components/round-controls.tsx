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
    <div className="grid gap-3">
      {/* Status indicator */}
      <div className="mb-1 flex items-center gap-2.5">
        <span
          className={
            status === "voting"
              ? "inline-block h-2 w-2 rounded-full bg-primary status-voting"
              : status === "revealed"
                ? "inline-block h-2 w-2 rounded-full bg-accent"
                : "inline-block h-2 w-2 rounded-full bg-muted-foreground/30"
          }
        />
        <span className="ornate-label text-muted-foreground">
          {status === "voting" ? "Live" : status === "revealed" ? "Revealed" : "Waiting"}
        </span>
      </div>

      <Button
        type="button"
        disabled={isBusy || status === "voting"}
        onClick={() => {
          void onStart();
        }}
        className="w-full justify-center gap-2"
      >
        <span className="text-xs opacity-70">{"\u2660"}</span>
        {status === "idle" ? "Deal the cards" : "Start pointing"}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={isBusy}
        onClick={() => {
          void onRestart();
        }}
        className="w-full justify-center"
      >
        Restart round
      </Button>
      <Button
        type="button"
        variant="destructive"
        disabled={isBusy || status !== "voting"}
        onClick={() => {
          void onForceFinish();
        }}
        className="w-full justify-center"
      >
        Force reveal
      </Button>
    </div>
  );
}
