import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";

import { withUnexpectedErrorLogging } from "./errors";
import {
  assertRoomManagementAccess,
  assertRoomNotExpired,
  assertVoteValueAllowed,
  buildRoomState,
  canParticipantVoteInRoom,
  finalizeExpiredVotingRoundIfNeeded,
  findGuestParticipantByToken,
  findHostParticipantByGuestOwnerToken,
  findHostParticipantByUserId,
  finishRound,
  getFreshVotingParticipants,
  getRoomActivityPatch,
  requireAuthSession,
} from "./pokerHelpers";
import {
  assertRoundControlRateLimit,
  assertVoteCastRateLimit,
} from "./rateLimit";
import { hashGuestToken, isGuestSessionParticipant } from "./pointingPoker";

async function startRoundForRoom(
  ctx: any,
  roomId: Id<"rooms">,
  allowActiveRoundReset: boolean,
  guestOwnerToken?: string,
) {
  const { room } = await assertRoomManagementAccess(ctx, roomId, guestOwnerToken);
  await assertRoundControlRateLimit(ctx, String(room._id));
  const now = Date.now();

  if (room.status === "voting" && !allowActiveRoundReset) {
    throw new ConvexError("A round is already active");
  }

  if (room.activeRoundId) {
    const existingRound = (await ctx.db.get(room.activeRoundId)) as Doc<"rounds"> | null;
    if (existingRound && existingRound.status === "voting") {
      await finishRound(ctx, room, existingRound, "forced");
    }
  }

  const previousRounds = await ctx.db
    .query("rounds")
    .withIndex("by_roomId", (q: any) => q.eq("roomId", room._id))
    .collect();

  const roundId = await ctx.db.insert("rounds", {
    roomId: room._id,
    roundNumber: previousRounds.length + 1,
    status: "voting",
    startedAt: now,
    endedReason: null,
    resultType: null,
    resultValue: null,
  });

  await ctx.db.patch(room._id, {
    status: "voting",
    activeRoundId: roundId,
    ...getRoomActivityPatch(room, now),
  });

  return {
    roomId: room._id,
    roundId,
  };
}

async function resolveVotingParticipant(
  ctx: any,
  room: Doc<"rooms">,
  participantId: Id<"participants">,
  guestToken?: string,
  guestOwnerToken?: string,
) {
  const participant = (await ctx.db.get(participantId)) as Doc<"participants"> | null;

  if (!participant || participant.roomId !== room._id || !participant.isActive) {
    throw new ConvexError("Participant not found");
  }

  if (isGuestSessionParticipant(participant.kind)) {
    const guestParticipant = await findGuestParticipantByToken(ctx, room._id, guestToken);
    if (!guestParticipant || guestParticipant._id !== participant._id) {
      throw new ConvexError("Invalid guest session");
    }

    return participant;
  }

  const trimmedGuestOwnerToken = guestOwnerToken?.trim();
  if (trimmedGuestOwnerToken && participant.guestTokenHash === hashGuestToken(trimmedGuestOwnerToken)) {
    const guestOwnerHostParticipant = await findHostParticipantByGuestOwnerToken(
      ctx,
      room._id,
      trimmedGuestOwnerToken,
    );
    if (!guestOwnerHostParticipant || guestOwnerHostParticipant._id !== participant._id) {
      throw new ConvexError("Invalid host session");
    }

    return participant;
  }

  const { userId } = await requireAuthSession(ctx);
  const hostParticipant = await findHostParticipantByUserId(ctx, room._id, userId);
  if (!hostParticipant || hostParticipant._id !== participant._id) {
    throw new ConvexError("Invalid host session");
  }

  return participant;
}

export const start = mutation({
  args: {
    roomId: v.id("rooms"),
    guestOwnerToken: v.optional(v.string()),
  },
  handler: withUnexpectedErrorLogging("rounds.start", async (ctx, args) => {
    return await startRoundForRoom(ctx, args.roomId, false, args.guestOwnerToken);
  }),
});

export const restart = mutation({
  args: {
    roomId: v.id("rooms"),
    guestOwnerToken: v.optional(v.string()),
  },
  handler: withUnexpectedErrorLogging("rounds.restart", async (ctx, args) => {
    return await startRoundForRoom(ctx, args.roomId, true, args.guestOwnerToken);
  }),
});

export const castVote = mutation({
  args: {
    roomId: v.id("rooms"),
    roundId: v.id("rounds"),
    participantId: v.id("participants"),
    value: v.string(),
    guestToken: v.optional(v.string()),
    guestOwnerToken: v.optional(v.string()),
  },
  handler: withUnexpectedErrorLogging("rounds.castVote", async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new ConvexError("Room not found");
    }
    assertRoomNotExpired(room);

    const round = await ctx.db.get(args.roundId);
    if (!round || round.roomId !== room._id) {
      throw new ConvexError("Round not found");
    }

    if (room.activeRoundId !== round._id || room.status !== "voting" || round.status !== "voting") {
      throw new ConvexError("No active voting round");
    }

    if (await finalizeExpiredVotingRoundIfNeeded(ctx, room, round)) {
      throw new ConvexError("Voting time limit has expired");
    }

    assertVoteValueAllowed(room.scaleType, room.customScaleValues, args.value);
    const participant = await resolveVotingParticipant(
      ctx,
      room,
      args.participantId,
      args.guestToken,
      args.guestOwnerToken,
    );

    if (!canParticipantVoteInRoom(participant, room)) {
      if (participant.kind === "viewer") {
        throw new ConvexError("View-only participants cannot vote");
      }
      throw new ConvexError("Host voting is disabled for this room");
    }

    await assertVoteCastRateLimit(ctx, String(participant._id));
    const now = Date.now();
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_roundId_and_participantId", (q: any) =>
        q.eq("roundId", round._id).eq("participantId", participant._id),
      )
      .unique();

    if (existingVote) {
      await ctx.db.patch(existingVote._id, {
        value: args.value,
        submittedAt: now,
      });
    } else {
      await ctx.db.insert("votes", {
        roomId: room._id,
        roundId: round._id,
        participantId: participant._id,
        value: args.value,
        submittedAt: now,
      });
    }

    await ctx.db.patch(participant._id, {
      lastSeenAt: now,
      isActive: true,
    });
    await ctx.db.patch(room._id, getRoomActivityPatch(room, now));

    const activeParticipants = await getFreshVotingParticipants(ctx, room, now);
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_roundId", (q: any) => q.eq("roundId", round._id))
      .collect();
    const votedParticipantIds = new Set(votes.map((vote: any) => String(vote.participantId)));

    if (
      activeParticipants.length > 0 &&
      activeParticipants.every((activeParticipant: any) =>
        votedParticipantIds.has(String(activeParticipant._id)),
      )
    ) {
      await finishRound(ctx, room, round, "all_voted");
    }

    return null;
  }),
});

export const syncTimeout = mutation({
  args: {
    roomId: v.id("rooms"),
    roundId: v.id("rounds"),
  },
  handler: withUnexpectedErrorLogging("rounds.syncTimeout", async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      return null;
    }

    assertRoomNotExpired(room);

    const round = await ctx.db.get(args.roundId);
    if (!round || round.roomId !== room._id) {
      return null;
    }

    await finalizeExpiredVotingRoundIfNeeded(ctx, room, round);
    return null;
  }),
});

export const forceFinish = mutation({
  args: {
    roomId: v.id("rooms"),
    guestOwnerToken: v.optional(v.string()),
  },
  handler: withUnexpectedErrorLogging("rounds.forceFinish", async (ctx, args) => {
    const { room } = await assertRoomManagementAccess(ctx, args.roomId, args.guestOwnerToken);
    await assertRoundControlRateLimit(ctx, String(room._id));

    if (!room.activeRoundId || room.status !== "voting") {
      throw new ConvexError("No active round to finish");
    }

    const round = (await ctx.db.get(room.activeRoundId)) as Doc<"rounds"> | null;
    if (!round || round.status !== "voting") {
      throw new ConvexError("No active round to finish");
    }

    return await finishRound(ctx, room, round, "forced");
  }),
});

export const getCurrentState = query({
  args: {
    slug: v.string(),
    guestToken: v.optional(v.string()),
    guestOwnerToken: v.optional(v.string()),
  },
  handler: withUnexpectedErrorLogging("rounds.getCurrentState", async (ctx, args) => {
    return await buildRoomState(ctx, args.slug, args.guestToken, args.guestOwnerToken);
  }),
});
