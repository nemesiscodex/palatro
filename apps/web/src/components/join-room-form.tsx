import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface JoinRoomFormProps {
  defaultValue?: string;
  hasPassword?: boolean;
  onJoin: (nickname: string, password?: string) => Promise<void>;
}

export default function JoinRoomForm({ defaultValue = "", hasPassword = false, onJoin }: JoinRoomFormProps) {
  const [nickname, setNickname] = useState("");
  const [didEditNickname, setDidEditNickname] = useState(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nicknameValue = didEditNickname ? nickname : defaultValue;

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
        <p className="mt-1 text-sm text-muted-foreground/70">
          {hasPassword ? "This table requires a password to join" : "Pick a name and join the table"}
        </p>
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
            await onJoin(nicknameValue, hasPassword ? password : undefined);
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="nickname">Your name</Label>
            <Input
              id="nickname"
              value={nicknameValue}
              onChange={(event) => {
                setDidEditNickname(true);
                setNickname(event.target.value);
              }}
              placeholder="e.g. Alex"
              className="bg-black/10 text-center"
            />
        </div>
        {hasPassword ? (
          <div className="grid gap-2">
            <Label htmlFor="room-password" className="flex items-center gap-1.5">
              <span className="text-primary/50">{"\u2660"}</span>
              Room password
            </Label>
            <Input
              id="room-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              className="bg-black/10 text-center"
            />
          </div>
        ) : null}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Joining..." : "Join the table"}
        </Button>
      </form>
    </div>
  );
}
