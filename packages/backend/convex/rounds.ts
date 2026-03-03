import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";

import {
  assertRoomOwner,
  assertVoteValueAllowed,
  buildRoomState,
  findGuestParticipantByToken,
  findHostParticipantByUserId,
  finishRound,
  getFreshParticipants,
  requireAuthSession,
} from "./pokerHelpers";

async function startRoundForRoom(ctx: any, roomId: Id<"rooms">, allowActiveRoundReset: boolean) {
  const { room } = await assertRoomOwner(ctx, roomId);
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
    updatedAt: now,
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
) {
  const participant = (await ctx.db.get(participantId)) as Doc<"participants"> | null;

  if (!participant || participant.roomId !== room._id || !participant.isActive) {
    throw new ConvexError("Participant not found");
  }

  if (participant.kind === "guest") {
    const guestParticipant = await findGuestParticipantByToken(ctx, room._id, guestToken);
    if (!guestParticipant || guestParticipant._id !== participant._id) {
      throw new ConvexError("Invalid guest session");
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
  },
  handler: async (ctx, args) => {
    return await startRoundForRoom(ctx, args.roomId, false);
  },
});

export const restart = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    return await startRoundForRoom(ctx, args.roomId, true);
  },
});

export const castVote = mutation({
  args: {
    roomId: v.id("rooms"),
    roundId: v.id("rounds"),
    participantId: v.id("participants"),
    value: v.string(),
    guestToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new ConvexError("Room not found");
    }

    const round = await ctx.db.get(args.roundId);
    if (!round || round.roomId !== room._id) {
      throw new ConvexError("Round not found");
    }

    if (room.activeRoundId !== round._id || room.status !== "voting" || round.status !== "voting") {
      throw new ConvexError("No active voting round");
    }

    assertVoteValueAllowed(room.scaleType, args.value);
    const participant = await resolveVotingParticipant(ctx, room, args.participantId, args.guestToken);
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

    const activeParticipants = await getFreshParticipants(ctx, room._id, now);
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
  },
});

export const forceFinish = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { room } = await assertRoomOwner(ctx, args.roomId);

    if (!room.activeRoundId || room.status !== "voting") {
      throw new ConvexError("No active round to finish");
    }

    const round = (await ctx.db.get(room.activeRoundId)) as Doc<"rounds"> | null;
    if (!round || round.status !== "voting") {
      throw new ConvexError("No active round to finish");
    }

    return await finishRound(ctx, room, round, "forced");
  },
});

export const getCurrentState = query({
  args: {
    slug: v.string(),
    guestToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await buildRoomState(ctx, args.slug, args.guestToken);
  },
});
