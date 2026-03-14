import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type GuestJoinMode = "guest" | "viewer";

interface JoinRoomFormProps {
  defaultValue?: string;
  hasPassword?: boolean;
  allowViewerJoin?: boolean;
  onJoin: (values: { nickname: string; password?: string; joinMode: GuestJoinMode }) => Promise<void>;
}

export default function JoinRoomForm({
  defaultValue = "",
  hasPassword = false,
  allowViewerJoin = true,
  onJoin,
}: JoinRoomFormProps) {
  const [nickname, setNickname] = useState("");
  const [didEditNickname, setDidEditNickname] = useState(false);
  const [password, setPassword] = useState("");
  const [joinMode, setJoinMode] = useState<GuestJoinMode>("guest");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nicknameValue = didEditNickname ? nickname : defaultValue;
  const effectiveJoinMode: GuestJoinMode = allowViewerJoin ? joinMode : "guest";
  const helperText = hasPassword
    ? allowViewerJoin
      ? "This table requires a password before you can join or watch"
      : "This table requires a password to join"
    : allowViewerJoin
      ? "Pick a name, then join as a player or view only"
      : "Pick a name and join the table";

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      {/* Decorative suit */}
      <div className="flex gap-2 text-2xl text-primary/20">
        <span>{"\u2660"}</span>
        <span>{"\u2665"}</span>
        <span>{"\u2666"}</span>
        <span>{"\u2663"}</span>
      </div>

      <div className="text-center">
        <h3 className="font-serif text-2xl text-foreground">Take a seat</h3>
        <p className="mt-1 text-sm text-muted-foreground/70">{helperText}</p>
      </div>

      <form
        className="grid w-full max-w-xs gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (isSubmitting) {
            return;
          }

          setIsSubmitting(true);
          try {
            await onJoin({
              nickname: nicknameValue,
              password: hasPassword ? password : undefined,
              joinMode: effectiveJoinMode,
            });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="nickname">Your name</Label>
          <Input
            id="nickname"
            name="nickname"
            value={nicknameValue}
            onChange={(event) => {
              setDidEditNickname(true);
              setNickname(event.target.value);
            }}
            placeholder="e.g. Alex"
            className="bg-black/10 text-center"
            autoComplete="nickname"
          />
        </div>
        {allowViewerJoin ? (
          <div className="grid gap-2">
            <span className="text-sm font-medium">Join as</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant={joinMode === "guest" ? "default" : "ghost"}
                onClick={() => setJoinMode("guest")}
                aria-pressed={joinMode === "guest"}
              >
                Player
              </Button>
              <Button
                type="button"
                variant={joinMode === "viewer" ? "default" : "ghost"}
                onClick={() => setJoinMode("viewer")}
                aria-pressed={joinMode === "viewer"}
              >
                View only
              </Button>
            </div>
          </div>
        ) : null}
        {hasPassword ? (
          <div className="grid gap-2">
            <Label htmlFor="room-password" className="flex items-center gap-1.5">
              <span className="text-primary/50">{"\u2660"}</span>
              Room password
            </Label>
            <Input
              id="room-password"
              name="roomPassword"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              className="bg-black/10 text-center"
              autoComplete="current-password"
            />
          </div>
        ) : null}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Joining..." : effectiveJoinMode === "viewer" ? "Join as viewer" : "Join the table"}
        </Button>
      </form>
    </div>
  );
}
