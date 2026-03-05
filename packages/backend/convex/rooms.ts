import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { withUnexpectedErrorLogging } from "./errors";
import { hashPassword } from "./passwordUtils";
import {
  assertRoomOwner,
  buildRoomState,
  getOptionalAuthSession,
  getRoomBySlug,
  getRoomBySlugOrThrow,
  requireAuthSession,
} from "./pokerHelpers";
import { createRoomSlug, normalizeDisplayName, normalizeRoomSlug } from "./pointingPoker";
import {
  assertRoomCreateRateLimit,
  assertRoomDeleteRateLimit,
  assertRoomSettingsRateLimit,
} from "./rateLimit";

export const create = mutation({
  args: {
    name: v.string(),
    scaleType: v.union(v.literal("fibonacci"), v.literal("powers_of_two"), v.literal("t_shirt")),
    password: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  handler: withUnexpectedErrorLogging("rooms.create", async (ctx, args) => {
    const { userId } = await requireAuthSession(ctx);
    await assertRoomCreateRateLimit(ctx, userId);
    const name = normalizeDisplayName(args.name);

    if (!name) {
      throw new ConvexError("Room name is required");
    }

    const requestedSlug = args.slug?.trim();
    let slug: string;

    if (requestedSlug) {
      slug = normalizeRoomSlug(requestedSlug);

      if (!slug) {
        throw new ConvexError("Custom slug must include at least one letter or number");
      }

      if (await getRoomBySlug(ctx, slug)) {
        throw new ConvexError(
          "Room slug already exists. Choose another custom slug or leave it empty to use a random UUID.",
        );
      }
    } else {
      slug = createRoomSlug();
      while (await getRoomBySlug(ctx, slug)) {
        slug = createRoomSlug();
      }
    }

    const password = args.password?.trim() || undefined;
    const passwordHash = password ? await hashPassword(password) : undefined;

    const now = Date.now();
    const roomId = await ctx.db.insert("rooms", {
      ownerUserId: userId,
      name,
      slug,
      scaleType: args.scaleType,
      allowUnknown: true,
      password: passwordHash,
      status: "idle",
      createdAt: now,
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
  },
  handler: withUnexpectedErrorLogging("rooms.getBySlug", async (ctx, args) => {
    return await buildRoomState(ctx, args.slug, args.guestToken);
  }),
});

export const updateConfig = mutation({
  args: {
    roomId: v.id("rooms"),
    scaleType: v.union(v.literal("fibonacci"), v.literal("powers_of_two"), v.literal("t_shirt")),
  },
  handler: withUnexpectedErrorLogging("rooms.updateConfig", async (ctx, args) => {
    const { room } = await assertRoomOwner(ctx, args.roomId);
    await assertRoomSettingsRateLimit(ctx, String(room._id));

    if (room.status === "voting") {
      throw new ConvexError("Cannot change room settings during an active round");
    }

    await ctx.db.patch(room._id, {
      scaleType: args.scaleType,
      updatedAt: Date.now(),
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
    const { room } = await assertRoomOwner(ctx, args.roomId);
    await assertRoomSettingsRateLimit(ctx, String(room._id));

    const plaintext = args.password?.trim() || undefined;
    const passwordHash = plaintext ? await hashPassword(plaintext) : undefined;

    await ctx.db.patch(room._id, {
      password: passwordHash,
      updatedAt: Date.now(),
    });

    return { hasPassword: !!passwordHash };
  }),
});

export const remove = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: withUnexpectedErrorLogging("rooms.remove", async (ctx, args) => {
    const { room, userId } = await assertRoomOwner(ctx, args.roomId);
    await assertRoomDeleteRateLimit(ctx, userId);

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
