import { api } from "@palatro/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
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
      }).catch(() => {
        return null;
      });
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [guestToken, heartbeat, roomState]);

  const statusLabel = useMemo(() => {
    if (!roomState) {
      return "Loading room...";
    }

    if (roomState.room.status === "idle") {
      return "Waiting for the host to start a round";
    }

    if (roomState.room.status === "voting") {
      return "Voting in progress";
    }

    return "Votes revealed";
  }, [roomState]);

  if (!storageReady || roomState === undefined) {
    return <div className="px-4 py-6">Loading room...</div>;
  }

  if (!roomState) {
    return <div className="px-4 py-6">Room not found.</div>;
  }

  const canManage = roomState.viewer.isOwner;
  const showJoinForm = roomState.viewer.needsJoin && !(roomState.viewer.isOwner && roomState.viewer.isAuthenticated);

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
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,360px)]">
      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-2">
              <span>{roomState.room.name}</span>
              <span className="text-muted-foreground text-xs font-normal">{statusLabel}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <code className="border-border rounded-none border px-2 py-1 text-xs">
                {typeof window === "undefined" ? `/rooms/${slug}` : window.location.href}
              </code>
              <Button
                type="button"
                variant="outline"
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
              {guestToken && !roomState.viewer.isOwner ? (
                <Button
                  type="button"
                  variant="ghost"
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
                  Leave
                </Button>
              ) : null}
            </div>

            {showJoinForm ? (
              <JoinRoomForm
                defaultValue={roomState.viewer.displayName}
                onJoin={async (nickname) => {
                  await runBusyTask(async () => {
                    const result = await joinAsGuest({
                      slug,
                      nickname,
                      guestToken: guestToken ?? undefined,
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
              <p className="text-muted-foreground text-sm">
                {roomState.room.status === "idle"
                  ? "Join the room and wait for the host to start the round."
                  : roomState.room.status === "revealed"
                    ? "Results stay visible until the next round starts."
                    : "Waiting for your participant session."}
              </p>
            )}

            {roomState.room.status === "revealed" ? (
              <RoundResults activeRound={roomState.activeRound} />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <ParticipantList participants={roomState.participants} status={roomState.room.status} />
          </CardContent>
        </Card>
      </section>

      <aside className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Round controls</CardTitle>
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
              <p className="text-muted-foreground text-sm">Only the room owner can manage rounds.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Room configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <RoomConfigPanel
              scaleType={roomState.room.scaleType as ScaleType}
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
            />
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}
