import type { Doc, Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { withUnexpectedErrorLogging } from "./errors";
import { verifyPassword } from "./passwordUtils";
import {
  assertRoomOwner,
  ensureUniqueDisplayName,
  findGuestParticipantByToken,
  findHostParticipantByUserId,
  finishRound,
  getFreshParticipants,
  getRoomBySlugOrThrow,
  requireAuthSession,
} from "./pokerHelpers";
import { createGuestToken, hashGuestToken, normalizeDisplayName } from "./pointingPoker";
import {
  assertGuestJoinRateLimit,
  assertParticipantModerationRateLimit,
} from "./rateLimit";

async function finalizeRoundIfReadyAfterSeatChange(ctx: any, roomId: Id<"rooms">, now: number) {
  const room = (await ctx.db.get(roomId)) as Doc<"rooms"> | null;

  if (!room?.activeRoundId || room.status !== "voting") {
    return;
  }

  const round = (await ctx.db.get(room.activeRoundId)) as Doc<"rounds"> | null;
  if (!round || round.status !== "voting") {
    return;
  }

  const activeParticipants = await getFreshParticipants(ctx, room._id, now);
  if (activeParticipants.length === 0) {
    return;
  }

  const votes = await ctx.db
    .query("votes")
    .withIndex("by_roundId", (q: any) => q.eq("roundId", round._id))
    .collect();
  const votedParticipantIds = new Set(votes.map((vote: any) => String(vote.participantId)));

  if (
    activeParticipants.every((activeParticipant: any) =>
      votedParticipantIds.has(String(activeParticipant._id)),
    )
  ) {
    await finishRound(ctx, room, round, "all_voted");
  }
}

async function deactivateParticipant(ctx: any, participant: Doc<"participants">) {
  const now = Date.now();
  const room = (await ctx.db.get(participant.roomId)) as Doc<"rooms"> | null;

  if (room?.activeRoundId && room.status === "voting") {
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_roundId_and_participantId", (q: any) =>
        q.eq("roundId", room.activeRoundId).eq("participantId", participant._id),
      )
      .unique();

    if (existingVote) {
      await ctx.db.delete(existingVote._id);
    }
  }

  await ctx.db.patch(participant._id, {
    isActive: false,
    lastSeenAt: now,
  });

  await finalizeRoundIfReadyAfterSeatChange(ctx, participant.roomId, now);
}

export const joinAsGuest = mutation({
  args: {
    slug: v.string(),
    nickname: v.string(),
    guestToken: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  handler: withUnexpectedErrorLogging("participants.joinAsGuest", async (ctx, args) => {
    const room = await getRoomBySlugOrThrow(ctx, args.slug);
    const displayName = normalizeDisplayName(args.nickname);

    if (!displayName) {
      throw new ConvexError("Nickname is required");
    }

    const sessionKey = args.guestToken?.trim() || displayName.toLowerCase();
    await assertGuestJoinRateLimit(ctx, String(room._id), sessionKey);

    // If the room has a password, verify it (skip for returning participants)
    const persistedToken = args.guestToken?.trim() || createGuestToken();
    const existingParticipant = await findGuestParticipantByToken(ctx, room._id, persistedToken);

    if (room.password && !existingParticipant) {
      const supplied = args.password?.trim();
      if (!supplied || !(await verifyPassword(supplied, room.password))) {
        throw new ConvexError("Incorrect room password");
      }
    }

    const now = Date.now();

    await ensureUniqueDisplayName(ctx, room._id, displayName, existingParticipant?._id);

    if (existingParticipant) {
      await ctx.db.patch(existingParticipant._id, {
        displayName,
        isActive: true,
        lastSeenAt: now,
      });

      return {
        participantId: existingParticipant._id,
        guestToken: persistedToken,
      };
    }

    const participantId = await ctx.db.insert("participants", {
      roomId: room._id,
      kind: "guest",
      displayName,
      guestTokenHash: hashGuestToken(persistedToken),
      isActive: true,
      lastSeenAt: now,
      createdAt: now,
    });

    return {
      participantId,
      guestToken: persistedToken,
    };
  }),
});

export const joinAsHost = mutation({
  args: {
    slug: v.string(),
  },
  handler: withUnexpectedErrorLogging("participants.joinAsHost", async (ctx, args) => {
    const room = await getRoomBySlugOrThrow(ctx, args.slug);
    const { authUser, userId } = await requireAuthSession(ctx);

    if (room.ownerUserId !== userId) {
      throw new ConvexError("Only the room owner can join as host");
    }

    const now = Date.now();
    const displayName = normalizeDisplayName(String(authUser.name ?? authUser.email ?? "Host"));
    const existingParticipant = await findHostParticipantByUserId(ctx, room._id, userId);

    if (existingParticipant) {
      await ctx.db.patch(existingParticipant._id, {
        displayName,
        isActive: true,
        lastSeenAt: now,
      });

      return {
        participantId: existingParticipant._id,
      };
    }

    await ensureUniqueDisplayName(ctx, room._id, displayName);

    const participantId = await ctx.db.insert("participants", {
      roomId: room._id,
      kind: "host",
      displayName,
      hostUserId: userId,
      isActive: true,
      lastSeenAt: now,
      createdAt: now,
    });

    return {
      participantId,
    };
  }),
});

export const leave = mutation({
  args: {
    roomId: v.id("rooms"),
    participantId: v.id("participants"),
    guestToken: v.optional(v.string()),
  },
  handler: withUnexpectedErrorLogging("participants.leave", async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);

    if (!participant || participant.roomId !== args.roomId) {
      throw new ConvexError("Participant not found");
    }

    if (participant.kind === "guest") {
      const token = args.guestToken?.trim();
      if (!token || participant.guestTokenHash !== hashGuestToken(token)) {
        throw new ConvexError("Invalid guest session");
      }
    } else {
      const { userId } = await requireAuthSession(ctx);
      if (participant.hostUserId !== userId) {
        throw new ConvexError("Only the host participant can leave this seat");
      }

      await assertRoomOwner(ctx, args.roomId);
    }

    await deactivateParticipant(ctx, participant);

    return null;
  }),
});

export const kick = mutation({
  args: {
    roomId: v.id("rooms"),
    participantId: v.id("participants"),
  },
  handler: withUnexpectedErrorLogging("participants.kick", async (ctx, args) => {
    await assertRoomOwner(ctx, args.roomId);
    await assertParticipantModerationRateLimit(ctx, String(args.roomId));

    const participant = (await ctx.db.get(args.participantId)) as Doc<"participants"> | null;

    if (!participant || participant.roomId !== args.roomId || !participant.isActive) {
      throw new ConvexError("Participant not found");
    }

    if (participant.kind !== "guest") {
      throw new ConvexError("Only guest participants can be removed");
    }

    await deactivateParticipant(ctx, participant);

    return null;
  }),
});

export const heartbeat = mutation({
  args: {
    roomId: v.id("rooms"),
    participantId: v.id("participants"),
    guestToken: v.optional(v.string()),
  },
  handler: withUnexpectedErrorLogging("participants.heartbeat", async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);

    if (!participant || participant.roomId !== args.roomId) {
      throw new ConvexError("Participant not found");
    }

    if (participant.kind === "guest") {
      const token = args.guestToken?.trim();
      if (!token || participant.guestTokenHash !== hashGuestToken(token)) {
        throw new ConvexError("Invalid guest session");
      }
    } else {
      const { userId } = await requireAuthSession(ctx);
      if (participant.hostUserId !== userId) {
        throw new ConvexError("Invalid host session");
      }
    }

    await ctx.db.patch(participant._id, {
      isActive: true,
      lastSeenAt: Date.now(),
    });

    return null;
  }),
});
