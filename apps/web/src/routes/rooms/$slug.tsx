import { api } from "@palatro/backend/convex/_generated/api";
import { Dialog } from "@base-ui/react/dialog";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Check, Copy, Expand, QrCode, X } from "lucide-react";
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
import { pluck001Sound } from "@/lib/pluck-001";
import { tone1Sound } from "@/lib/tone-1";
import {
  clearGuestToken,
  readGuestOwnerToken,
  readGuestToken,
  writeGuestToken,
} from "@/lib/room-session";
import { getSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import { formatVotingCountdown, formatVotingTimeLimitLabel } from "@/lib/voting-time-limit";
import { switch002Sound } from "@/lib/switch-002";
import { switch006Sound } from "@/lib/switch-006";
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

interface CopyUrlButtonRoomState {
  room: {
    id: unknown;
  };
  viewer: {
    isOwner: boolean;
  };
}

function CopyUrlButton({ url, posthog, roomState, slug, playBlockedActionSound, variant = "outline", className }: {
  url: string;
  posthog: ReturnType<typeof usePostHog>;
  roomState: CopyUrlButtonRoomState;
  slug: string;
  playBlockedActionSound: () => void;
  variant?: "outline" | "ghost";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={cn("rounded-full gap-1.5", className)}
      onClick={() => {
        if (typeof navigator === "undefined" || !navigator.clipboard) return;
        void navigator.clipboard.writeText(url)
          .then(() => {
            posthog.capture("room_url_copied", {
              room_id: String(roomState.room.id),
              room_slug: slug,
              is_owner: roomState.viewer.isOwner,
            });
            setCopied(true);
            toast.success("Room URL copied");
            setTimeout(() => setCopied(false), 2000);
          })
          .catch((error: unknown) => {
            posthog.capture("room_url_copy_failed", {
              room_id: String(roomState.room.id),
              room_slug: slug,
              is_owner: roomState.viewer.isOwner,
              error: error instanceof Error ? error.message : String(error),
            });
            toast.error("Could not copy URL");
            playBlockedActionSound();
          });
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied!" : "Copy URL"}
    </Button>
  );
}

export function RoomPage({ slug }: { slug: string }) {
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [guestOwnerToken, setGuestOwnerToken] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isInlineQrVisible, setIsInlineQrVisible] = useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [isGeneratingQrCode, setIsGeneratingQrCode] = useState(false);
  const [qrCodeImageSrc, setQrCodeImageSrc] = useState<string | null>(null);
  const [qrCodeValue, setQrCodeValue] = useState<string | null>(null);
  const posthog = usePostHog();
  const hostJoinRequested = useRef(false);
  const guestClaimRequested = useRef(false);
  const trackedDoneRounds = useRef(new Set<string>());
  const warnedTimerRounds = useRef(new Set<string>());
  const syncedTimeoutRounds = useRef(new Set<string>());
  const syncedReadyChecks = useRef(new Set<string>());
  const soundedReadyChecks = useRef(new Set<string>());
  const playBlockedActionSound = useAppSound(bong001Sound, { volumeMultiplier: 0.55 });
  const playRoundRevealSound = useAppSound(switch002Sound, { volumeMultiplier: 0.6 });
  const playConfigChangedSound = useAppSound(switch007Sound, { volumeMultiplier: 0.6 });
  const playTimerWarningSound = useAppSound(tone1Sound, { volumeMultiplier: 0.65 });
  const playTimerExpiredSound = useAppSound(pluck001Sound, { volumeMultiplier: 0.7 });
  const playReadyCheckPromptSound = useAppSound(tone1Sound, { volumeMultiplier: 0.65 });
  const playReadyCheckYesSound = useAppSound(switch006Sound, { volumeMultiplier: 0.65 });
  const playReadyCheckNoSound = useAppSound(pluck001Sound, { volumeMultiplier: 0.7 });
  const [countdownNowMs, setCountdownNowMs] = useState(() => Date.now());

  useEffect(() => {
    setGuestToken(readGuestToken(slug));
    setGuestOwnerToken(readGuestOwnerToken());
    setStorageReady(true);
    setIsInlineQrVisible(false);
    setIsQrDialogOpen(false);
    hostJoinRequested.current = false;
    guestClaimRequested.current = false;
  }, [slug]);

  const roomState = useQuery(
    api.rooms.getBySlug,
    storageReady
      ? { slug, guestToken: guestToken ?? undefined, guestOwnerToken: guestOwnerToken ?? undefined }
      : "skip",
  );
  const hostVotingEnabled = roomState?.room.hostVotingEnabled !== false;
  const eligibleParticipantCount = roomState?.eligibleParticipantCount ?? 0;
  const isHostOnlyViewer =
    roomState?.viewer.participantKind === "host" && !hostVotingEnabled;
  const isViewOnlyParticipant = roomState?.viewer.participantKind === "viewer";

  const joinAsGuest = useMutation(api.participants.joinAsGuest);
  const joinAsViewer = useMutation(api.participants.joinAsViewer);
  const joinAsHost = useMutation(api.participants.joinAsHost);
  const heartbeat = useMutation(api.participants.heartbeat);
  const leave = useMutation(api.participants.leave);
  const kick = useMutation(api.participants.kick);
  const castVote = useMutation(api.rounds.castVote);
  const startRound = useMutation(api.rounds.start);
  const restartRound = useMutation(api.rounds.restart);
  const startReadyCheck = useMutation(api.rounds.startReadyCheck);
  const respondReadyCheck = useMutation(api.rounds.respondReadyCheck);
  const forceFinish = useMutation(api.rounds.forceFinish);
  const syncReadyCheckTimeout = useMutation(api.rounds.syncReadyCheckTimeout);
  const syncTimeout = useMutation(api.rounds.syncTimeout);
  const updateConfig = useMutation(api.rooms.updateConfig);
  const updatePassword = useMutation(api.rooms.updatePassword);
  const claimGuestOwnership = useMutation(api.rooms.claimGuestOwnership);

  useEffect(() => {
    if (
      !roomState ||
      !roomState.viewer.isOwner ||
      !roomState.viewer.needsJoin ||
      hostJoinRequested.current
    ) {
      return;
    }

    if (roomState.room.ownerKind !== "guest" && !roomState.viewer.isAuthenticated) {
      return;
    }

    if (roomState.room.ownerKind === "guest" && !guestOwnerToken) {
      return;
    }

    hostJoinRequested.current = true;
    void joinAsHost({
      slug,
      ...(guestOwnerToken ? { guestOwnerToken } : {}),
    }).catch((error: unknown) => {
      hostJoinRequested.current = false;
      toast.error(getUserFacingErrorMessage(error, GENERIC_UNEXPECTED_ERROR_MESSAGE));
    });
  }, [guestOwnerToken, joinAsHost, roomState, slug]);

  useEffect(() => {
    if (
      !roomState?.viewer.canClaimOwnership ||
      !guestOwnerToken ||
      guestClaimRequested.current
    ) {
      return;
    }

    guestClaimRequested.current = true;
    void claimGuestOwnership({
      roomId: roomState.room.id,
      guestOwnerToken,
    })
      .then(() => {
        toast.success("Room claimed");
      })
      .catch((error: unknown) => {
        guestClaimRequested.current = false;
        toast.error(getUserFacingErrorMessage(error, "Could not claim room"));
      });
  }, [claimGuestOwnership, guestOwnerToken, roomState]);

  useEffect(() => {
    setCountdownNowMs(Date.now());
  }, [roomState?.activeRound?.id, roomState?.readyCheck?.startedAt, roomState?.room.status]);

  useEffect(() => {
    if (!roomState?.viewer.participantId) {
      return;
    }

    const interval = window.setInterval(() => {
      void heartbeat({
        roomId: roomState.room.id,
        participantId: roomState.viewer.participantId,
        guestToken: guestToken ?? undefined,
        ...(guestOwnerToken ? { guestOwnerToken } : {}),
      }).catch(() => null);
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [guestOwnerToken, guestToken, heartbeat, roomState]);

  const activeRoundId = roomState?.activeRound ? String(roomState.activeRound.id) : null;
  const votingDeadlineAt =
    roomState?.room.status === "voting" && roomState.activeRound
      ? roomState.activeRound.votingDeadlineAt ?? null
      : null;
  const remainingVotingSeconds =
    votingDeadlineAt === null
      ? null
      : Math.max(0, Math.ceil((votingDeadlineAt - countdownNowMs) / 1000));
  const activeReadyCheckId = roomState?.readyCheck ? String(roomState.readyCheck.startedAt) : null;
  const activeReadyCheckKey =
    roomState?.readyCheck ? `${String(roomState.room.id)}:${String(roomState.readyCheck.startedAt)}` : null;
  const readyCheckDeadlineAt = roomState?.readyCheck?.isActive ? roomState.readyCheck.expiresAt : null;
  const remainingReadyCheckSeconds =
    readyCheckDeadlineAt === null
      ? null
      : Math.max(0, Math.ceil((readyCheckDeadlineAt - countdownNowMs) / 1000));

  useEffect(() => {
    if (votingDeadlineAt === null && readyCheckDeadlineAt === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCountdownNowMs(Date.now());
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [readyCheckDeadlineAt, votingDeadlineAt]);

  useEffect(() => {
    if (
      !roomState ||
      roomState.room.status !== "voting" ||
      !activeRoundId ||
      remainingVotingSeconds === null ||
      remainingVotingSeconds > 5 ||
      remainingVotingSeconds === 0 ||
      roomState.viewer.currentVote
    ) {
      return;
    }

    if (warnedTimerRounds.current.has(activeRoundId)) {
      return;
    }

    warnedTimerRounds.current.add(activeRoundId);
    playTimerWarningSound();
  }, [activeRoundId, playTimerWarningSound, remainingVotingSeconds, roomState]);

  useEffect(() => {
    if (
      !roomState ||
      roomState.room.status !== "voting" ||
      !roomState.activeRound ||
      !activeRoundId ||
      remainingVotingSeconds !== 0
    ) {
      return;
    }

    if (syncedTimeoutRounds.current.has(activeRoundId)) {
      return;
    }

    syncedTimeoutRounds.current.add(activeRoundId);

    if (!roomState.viewer.currentVote) {
      playTimerExpiredSound();
    }

    void syncTimeout({
      roomId: roomState.room.id,
      roundId: roomState.activeRound.id,
    }).catch(() => null);
  }, [activeRoundId, playTimerExpiredSound, remainingVotingSeconds, roomState, syncTimeout]);

  useEffect(() => {
    if (
      !roomState?.readyCheck ||
      !roomState.readyCheck.isActive ||
      !activeReadyCheckId ||
      remainingReadyCheckSeconds !== 0
    ) {
      return;
    }

    if (syncedReadyChecks.current.has(activeReadyCheckId)) {
      return;
    }

    syncedReadyChecks.current.add(activeReadyCheckId);

    if (roomState.readyCheck.viewerCanRespond) {
      playReadyCheckNoSound();
    }

    void syncReadyCheckTimeout({
      roomId: roomState.room.id,
    }).catch(() => null);
  }, [
    activeReadyCheckId,
    playReadyCheckNoSound,
    remainingReadyCheckSeconds,
    roomState,
    syncReadyCheckTimeout,
  ]);

  useEffect(() => {
    if (
      !roomState?.readyCheck?.isActive ||
      !roomState.readyCheck.viewerCanRespond ||
      !activeReadyCheckKey
    ) {
      return;
    }

    if (soundedReadyChecks.current.has(activeReadyCheckKey)) {
      return;
    }

    soundedReadyChecks.current.add(activeReadyCheckKey);
    playReadyCheckPromptSound();
  }, [activeReadyCheckKey, playReadyCheckPromptSound, roomState]);

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
  const showJoinForm = roomState.viewer.needsJoin && !roomState.viewer.isOwner;
  const isVoting = roomState.room.status === "voting";
  const isRevealed = roomState.room.status === "revealed";
  const hasVotingTimer = roomState.room.votingTimeLimitSeconds != null;
  const hasReadyCheck = roomState.readyCheck != null;
  const readyCheckCanRespond = roomState.readyCheck?.viewerCanRespond === true;
  const roomUrl = typeof window === "undefined" ? `/rooms/${slug}` : window.location.href;

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

  async function ensureQrCodeReady() {
    if (typeof window === "undefined") {
      return null;
    }

    const nextRoomUrl = window.location.href;
    if (qrCodeImageSrc && qrCodeValue === nextRoomUrl) {
      return qrCodeImageSrc;
    }

    setIsGeneratingQrCode(true);

    try {
      const { toString } = await import("qrcode");
      const qrSize = 512;
      const qrCodeSvg = await toString(nextRoomUrl, {
        type: "svg",
        width: qrSize,
        margin: 1,
        errorCorrectionLevel: "H",
        color: {
          dark: "#1a1c1e",
          light: "#f7f0d0",
        },
      });

      // Inject logo into SVG
      const logoSvg = `
        <rect x="186" y="186" width="140" height="140" fill="#f7f0d0" rx="32" />
        <path d="M256 200c-35 0-63 28-63 63 0 32 23 58 53 62v15h-25c-11 0-20 9-20 20s9 20 20 20h80c11 0 20-9 20-20s-9-20-20-20h-25v-15c30-4 53-30 53-62 0-35-28-63-63-63z" fill="#1a1c1e" />
      `;
      const finalSvg = qrCodeSvg.replace("</svg>", `${logoSvg}</svg>`);

      const nextQrCodeImageSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(finalSvg)}`;
      setQrCodeImageSrc(nextQrCodeImageSrc);
      setQrCodeValue(nextRoomUrl);
      return nextQrCodeImageSrc;
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "Could not generate QR code"));
      playBlockedActionSound();
      return null;
    } finally {
      setIsGeneratingQrCode(false);
    }
  }

  async function toggleInlineQrCode() {
    if (isInlineQrVisible) {
      setIsInlineQrVisible(false);
      return;
    }

    const qrCode = await ensureQrCodeReady();
    if (qrCode) {
      setIsInlineQrVisible(true);
    }
  }

  async function openQrCodeDialog() {
    const qrCode = await ensureQrCodeReady();
    if (!qrCode) {
      return;
    }

    setIsQrDialogOpen(true);
    posthog.capture("room_qr_opened", {
      room_id: String(roomState.room.id),
      room_slug: slug,
      is_owner: roomState.viewer.isOwner,
    });
  }

  return (
    <>
      <main className="mx-auto grid w-full max-w-7xl items-start gap-6 px-4 py-6 sm:gap-8 sm:px-5 sm:py-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,360px)]">
        <section data-testid="room-main-column" className="grid gap-4 lg:gap-5">
          {/* Room header */}
          <div className="stagger-rise">
            <div className="flex items-start gap-3">
              <span className="mt-1 text-base text-primary/30 sm:text-lg">{"\u2660"}</span>
              <div className="min-w-0">
                <p className="ornate-label text-primary/50">Room {slug}</p>
                <h1
                  data-testid="room-title"
                  className="mt-1 break-words text-balance font-serif text-4xl leading-[0.92] tracking-tight sm:text-5xl"
                >
                  {roomState.room.name}
                </h1>
              </div>
            </div>

            <div
              data-testid="room-meta-row"
              className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3"
            >
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

              {hasVotingTimer ? (
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em]",
                  isVoting && remainingVotingSeconds !== null
                    ? remainingVotingSeconds <= 5
                      ? "bg-amber-500/15 text-amber-200"
                      : "bg-white/[0.04] text-muted-foreground/70"
                    : "bg-white/[0.04] text-muted-foreground/70",
                )}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current/70" />
                  {isVoting && remainingVotingSeconds !== null
                    ? formatVotingCountdown(remainingVotingSeconds)
                    : `Timer ${formatVotingTimeLimitLabel(roomState.room.votingTimeLimitSeconds)}`}
                </span>
              ) : null}

              {/* URL + copy */}
              <code
                data-testid="room-url-pill"
                className="block min-w-0 max-w-full basis-full overflow-hidden break-all whitespace-normal rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[0.6rem] text-muted-foreground/50 font-mono sm:basis-auto sm:max-w-[26rem] sm:truncate sm:whitespace-nowrap sm:rounded-full lg:max-w-[30rem]"
                title={roomUrl}
              >
                {roomUrl}
              </code>
              <CopyUrlButton
                url={roomUrl}
                posthog={posthog}
                roomState={roomState}
                slug={slug}
                playBlockedActionSound={playBlockedActionSound}
                variant="ghost"
                className="min-w-0"
              />
            </div>

            {roomState.room.ownerKind === "guest" && roomState.viewer.isOwner ? (
              <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-4">
                <p className="text-sm font-medium text-foreground">
                  This guest room is temporary and saved only on this device for 24 hours.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create an account to claim it, keep it longer, and manage rooms from anywhere.
                </p>
                <div
                  data-testid="guest-claim-actions"
                  className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap"
                >
                  <Button
                    type="button"
                    size="sm"
                    className="w-full min-w-0 whitespace-normal text-center sm:w-auto"
                    onClick={() => {
                      window.location.assign(`/?redirectTo=${encodeURIComponent(`/rooms/${slug}`)}`);
                    }}
                  >
                    Create account to claim
                  </Button>
                  {!roomState.viewer.isAuthenticated ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="w-full min-w-0 whitespace-normal text-center sm:w-auto"
                      onClick={() => {
                        window.location.assign(`/?redirectTo=${encodeURIComponent(`/rooms/${slug}`)}&mode=signin`);
                      }}
                    >
                      Sign in to claim
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
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
              {isVoting && hasVotingTimer && remainingVotingSeconds !== null ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-black/[0.12] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                      Round timer
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Unanswered votes become {"?"} when the clock hits zero.
                    </p>
                  </div>
                  <span className={cn(
                    "rounded-full border px-3 py-1 text-[0.72rem] font-medium uppercase tracking-[0.12em]",
                    remainingVotingSeconds <= 5
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                      : "border-primary/20 bg-primary/10 text-primary",
                  )}>
                    {formatVotingCountdown(remainingVotingSeconds)}
                  </span>
                </div>
              ) : null}

              {hasReadyCheck ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-black/[0.12] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                      Ready check
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {roomState.readyCheck?.isActive
                        ? roomState.viewer.isOwner
                          ? "Participants have 15 seconds to confirm they are ready."
                          : readyCheckCanRespond
                            ? "Answer Yes or No before the timer runs out."
                            : roomState.readyCheck?.viewerStatus === "yes"
                            ? "You answered Yes."
                            : roomState.readyCheck?.viewerStatus === "no"
                              ? "You answered No."
                              : "Waiting for ready check responses."
                        : roomState.readyCheck?.result === "all_ready"
                          ? "All participants are ready."
                          : roomState.readyCheck?.result === "not_all_ready"
                            ? "Not all participants are ready."
                            : "Ready check closed. Latest responses stay on the participant list."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {roomState.readyCheck?.isActive && remainingReadyCheckSeconds !== null ? (
                      <span className={cn(
                        "rounded-full border px-3 py-1 text-[0.72rem] font-medium uppercase tracking-[0.12em]",
                        remainingReadyCheckSeconds <= 5
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                          : "border-white/[0.08] bg-white/[0.04] text-muted-foreground",
                      )}>
                        {remainingReadyCheckSeconds}s left
                      </span>
                    ) : null}
                    {readyCheckCanRespond ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => {
                            playReadyCheckYesSound();
                            void runBusyTask(async () => {
                              await respondReadyCheck({
                                roomId: roomState.room.id,
                                participantId: roomState.viewer.participantId,
                                answer: "yes",
                                guestToken: guestToken ?? undefined,
                                ...(guestOwnerToken ? { guestOwnerToken } : {}),
                              });
                            }, "Could not respond to the ready check");
                          }}
                        >
                          <Check className="size-4" />
                          Yes
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => {
                            playReadyCheckNoSound();
                            void runBusyTask(async () => {
                              await respondReadyCheck({
                                roomId: roomState.room.id,
                                participantId: roomState.viewer.participantId,
                                answer: "no",
                                guestToken: guestToken ?? undefined,
                                ...(guestOwnerToken ? { guestOwnerToken } : {}),
                              });
                            }, "Could not respond to the ready check");
                          }}
                        >
                          <X className="size-4" />
                          No
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Leave button for guest sessions */}
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
                          ...(guestOwnerToken ? { guestOwnerToken } : {}),
                        });
                        clearGuestToken(slug);
                        setGuestToken(null);
                      },
                      "Could not leave the room",
                    );
                  }}
                >
                  {isViewOnlyParticipant ? "Leave room" : "Leave table"}
                </Button>
              ) : null}

              {/* Main content area */}
              {showJoinForm ? (
                <JoinRoomForm
                  defaultValue={roomState.viewer.displayName}
                  hasPassword={roomState.room.hasPassword}
                  onJoin={async ({ nickname, password, joinMode }) => {
                    await runBusyTask(async () => {
                      const join = joinMode === "viewer" ? joinAsViewer : joinAsGuest;
                      const result = await join({
                        slug,
                        nickname,
                        guestToken: guestToken ?? undefined,
                        password,
                      });
                      writeGuestToken(slug, result.guestToken);
                      setGuestToken(result.guestToken);
                      toast.success(joinMode === "viewer" ? "Joined as viewer" : "Joined room");
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
                        ...(guestOwnerToken ? { guestOwnerToken } : {}),
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
                          : isViewOnlyParticipant
                            ? "Watching this round. View-only participants don't vote."
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
              Participants
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
                    ...(guestOwnerToken ? { guestOwnerToken } : {}),
                  });
                  toast.success("Participant removed");
                }, "Could not remove participant");
              }}
            />
          </CardContent>
        </Card>
        </section>

        {/* Sidebar */}
        <aside className="grid min-w-0 content-start gap-5">
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
              readyCheckActive={roomState.readyCheck?.isActive === true}
              isBusy={isBusy}
              onStart={() =>
                runBusyTask(async () => {
                  await startRound({
                    roomId: roomState.room.id,
                    ...(guestOwnerToken ? { guestOwnerToken } : {}),
                  });
                }, "Could not start the round")
              }
              onRestart={() =>
                runBusyTask(async () => {
                  await restartRound({
                    roomId: roomState.room.id,
                    ...(guestOwnerToken ? { guestOwnerToken } : {}),
                  });
                }, "Could not restart the round")
              }
              onReadyCheck={() =>
                runBusyTask(async () => {
                  await startReadyCheck({
                    roomId: roomState.room.id,
                    ...(guestOwnerToken ? { guestOwnerToken } : {}),
                  });
                }, "Could not start the ready check")
              }
              onForceFinish={() =>
                runBusyTask(async () => {
                  await forceFinish({
                    roomId: roomState.room.id,
                    ...(guestOwnerToken ? { guestOwnerToken } : {}),
                  });
                }, "Could not finish the round")
              }
            />
            {!canManage ? (
              <p className="text-muted-foreground/50 text-sm leading-6">
                Only the room owner can manage rounds.
              </p>
            ) : null}

              <div className="mt-4"><Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-w-0  w-full"
                disabled={isGeneratingQrCode}
                onClick={() => {
                  void toggleInlineQrCode();
                }}
              >
                <QrCode />
                {isGeneratingQrCode ? "Preparing QR..." : isInlineQrVisible ? "Hide QR" : "Show QR"}
              </Button>
              </div>
              {isInlineQrVisible ? (
                <div
                  data-testid="inline-qr-panel"
                  className="stagger-rise mt-4 grid min-w-0 gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/[0.14] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <p className="text-xs text-muted-foreground/70">
                    Point a phone camera at the code to join this room.
                  </p>

                  {/* QR Code frame */}
                  <div className="relative min-w-0 overflow-hidden rounded-2xl border border-black/10 bg-[#f7f0d0] p-3 shadow-[0_12px_32px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.025] [background:linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%)] [background-size:100%_3px]" />
                    <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_30px_rgba(0,0,0,0.04)]" />

                    {qrCodeImageSrc ? (
                      <img
                        alt={`QR code for ${roomUrl}`}
                        className="relative z-0 mx-auto aspect-square w-full max-w-full brightness-[1.02] contrast-[1.05]"
                        src={qrCodeImageSrc}
                        width={512}
                        height={512}
                      />
                    ) : null}
                  </div>

                  {/* URL display */}
                  <div className="min-w-0 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
                    <p
                      data-testid="inline-qr-url"
                      className="block min-w-0 max-w-full break-all whitespace-normal text-[0.62rem] font-mono text-muted-foreground/40 sm:truncate sm:whitespace-nowrap"
                      title={roomUrl}
                    >
                      {roomUrl}
                    </p>
                  </div>

                  {/* Action buttons — equal width */}
                  <div
                    data-testid="inline-qr-actions"
                    className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 [&>*]:min-w-0"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-w-0 w-full rounded-full"
                      disabled={isGeneratingQrCode}
                      onClick={() => {
                        void openQrCodeDialog();
                      }}
                    >
                      <Expand className="size-3.5" />
                      Full screen
                    </Button>
                    <CopyUrlButton
                      url={roomUrl}
                      posthog={posthog}
                      roomState={roomState}
                      slug={slug}
                      playBlockedActionSound={playBlockedActionSound}
                      className="min-w-0 w-full"
                    />
                  </div>
                </div>
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
              customScaleValues={roomState.room.customScaleValues}
              consensusMode={roomState.room.consensusMode as ConsensusMode}
              consensusThreshold={roomState.room.consensusThreshold}
              hostVotingEnabled={hostVotingEnabled}
              votingTimeLimitSeconds={roomState.room.votingTimeLimitSeconds}
              hasPassword={roomState.room.hasPassword}
              allowPassword={roomState.room.ownerKind !== "guest"}
              disabled={!canManage || roomState.room.status === "voting" || isBusy}
              statusMessage={!canManage
                ? "Only the room owner can change configuration"
                : roomState.room.status === "voting"
                ? "Finish the current round to change configuration"
                : isBusy
                ? "Configuration is updating"
                : "Changes apply instantly"}
              onUpdateConfig={async ({
                scaleType,
                customScaleValues,
                consensusMode,
                consensusThreshold,
                hostVotingEnabled,
                votingTimeLimitSeconds,
              }) => {
                await runBusyTask(async () => {
                  await updateConfig({
                    roomId: roomState.room.id,
                    scaleType,
                    customScaleValues,
                    consensusMode,
                    consensusThreshold,
                    hostVotingEnabled,
                    votingTimeLimitSeconds,
                    ...(guestOwnerToken ? { guestOwnerToken } : {}),
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

      <Dialog.Root open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl transition-opacity duration-300" />
          <Dialog.Popup
            data-testid="qr-dialog-popup"
            className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100svh-2rem)] w-[min(calc(100vw-2rem),36rem)] -translate-x-1/2 -translate-y-1/2 overflow-x-hidden overflow-y-auto overscroll-contain rounded-[2.5rem] border border-white/[0.1] bg-[radial-gradient(circle_at_top,_rgba(218,185,100,0.2),_transparent_55%),linear-gradient(180deg,rgba(22,15,11,0.98),rgba(10,8,7,0.99))] px-[calc(1.5rem+env(safe-area-inset-left))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] pr-[calc(1.5rem+env(safe-area-inset-right))] shadow-[0_40px_120px_rgba(0,0,0,0.6),0_0_0_1px_rgba(218,185,100,0.05)] sm:px-[calc(2rem+env(safe-area-inset-left))] sm:pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pt-[calc(2rem+env(safe-area-inset-top))] sm:pr-[calc(2rem+env(safe-area-inset-right))]"
          >
            {/* Decorative top glow */}
            <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-[80%] -translate-x-1/2 rounded-full bg-primary/10 blur-[60px]" />

            <div className="relative flex items-start justify-between gap-4">
              <div className="stagger-rise">
                <p className="ornate-label text-primary/60 flex items-center gap-2">
                  <QrCode className="size-3" />
                  Share this room
                </p>
                <Dialog.Title className="mt-2.5 font-serif text-3xl leading-none text-foreground sm:text-4xl">
                  Scan to join
                </Dialog.Title>
                <Dialog.Description className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground/70">
                  Point a phone camera at the QR code to instantly open this room and join the table.
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="Close QR code dialog"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-muted-foreground transition-all hover:bg-white/[0.1] hover:text-foreground hover:scale-110 active:scale-95"
              >
                <X className="size-4" />
              </Dialog.Close>
            </div>

            {/* QR Code container with ambient glow */}
            <div className="stagger-rise relative mt-8" style={{ animationDelay: "100ms" }}>
              {/* Ambient gold glow behind QR */}
              <div className="absolute inset-0 -m-4 rounded-[3rem] bg-primary/[0.06] blur-2xl" />

              <div className="relative overflow-hidden rounded-[2rem] border border-black/20 bg-[#f7f0d0] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.4),0_8px_20px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-6">
                {/* Subtle scanline texture */}
                <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.03] [background:linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] [background-size:100%_4px]" />
                <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_60px_rgba(0,0,0,0.06)]" />

                {qrCodeImageSrc ? (
                  <img
                    alt={`QR code for ${roomUrl}`}
                    className="relative z-0 mx-auto aspect-square w-full max-w-[28rem] brightness-[1.02] contrast-[1.05]"
                    src={qrCodeImageSrc}
                    width={512}
                    height={512}
                  />
                ) : null}
              </div>
            </div>

            {/* URL and actions */}
            <div className="stagger-rise mt-6 space-y-4" style={{ animationDelay: "200ms" }}>
              <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-3 sm:flex-row sm:items-center">
                <code className="block min-w-0 flex-1 break-all whitespace-normal text-[0.65rem] font-mono text-muted-foreground/45 sm:truncate sm:whitespace-nowrap">
                  {roomUrl}
                </code>
                <CopyUrlButton
                  url={roomUrl}
                  posthog={posthog}
                  roomState={roomState}
                  slug={slug}
                  playBlockedActionSound={playBlockedActionSound}
                />
              </div>

              <p className="text-center text-[0.68rem] text-muted-foreground/40">
                If the camera doesn't react, try any QR scanner app.
              </p>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
