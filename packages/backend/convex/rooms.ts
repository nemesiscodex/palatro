import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { withUnexpectedErrorLogging } from "./errors";
import { hashPassword } from "./passwordUtils";
import {
  assertRoomManagementAccess,
  assertRoomNotExpired,
  assertRoomOwner,
  buildRoomState,
  findHostParticipantByGuestOwnerToken,
  findHostParticipantByUserId,
  getOptionalGuestOwnerSession,
  getRoomActivityPatch,
  getOptionalAuthSession,
  getRoomBySlug,
  getRoomBySlugOrThrow,
  isGuestRoomExpired,
  requireAuthSession,
  resolveRoomOwnerKind,
} from "./pokerHelpers";
import {
  createRoomSlug,
  hashGuestToken,
  normalizeConsensusThreshold,
  normalizeDisplayName,
  normalizeRoomSlug,
  resolveHostVotingEnabled,
} from "./pointingPoker";
import {
  assertRoomCreateRateLimit,
  assertRoomDeleteRateLimit,
  assertRoomSettingsRateLimit,
} from "./rateLimit";

async function resolveUniqueRoomSlug(ctx: any, requestedSlug?: string) {
  const trimmedSlug = requestedSlug?.trim();

  if (trimmedSlug) {
    const slug = normalizeRoomSlug(trimmedSlug);

    if (!slug) {
      throw new ConvexError("Custom slug must include at least one letter or number");
    }

    if (await getRoomBySlug(ctx, slug)) {
      throw new ConvexError(
        "Room slug already exists. Choose another custom slug or leave it empty to use a random UUID.",
      );
    }

    return slug;
  }

  let slug = createRoomSlug();
  while (await getRoomBySlug(ctx, slug)) {
    slug = createRoomSlug();
  }

  return slug;
}

function resolveRoomName(name: string) {
  const normalizedName = normalizeDisplayName(name);

  if (!normalizedName) {
    throw new ConvexError("Room name is required");
  }

  return normalizedName;
}

function resolveConsensusThreshold(value: number) {
  try {
    return normalizeConsensusThreshold(value);
  } catch {
    throw new ConvexError("Consensus threshold must be between 51 and 100");
  }
}

export const create = mutation({
  args: {
    name: v.string(),
    scaleType: v.union(v.literal("fibonacci"), v.literal("powers_of_two"), v.literal("t_shirt")),
    consensusMode: v.union(v.literal("plurality"), v.literal("threshold")),
    consensusThreshold: v.number(),
    hostVotingEnabled: v.optional(v.boolean()),
    password: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  handler: withUnexpectedErrorLogging("rooms.create", async (ctx, args) => {
    const { userId } = await requireAuthSession(ctx);
    await assertRoomCreateRateLimit(ctx, userId);
    const name = resolveRoomName(args.name);
    const slug = await resolveUniqueRoomSlug(ctx, args.slug);

    const password = args.password?.trim() || undefined;
    const passwordHash = password ? await hashPassword(password) : undefined;
    const consensusThreshold = resolveConsensusThreshold(args.consensusThreshold);

    const now = Date.now();
    const roomId = await ctx.db.insert("rooms", {
      ownerKind: "registered",
      ownerUserId: userId,
      name,
      slug,
      scaleType: args.scaleType,
      allowUnknown: true,
      consensusMode: args.consensusMode,
      consensusThreshold,
      hostVotingEnabled: resolveHostVotingEnabled(args.hostVotingEnabled),
      password: passwordHash,
      status: "idle",
      createdAt: now,
      lastActivityAt: now,
      updatedAt: now,
    });

    return {
      roomId,
      slug,
    };
  }),
});

export const createGuest = mutation({
  args: {
    name: v.string(),
    scaleType: v.union(v.literal("fibonacci"), v.literal("powers_of_two"), v.literal("t_shirt")),
    consensusMode: v.union(v.literal("plurality"), v.literal("threshold")),
    consensusThreshold: v.number(),
    hostVotingEnabled: v.optional(v.boolean()),
    guestOwnerToken: v.string(),
  },
  handler: withUnexpectedErrorLogging("rooms.createGuest", async (ctx, args) => {
    const { guestOwnerToken, guestOwnerTokenHash } = getOptionalGuestOwnerSession(
      ctx,
      args.guestOwnerToken,
    );

    if (!guestOwnerToken || !guestOwnerTokenHash) {
      throw new ConvexError("Guest room session is invalid");
    }

    const existingRooms = await ctx.db
      .query("rooms")
      .withIndex("by_ownerGuestTokenHash", (q: any) =>
        q.eq("ownerGuestTokenHash", guestOwnerTokenHash),
      )
      .collect();

    if (existingRooms.some((room: any) => !isGuestRoomExpired(room))) {
      throw new ConvexError(
        "You already have an active guest room on this device. Sign up to keep more rooms.",
      );
    }

    const name = resolveRoomName(args.name);
    const slug = await resolveUniqueRoomSlug(ctx);
    const consensusThreshold = resolveConsensusThreshold(args.consensusThreshold);
    const now = Date.now();
    const roomId = await ctx.db.insert("rooms", {
      ownerKind: "guest",
      ownerGuestTokenHash: guestOwnerTokenHash,
      name,
      slug,
      scaleType: args.scaleType,
      allowUnknown: true,
      consensusMode: args.consensusMode,
      consensusThreshold,
      hostVotingEnabled: resolveHostVotingEnabled(args.hostVotingEnabled),
      status: "idle",
      createdAt: now,
      lastActivityAt: now,
      guestExpiresAt: now + 24 * 60 * 60 * 1000,
      updatedAt: now,
    });

    return {
      roomId,
      slug,
    };
  }),
});

export const listMine = query({
  args: {},
  handler: withUnexpectedErrorLogging("rooms.listMine", async (ctx) => {
    const { userId } = await getOptionalAuthSession(ctx);
    if (!userId) {
      return [];
    }

    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_ownerUserId", (q: any) => q.eq("ownerUserId", userId))
      .order("desc")
      .collect();

    return rooms.map((room: any) => ({
      id: room._id,
      name: room.name,
      slug: room.slug,
      scaleType: room.scaleType,
      status: room.status,
      hasPassword: !!room.password,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    }));
  }),
});

export const getBySlug = query({
  args: {
    slug: v.string(),
    guestToken: v.optional(v.string()),
    guestOwnerToken: v.optional(v.string()),
  },
  handler: withUnexpectedErrorLogging("rooms.getBySlug", async (ctx, args) => {
    return await buildRoomState(ctx, args.slug, args.guestToken, args.guestOwnerToken);
  }),
});

export const updateConfig = mutation({
  args: {
    roomId: v.id("rooms"),
    scaleType: v.union(v.literal("fibonacci"), v.literal("powers_of_two"), v.literal("t_shirt")),
    consensusMode: v.union(v.literal("plurality"), v.literal("threshold")),
    consensusThreshold: v.number(),
    hostVotingEnabled: v.optional(v.boolean()),
    guestOwnerToken: v.optional(v.string()),
  },
  handler: withUnexpectedErrorLogging("rooms.updateConfig", async (ctx, args) => {
    const { room } = await assertRoomManagementAccess(ctx, args.roomId, args.guestOwnerToken);
    await assertRoomSettingsRateLimit(ctx, String(room._id));

    if (room.status === "voting") {
      throw new ConvexError("Cannot change room settings during an active round");
    }

    const consensusThreshold = resolveConsensusThreshold(args.consensusThreshold);
    const finalHostVotingEnabled =
      args.hostVotingEnabled === undefined
        ? resolveHostVotingEnabled(room.hostVotingEnabled)
        : resolveHostVotingEnabled(args.hostVotingEnabled);
    const now = Date.now();

    await ctx.db.patch(room._id, {
      scaleType: args.scaleType,
      consensusMode: args.consensusMode,
      consensusThreshold,
      hostVotingEnabled: finalHostVotingEnabled,
      ...getRoomActivityPatch(room, now),
    });

    return await getRoomBySlugOrThrow(ctx, room.slug);
  }),
});

export const updatePassword = mutation({
  args: {
    roomId: v.id("rooms"),
    password: v.optional(v.string()),
  },
  handler: withUnexpectedErrorLogging("rooms.updatePassword", async (ctx, args) => {
    const existingRoom = await ctx.db.get(args.roomId);

    if (!existingRoom) {
      throw new ConvexError("Room not found");
    }

    assertRoomNotExpired(existingRoom);

    if (resolveRoomOwnerKind(existingRoom) === "guest") {
      throw new ConvexError("Create an account to unlock room passwords.");
    }

    const { room } = await assertRoomOwner(ctx, args.roomId);
    await assertRoomSettingsRateLimit(ctx, String(room._id));

    const plaintext = args.password?.trim() || undefined;
    const passwordHash = plaintext ? await hashPassword(plaintext) : undefined;
    const now = Date.now();

    await ctx.db.patch(room._id, {
      password: passwordHash,
      ...getRoomActivityPatch(room, now),
    });

    return { hasPassword: !!passwordHash };
  }),
});

export const remove = mutation({
  args: {
    roomId: v.id("rooms"),
    guestOwnerToken: v.optional(v.string()),
  },
  handler: withUnexpectedErrorLogging("rooms.remove", async (ctx, args) => {
    const { room, userId } = await assertRoomManagementAccess(ctx, args.roomId, args.guestOwnerToken);

    if (userId) {
      await assertRoomDeleteRateLimit(ctx, userId);
    }

    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_roomId", (q: any) => q.eq("roomId", room._id))
      .collect();

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_roomId", (q: any) => q.eq("roomId", room._id))
      .collect();

    for (const round of rounds) {
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_roundId", (q: any) => q.eq("roundId", round._id))
        .collect();

      await Promise.all(votes.map((vote: any) => ctx.db.delete(vote._id)));
      await ctx.db.delete(round._id);
    }

    await Promise.all(participants.map((participant: any) => ctx.db.delete(participant._id)));
    await ctx.db.delete(room._id);

    return null;
  }),
});

export const claimGuestOwnership = mutation({
  args: {
    roomId: v.id("rooms"),
    guestOwnerToken: v.string(),
  },
  handler: withUnexpectedErrorLogging("rooms.claimGuestOwnership", async (ctx, args) => {
    const { authUser, userId } = await requireAuthSession(ctx);
    const room = await ctx.db.get(args.roomId);

    if (!room) {
      throw new ConvexError("Room not found");
    }

    assertRoomNotExpired(room);

    if (resolveRoomOwnerKind(room) !== "guest") {
      throw new ConvexError("This room is already claimed");
    }

    const guestOwnerTokenHash = hashGuestToken(args.guestOwnerToken);
    if (!guestOwnerTokenHash || room.ownerGuestTokenHash !== guestOwnerTokenHash) {
      throw new ConvexError("Only the room owner can do that");
    }

    const now = Date.now();
    const guestHostParticipant = await findHostParticipantByGuestOwnerToken(ctx, room._id, args.guestOwnerToken);
    const registeredHostParticipant = await findHostParticipantByUserId(ctx, room._id, userId);

    if (guestHostParticipant) {
      if (registeredHostParticipant && registeredHostParticipant._id !== guestHostParticipant._id) {
        if (room.activeRoundId) {
          const existingVote = await ctx.db
            .query("votes")
            .withIndex("by_roundId_and_participantId", (q: any) =>
              q.eq("roundId", room.activeRoundId).eq("participantId", registeredHostParticipant._id),
            )
            .unique();

          if (existingVote) {
            await ctx.db.delete(existingVote._id);
          }
        }

        await ctx.db.delete(registeredHostParticipant._id);
      }

      await ctx.db.patch(guestHostParticipant._id, {
        hostUserId: userId,
        guestTokenHash: undefined,
        displayName: normalizeDisplayName(
          String(authUser.name ?? authUser.email ?? guestHostParticipant.displayName ?? "Host"),
        ),
        isActive: true,
        lastSeenAt: now,
      });
    }

    await ctx.db.patch(room._id, {
      ownerKind: "registered",
      ownerUserId: userId,
      ownerGuestTokenHash: undefined,
      guestExpiresAt: undefined,
      lastActivityAt: now,
      updatedAt: now,
    });

    return {
      roomId: room._id,
      slug: room.slug,
    };
  }),
});
