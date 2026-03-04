import { api } from "@palatro/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { ScaleType } from "@palatro/backend/convex/pointingPoker";

import JoinRoomForm from "@/components/join-room-form";
import ParticipantList from "@/components/participant-list";
import PointCardGrid from "@/components/point-card-grid";
import RoomConfigPanel from "@/components/room-config-panel";
import RoundControls from "@/components/round-controls";
import RoundResults from "@/components/round-results";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clearGuestToken, readGuestToken, writeGuestToken } from "@/lib/room-session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rooms/$slug")({
  component: RoomRouteComponent,
});

function RoomRouteComponent() {
  const { slug } = Route.useParams();
  const apiAny = api as any;
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const hostJoinRequested = useRef(false);

  useEffect(() => {
    setGuestToken(readGuestToken(slug));
    setStorageReady(true);
    hostJoinRequested.current = false;
  }, [slug]);

  const roomState = useQuery(
    apiAny.rooms.getBySlug,
    storageReady ? { slug, guestToken: guestToken ?? undefined } : "skip",
  );

  const joinAsGuest = useMutation(apiAny.participants.joinAsGuest);
  const joinAsHost = useMutation(apiAny.participants.joinAsHost);
  const heartbeat = useMutation(apiAny.participants.heartbeat);
  const leave = useMutation(apiAny.participants.leave);
  const castVote = useMutation(apiAny.rounds.castVote);
  const startRound = useMutation(apiAny.rounds.start);
  const restartRound = useMutation(apiAny.rounds.restart);
  const forceFinish = useMutation(apiAny.rounds.forceFinish);
  const updateConfig = useMutation(apiAny.rooms.updateConfig);
  const updatePassword = useMutation(apiAny.rooms.updatePassword);

  useEffect(() => {
    if (
      !roomState ||
      !roomState.viewer.isOwner ||
      !roomState.viewer.isAuthenticated ||
      !roomState.viewer.needsJoin ||
      hostJoinRequested.current
    ) {
      return;
    }

    hostJoinRequested.current = true;
    void joinAsHost({ slug }).catch((error: unknown) => {
      hostJoinRequested.current = false;
      toast.error(error instanceof Error ? error.message : "Could not join as host");
    });
  }, [joinAsHost, roomState, slug]);

  useEffect(() => {
    if (!roomState?.viewer.participantId) {
      return;
    }

    const interval = window.setInterval(() => {
      void heartbeat({
        roomId: roomState.room.id,
        participantId: roomState.viewer.participantId,
        guestToken: guestToken ?? undefined,
      }).catch(() => null);
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [guestToken, heartbeat, roomState]);

  if (!storageReady || roomState === undefined) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16">
        <div className="flex gap-2 text-xl text-primary/30 animate-pulse">
          <span>{"\u2660"}</span>
          <span>{"\u2665"}</span>
          <span>{"\u2666"}</span>
          <span>{"\u2663"}</span>
        </div>
        <p className="ornate-label text-primary/50">Loading room...</p>
      </div>
    );
  }

  if (!roomState) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-16">
        <span className="text-4xl text-primary/15">{"\u2660"}</span>
        <p className="font-serif text-2xl text-foreground">Room not found</p>
        <p className="text-sm text-muted-foreground">This table doesn't exist or has been closed.</p>
      </div>
    );
  }

  const canManage = roomState.viewer.isOwner;
  const showJoinForm =
    roomState.viewer.needsJoin && !(roomState.viewer.isOwner && roomState.viewer.isAuthenticated);
  const isVoting = roomState.room.status === "voting";
  const isRevealed = roomState.room.status === "revealed";

  async function runBusyTask(task: () => Promise<unknown>, errorMessage: string) {
    if (isBusy) {
      return;
    }

    setIsBusy(true);
    try {
      await task();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : errorMessage);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,360px)]">
      <section className="grid gap-6">
        {/* Room header */}
        <div className="stagger-rise">
          <div className="flex items-start gap-3">
            <span className="mt-1 text-lg text-primary/30">{"\u2660"}</span>
            <div>
              <p className="ornate-label text-primary/50">Room {slug}</p>
              <h1 className="mt-1 font-serif text-5xl leading-[0.9] tracking-tight">{roomState.room.name}</h1>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* Status badge */}
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em]",
              isVoting
                ? "bg-primary/15 text-primary"
                : isRevealed
                  ? "bg-accent/15 text-accent"
                  : "bg-white/[0.04] text-muted-foreground/60",
            )}>
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                isVoting
                  ? "bg-primary status-voting"
                  : isRevealed
                    ? "bg-accent"
                    : "bg-muted-foreground/30",
              )} />
              {isVoting ? "Live" : isRevealed ? "Revealed" : "Idle"}
            </span>

            {/* URL + copy */}
            <code className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[0.6rem] text-muted-foreground/50 font-mono">
              {typeof window === "undefined" ? `/rooms/${slug}` : window.location.href}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (typeof navigator === "undefined" || !navigator.clipboard) {
                  return;
                }

                void navigator.clipboard.writeText(window.location.href).then(() => {
                  toast.success("Room URL copied");
                });
              }}
            >
              Copy URL
            </Button>
          </div>
        </div>

        {/* The Table — main interaction area */}
        <Card
          className={cn(
            "stagger-rise transition-all duration-500",
            isVoting && "table-ring",
          )}
          style={{ animationDelay: "100ms" }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-primary/40">{"\u2663"}</span>
              The table
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className={cn(
              "grid gap-5 rounded-2xl border p-5 transition-all duration-500",
              isVoting
                ? "border-primary/10 bg-gradient-to-br from-primary/[0.03] to-transparent"
                : "border-white/[0.05] bg-black/[0.08]",
            )}>
              {/* Leave button for guests */}
              {guestToken && !roomState.viewer.isOwner ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-center sm:justify-start"
                  onClick={() => {
                    if (!roomState.viewer.participantId) {
                      clearGuestToken(slug);
                      setGuestToken(null);
                      return;
                    }

                    void runBusyTask(
                      async () => {
                        await leave({
                          roomId: roomState.room.id,
                          participantId: roomState.viewer.participantId,
                          guestToken,
                        });
                        clearGuestToken(slug);
                        setGuestToken(null);
                      },
                      "Could not leave the room",
                    );
                  }}
                >
                  Leave table
                </Button>
              ) : null}

              {/* Main content area */}
              {showJoinForm ? (
                <JoinRoomForm
                  defaultValue={roomState.viewer.displayName}
                  hasPassword={roomState.room.hasPassword}
                  onJoin={async (nickname, password) => {
                    await runBusyTask(async () => {
                      const result = await joinAsGuest({
                        slug,
                        nickname,
                        guestToken: guestToken ?? undefined,
                        password,
                      });
                      writeGuestToken(slug, result.guestToken);
                      setGuestToken(result.guestToken);
                      toast.success("Joined room");
                    }, "Could not join room");
                  }}
                />
              ) : roomState.room.status === "voting" && roomState.viewer.canVote && roomState.activeRound ? (
                <PointCardGrid
                  deck={roomState.deck}
                  selectedValue={roomState.viewer.currentVote}
                  disabled={isBusy}
                  onSelect={async (value) => {
                    await runBusyTask(async () => {
                      await castVote({
                        roomId: roomState.room.id,
                        roundId: roomState.activeRound.id,
                        participantId: roomState.viewer.participantId,
                        value,
                        guestToken: guestToken ?? undefined,
                      });
                    }, "Could not submit vote");
                  }}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <span className="text-2xl text-primary/15">
                    {roomState.room.status === "idle" ? "\u2660" : "\u2665"}
                  </span>
                  <p className="text-muted-foreground text-sm leading-6">
                    {roomState.room.status === "idle"
                      ? "Waiting for the dealer to start the round."
                      : roomState.room.status === "revealed"
                        ? "Results stay on the felt until the next round."
                        : "Waiting for your participant session."}
                  </p>
                </div>
              )}

              {/* Round results */}
              {roomState.room.status === "revealed" ? (
                <RoundResults activeRound={roomState.activeRound} />
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Participants card */}
        <Card className="stagger-rise" style={{ animationDelay: "180ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-primary/40">{"\u2665"}</span>
              Players
              <span className="ml-auto rounded-full bg-white/[0.04] px-2.5 py-0.5 text-[0.6rem] font-medium text-muted-foreground/60">
                {roomState.participants.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ParticipantList participants={roomState.participants} status={roomState.room.status} />
          </CardContent>
        </Card>
      </section>

      {/* Sidebar */}
      <aside className="grid content-start gap-5">
        <Card className="stagger-rise" style={{ animationDelay: "140ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-primary/40">{"\u2666"}</span>
              Round controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RoundControls
              status={roomState.room.status}
              canManage={canManage}
              isBusy={isBusy}
              onStart={() =>
                runBusyTask(async () => {
                  await startRound({ roomId: roomState.room.id });
                }, "Could not start the round")
              }
              onRestart={() =>
                runBusyTask(async () => {
                  await restartRound({ roomId: roomState.room.id });
                }, "Could not restart the round")
              }
              onForceFinish={() =>
                runBusyTask(async () => {
                  await forceFinish({ roomId: roomState.room.id });
                }, "Could not finish the round")
              }
            />
            {!canManage ? (
              <p className="text-muted-foreground/50 text-sm leading-6">
                Only the room owner can manage rounds.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="stagger-rise" style={{ animationDelay: "220ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-primary/40">{"\u2663"}</span>
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RoomConfigPanel
              scaleType={roomState.room.scaleType as ScaleType}
              hasPassword={roomState.room.hasPassword}
              disabled={!canManage || roomState.room.status === "voting" || isBusy}
              onUpdateScale={async (scaleType) => {
                if (scaleType === roomState.room.scaleType) {
                  return;
                }

                await runBusyTask(async () => {
                  await updateConfig({
                    roomId: roomState.room.id,
                    scaleType,
                  });
                  toast.success("Room configuration updated");
                }, "Could not update room settings");
              }}
              onUpdatePassword={async (password) => {
                await runBusyTask(async () => {
                  const result = await updatePassword({
                    roomId: roomState.room.id,
                    password,
                  });
                  toast.success(result.hasPassword ? "Password set" : "Password removed");
                }, "Could not update password");
              }}
            />
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}
