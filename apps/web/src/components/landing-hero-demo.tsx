import { useEffect, useRef, useState } from "react";

import {
  computeRoundResult,
  getDeck,
  normalizeDisplayName,
} from "@palatro/backend/convex/pointingPoker";

import JoinRoomForm from "@/components/join-room-form";
import ParticipantList from "@/components/participant-list";
import PointCardGrid from "@/components/point-card-grid";
import RoundResults from "@/components/round-results";
import { Button } from "@/components/ui/button";
import { useAppSound } from "@/hooks/use-app-sound";
import { switch002Sound } from "@/lib/switch-002";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ParticipantKey = "alan" | "john" | "lucy" | "leo" | "you";
type RoomStatus = "voting" | "revealed";
type VoteMap = Record<ParticipantKey, string>;
type SubmittedVotes = Partial<VoteMap>;

const HERO_DECK = getDeck("fibonacci");
const NUMERIC_DECK = HERO_DECK.filter((value) => value !== "?");
const CONSENSUS_CONFIG = {
  consensusMode: "threshold" as const,
  consensusThreshold: 51,
};
const FAKE_PLAYERS: Array<{ id: ParticipantKey; name: string; kind: "host" | "guest" }> = [
  { id: "alan", name: "Alan", kind: "host" },
  { id: "john", name: "John", kind: "guest" },
  { id: "lucy", name: "Lucy", kind: "guest" },
  { id: "leo", name: "Leo", kind: "guest" },
];
const MIN_FAKE_DELAY_MS = 250;
const MAX_FAKE_DELAY_MS = 1400;
const REVEAL_HOLD_MS = 1800;
const NEXT_ROUND_DELAY_MS = 700;

function getNeighborValues(userCard: string) {
  const index = NUMERIC_DECK.indexOf(userCard);
  const lower = index > 0 ? NUMERIC_DECK[index - 1] : null;
  const higher = index >= 0 && index < NUMERIC_DECK.length - 1 ? NUMERIC_DECK[index + 1] : null;

  return {
    lower,
    higher,
    fallback: lower ?? higher ?? userCard,
  };
}

function buildVotePlan(roundNumber: number, userCard: string): VoteMap {
  if (userCard === "?") {
    return {
      alan: "5",
      john: "5",
      lucy: "8",
      leo: "8",
      you: "?",
    };
  }

  const cycleIndex = (roundNumber - 1) % 3;
  const { lower, higher, fallback } = getNeighborValues(userCard);

  if (cycleIndex === 0) {
    return {
      alan: userCard,
      john: userCard,
      lucy: lower ?? fallback,
      leo: higher ?? fallback,
      you: userCard,
    };
  }

  if (cycleIndex === 1) {
    return {
      alan: "?",
      john: userCard,
      lucy: fallback,
      leo: fallback,
      you: userCard,
    };
  }

  return {
    alan: userCard,
    john: userCard,
    lucy: userCard,
    leo: userCard,
    you: userCard,
  };
}

function randomDelay() {
  return MIN_FAKE_DELAY_MS + Math.round(Math.random() * (MAX_FAKE_DELAY_MS - MIN_FAKE_DELAY_MS));
}

export default function LandingHeroDemo() {
  const [joinedName, setJoinedName] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [status, setStatus] = useState<RoomStatus>("voting");
  const [submittedVotes, setSubmittedVotes] = useState<SubmittedVotes>({});
  const [activeRound, setActiveRound] = useState<{
    id: string;
    roundNumber: number;
    resultType: "most_voted" | "tie";
    resultValue: string | null;
    consensusReached: boolean;
  } | null>(null);
  const timersRef = useRef(new Set<number>());
  const sequenceIdRef = useRef(0);
  const trackedRevealedRounds = useRef(new Set<string>());
  const playRoundRevealSound = useAppSound(switch002Sound, { volumeMultiplier: 0.6 });

  function clearTimers() {
    for (const timerId of timersRef.current) {
      window.clearTimeout(timerId);
    }
    timersRef.current.clear();
  }

  function schedule(callback: () => void, delayMs: number) {
    const timerId = window.setTimeout(() => {
      timersRef.current.delete(timerId);
      callback();
    }, delayMs);
    timersRef.current.add(timerId);
  }

  function resetRoundState(nextRoundNumber = 1) {
    sequenceIdRef.current += 1;
    clearTimers();
    setRoundNumber(nextRoundNumber);
    setStatus("voting");
    setSelectedValue(null);
    setSubmittedVotes({});
    setActiveRound(null);
  }

  function beginRound(nextRoundNumber: number, userCard: string) {
    const sequenceId = sequenceIdRef.current + 1;
    sequenceIdRef.current = sequenceId;
    clearTimers();

    setRoundNumber(nextRoundNumber);
    setStatus("voting");
    setActiveRound(null);

    const votePlan = buildVotePlan(nextRoundNumber, userCard);
    setSubmittedVotes({ you: userCard });

    const fakeVotes = (Object.entries(votePlan) as Array<[ParticipantKey, string]>)
      .filter(([participantId]) => participantId !== "you");

    let lastFakeVoteAt = 0;

    fakeVotes.forEach(([participantId, voteValue]) => {
      const delayMs = randomDelay();
      lastFakeVoteAt = Math.max(lastFakeVoteAt, delayMs);

      schedule(() => {
        if (sequenceId !== sequenceIdRef.current) {
          return;
        }

        setSubmittedVotes((previousVotes) => ({
          ...previousVotes,
          [participantId]: voteValue,
        }));
      }, delayMs);
    });

    schedule(() => {
      if (sequenceId !== sequenceIdRef.current) {
        return;
      }

      setSubmittedVotes(votePlan);
      setStatus("revealed");

      const result = computeRoundResult(Object.values(votePlan), CONSENSUS_CONFIG);
      setActiveRound({
        id: `hero-round-${sequenceId}`,
        roundNumber: nextRoundNumber,
        resultType: result.resultType,
        resultValue: result.resultValue,
        consensusReached: result.consensusReached,
      });

      schedule(() => {
        if (sequenceId !== sequenceIdRef.current) {
          return;
        }

        resetRoundState(nextRoundNumber + 1);
      }, REVEAL_HOLD_MS + NEXT_ROUND_DELAY_MS);
    }, lastFakeVoteAt + 140);
  }

  useEffect(() => {
    return () => {
      sequenceIdRef.current += 1;
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (status !== "revealed" || !activeRound?.id) {
      return;
    }

    if (trackedRevealedRounds.current.has(activeRound.id)) {
      return;
    }

    trackedRevealedRounds.current.add(activeRound.id);
    playRoundRevealSound();
  }, [activeRound, playRoundRevealSound, status]);

  const participants = joinedName
    ? [
        ...FAKE_PLAYERS,
        { id: "you" as const, name: joinedName, kind: "guest" as const },
      ].map((participant) => {
        const voteValue = submittedVotes[participant.id];

        return {
          id: participant.id,
          displayName: participant.name,
          badge: participant.id === "you" ? "You" : undefined,
          hasVoted: Boolean(voteValue),
          revealedVote: status === "revealed" ? voteValue ?? null : null,
          kind: participant.kind,
        };
      })
    : [];

  return (
    <Card className="stagger-rise" style={{ animationDelay: "160ms" }}>
      <CardHeader className="border-b border-white/[0.06]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1.5">
            <p className="ornate-label text-primary/55">Demo table</p>
            <CardTitle className="flex items-center gap-2">
              <span className="text-primary/40">{"\u2660"}</span>
              Planning round
            </CardTitle>
          </div>

          {joinedName ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-center"
              onClick={() => {
                setJoinedName(null);
                setSelectedValue(null);
                resetRoundState(1);
              }}
            >
              Change name
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col py-5">
        {!joinedName ? (
          <JoinRoomForm
            allowViewerJoin={false}
            onJoin={async ({ nickname }) => {
              const normalizedName = normalizeDisplayName(nickname);
              if (!normalizedName) {
                return;
              }

              setJoinedName(normalizedName || nickname.trim());
              setSelectedValue(null);
              resetRoundState(1);
            }}
          />
        ) : (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    status === "voting" ? "bg-primary status-voting" : "bg-accent",
                  )}
                />
                <span className="ornate-label text-muted-foreground/70">
                  {status === "voting" ? "Voting" : "Revealed"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-primary/18 bg-primary/[0.08] px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-primary">
                  Round {roundNumber}
                </span>
                {selectedValue ? (
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Your vote {selectedValue}
                  </span>
                ) : null}
              </div>
            </div>

            {status === "voting" ? (
              <div className="grid gap-4">
                <PointCardGrid
                  deck={HERO_DECK}
                  selectedValue={selectedValue}
                  onSelect={async (value) => {
                    setSelectedValue(value);
                    beginRound(roundNumber, value);
                  }}
                />

                <p className="text-center text-sm leading-6 text-muted-foreground/70">
                  {selectedValue
                    ? "Your vote is in. The rest of the table is locking theirs."
                    : "Pick a card to cast your vote and watch the room react."}
                </p>
              </div>
            ) : null}

            {status === "revealed" ? (
              <RoundResults
                activeRound={activeRound}
                roomId="landing-demo"
                roomSlug="landing-demo"
                scaleType="fibonacci"
                consensusMode="threshold"
                consensusThreshold={51}
                votesCount={participants.length}
              />
            ) : null}

            <div className="border-t border-white/[0.06] pt-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-primary/40">{"\u2665"}</span>
                <span className="font-serif text-base tracking-tight">Players</span>
                <span className="ml-auto rounded-full bg-white/[0.04] px-2.5 py-0.5 text-[0.6rem] font-medium text-muted-foreground/60">
                  {participants.length}
                </span>
              </div>
              <ParticipantList participants={participants} status={status} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
