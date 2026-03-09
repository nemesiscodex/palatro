import { api } from "@palatro/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { usePostHog } from "@posthog/react";

import type { ConsensusMode, ScaleType } from "@palatro/backend/convex/pointingPoker";

import JoinRoomForm from "@/components/join-room-form";
import ParticipantList from "@/components/participant-list";
import PointCardGrid from "@/components/point-card-grid";
import RoomConfigPanel from "@/components/room-config-panel";
import RoundControls from "@/components/round-controls";
import RoundResults from "@/components/round-results";
import { Button } from "@/components/ui/button";
import { useAppSound } from "@/hooks/use-app-sound";
import { bong001Sound } from "@/lib/bong-001";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GENERIC_UNEXPECTED_ERROR_MESSAGE, getUserFacingErrorMessage } from "@/lib/errors";
import { clearGuestToken, readGuestToken, writeGuestToken } from "@/lib/room-session";
import { getSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import { switch002Sound } from "@/lib/switch-002";
import { switch007Sound } from "@/lib/switch-007";

export const Route = createFileRoute("/rooms/$slug")({
  head: ({ params }) => {
    const siteUrl = getSiteUrl();
    const roomUrl = `${siteUrl}/rooms/${params.slug}`;
    const socialImageUrl = `${siteUrl}/banner.png`;

    return {
      meta: [
      {
        title: `Room ${params.slug} - Palatro`,
      },
      {
        name: "description",
        content: `Join planning poker room ${params.slug} on Palatro.`,
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:title",
        content: `Room ${params.slug} - Palatro`,
      },
      {
        property: "og:description",
        content: `Join planning poker room ${params.slug} on Palatro.`,
      },
      {
        property: "og:url",
        content: roomUrl,
      },
      {
        property: "og:image",
        content: socialImageUrl,
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: `Room ${params.slug} - Palatro`,
      },
      {
        name: "twitter:description",
        content: `Join planning poker room ${params.slug} on Palatro.`,
      },
      {
        name: "twitter:image",
        content: socialImageUrl,
      },
      {
        name: "robots",
        content: "noindex, nofollow",
      },
      ],
      links: [
        {
          rel: "canonical",
          href: roomUrl,
        },
      ],
    };
  },
  component: RoomRouteComponent,
});

function RoomRouteComponent() {
  const { slug } = Route.useParams();
  return <RoomPage slug={slug} />;
}

export function RoomPage({ slug }: { slug: string }) {
  const apiAny = api as any;
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const posthog = usePostHog();
  const hostJoinRequested = useRef(false);
  const trackedDoneRounds = useRef(new Set<string>());
  const playBlockedActionSound = useAppSound(bong001Sound, { volumeMultiplier: 0.55 });
  const playRoundRevealSound = useAppSound(switch002Sound, { volumeMultiplier: 0.6 });
  const playConfigChangedSound = useAppSound(switch007Sound, { volumeMultiplier: 0.6 });

  useEffect(() => {
    setGuestToken(readGuestToken(slug));
    setStorageReady(true);
    hostJoinRequested.current = false;
  }, [slug]);

  const roomState = useQuery(
    apiAny.rooms.getBySlug,
    storageReady ? { slug, guestToken: guestToken ?? undefined } : "skip",
  );
  const hostVotingEnabled = roomState?.room.hostVotingEnabled !== false;
  const eligibleParticipantCount =
    roomState?.participants.filter((participant) => participant.kind === "guest" || hostVotingEnabled)
      .length ?? 0;
  const isHostOnlyViewer =
    roomState?.viewer.participantKind === "host" && !hostVotingEnabled;

  const joinAsGuest = useMutation(apiAny.participants.joinAsGuest);
  const joinAsHost = useMutation(apiAny.participants.joinAsHost);
  const heartbeat = useMutation(apiAny.participants.heartbeat);
  const leave = useMutation(apiAny.participants.leave);
  const kick = useMutation(apiAny.participants.kick);
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
      toast.error(getUserFacingErrorMessage(error, GENERIC_UNEXPECTED_ERROR_MESSAGE));
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

  useEffect(() => {
    if (
      !roomState ||
      roomState.room.status !== "revealed" ||
      !roomState.activeRound ||
      !roomState.activeRound.resultType
    ) {
      return;
    }

    const roundId = String(roomState.activeRound.id);
    if (trackedDoneRounds.current.has(roundId)) {
      return;
    }

    trackedDoneRounds.current.add(roundId);
    playRoundRevealSound();
    posthog.capture("round_done", {
      room_id: String(roomState.room.id),
      room_slug: roomState.room.slug,
      round_id: roundId,
      round_number: roomState.activeRound.roundNumber,
      result_type: roomState.activeRound.resultType,
      result_value: roomState.activeRound.resultValue,
      consensus_reached: roomState.activeRound.consensusReached,
      consensus_mode: roomState.room.consensusMode,
      consensus_threshold: roomState.room.consensusThreshold,
      scale_type: roomState.room.scaleType,
      votes_count: eligibleParticipantCount,
      is_owner: roomState.viewer.isOwner,
    });
  }, [eligibleParticipantCount, playRoundRevealSound, posthog, roomState]);

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
      playBlockedActionSound();
      return;
    }

    setIsBusy(true);
    try {
      await task();
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, errorMessage));
      playBlockedActionSound();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl items-start gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,360px)]">
      <section data-testid="room-main-column" className="grid gap-4 lg:gap-5">
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
                  posthog.capture("room_url_copied", {
                    room_id: String(roomState.room.id),
                    room_slug: slug,
                    is_owner: roomState.viewer.isOwner,
                  });
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
                      posthog.capture("vote_cast", {
                        room_id: String(roomState.room.id),
                        room_slug: roomState.room.slug,
                        round_id: String(roomState.activeRound.id),
                        round_number: roomState.activeRound.roundNumber,
                        scale_type: roomState.room.scaleType,
                        vote_value: value,
                        had_previous_vote: !!roomState.viewer.currentVote,
                        is_owner: roomState.viewer.isOwner,
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
                        : isHostOnlyViewer
                          ? "Hosting this round. Waiting for players to vote."
                          : "Waiting for your participant session."}
                  </p>
                </div>
              )}

              {/* Round results */}
              {roomState.room.status === "revealed" ? (
                <RoundResults 
                  activeRound={roomState.activeRound}
                  roomId={String(roomState.room.id)}
                  roomSlug={roomState.room.slug}
                  scaleType={roomState.room.scaleType}
                  consensusMode={roomState.room.consensusMode}
                  consensusThreshold={roomState.room.consensusThreshold}
                  votesCount={eligibleParticipantCount}
                />
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
            <ParticipantList
              participants={roomState.participants}
              status={roomState.room.status}
              canManage={canManage}
              isBusy={isBusy}
              onKick={(participantId) => {
                void runBusyTask(async () => {
                  await kick({
                    roomId: roomState.room.id,
                    participantId,
                  });
                  toast.success("Participant removed");
                }, "Could not remove participant");
              }}
            />
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
              consensusMode={roomState.room.consensusMode as ConsensusMode}
              consensusThreshold={roomState.room.consensusThreshold}
              hostVotingEnabled={hostVotingEnabled}
              hasPassword={roomState.room.hasPassword}
              disabled={!canManage || roomState.room.status === "voting" || isBusy}
              onUpdateConfig={async ({
                scaleType,
                consensusMode,
                consensusThreshold,
                hostVotingEnabled,
              }) => {
                await runBusyTask(async () => {
                  await updateConfig({
                    roomId: roomState.room.id,
                    scaleType,
                    consensusMode,
                    consensusThreshold,
                    hostVotingEnabled,
                  });
                  playConfigChangedSound();
                  toast.success("Room configuration updated");
                }, "Could not update room settings");
              }}
              onUpdatePassword={async (password) => {
                await runBusyTask(async () => {
                  const result = await updatePassword({
                    roomId: roomState.room.id,
                    password,
                  });
                  playConfigChangedSound();
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
