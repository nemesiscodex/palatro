import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface JoinRoomFormProps {
  defaultValue?: string;
  onJoin: (nickname: string) => Promise<void>;
}

export default function JoinRoomForm({ defaultValue = "", onJoin }: JoinRoomFormProps) {
  const [nickname, setNickname] = useState(defaultValue);
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
          await onJoin(nickname);
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="nickname">Nickname</Label>
        <Input
          id="nickname"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="Pick a display name"
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Joining..." : "Join room"}
      </Button>
    </form>
  );
}
