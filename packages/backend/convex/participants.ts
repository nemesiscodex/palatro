import { mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { verifyPassword } from "./passwordUtils";
import {
  assertRoomOwner,
  ensureUniqueDisplayName,
  findGuestParticipantByToken,
  findHostParticipantByUserId,
  getRoomBySlugOrThrow,
  requireAuthSession,
} from "./pokerHelpers";
import { createGuestToken, hashGuestToken, normalizeDisplayName } from "./pointingPoker";

export const joinAsGuest = mutation({
  args: {
    slug: v.string(),
    nickname: v.string(),
    guestToken: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const room = await getRoomBySlugOrThrow(ctx, args.slug);
    const displayName = normalizeDisplayName(args.nickname);

    if (!displayName) {
      throw new ConvexError("Nickname is required");
    }

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
  },
});

export const joinAsHost = mutation({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
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
  },
});

export const leave = mutation({
  args: {
    roomId: v.id("rooms"),
    participantId: v.id("participants"),
    guestToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

    await ctx.db.patch(participant._id, {
      isActive: false,
      lastSeenAt: Date.now(),
    });

    return null;
  },
});

export const heartbeat = mutation({
  args: {
    roomId: v.id("rooms"),
    participantId: v.id("participants"),
    guestToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
  },
});
