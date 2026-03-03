import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import {
  assertRoomOwner,
  buildRoomState,
  getOptionalAuthSession,
  getRoomBySlugOrThrow,
  requireAuthSession,
} from "./pokerHelpers";
import { createSlugCandidate, normalizeDisplayName } from "./pointingPoker";

export const create = mutation({
  args: {
    name: v.string(),
    scaleType: v.union(v.literal("fibonacci"), v.literal("powers_of_two")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthSession(ctx);
    const name = normalizeDisplayName(args.name);

    if (!name) {
      throw new ConvexError("Room name is required");
    }

    const slugBase = createSlugCandidate(name);
    let slug = slugBase;
    let suffix = 0;

    while (await ctx.db.query("rooms").withIndex("by_slug", (q) => q.eq("slug", slug)).unique()) {
      suffix += 1;
      slug = `${slugBase}-${suffix}`;
    }

    const now = Date.now();
    const roomId = await ctx.db.insert("rooms", {
      ownerUserId: userId,
      name,
      slug,
      scaleType: args.scaleType,
      allowUnknown: true,
      status: "idle",
      createdAt: now,
      updatedAt: now,
    });

    return {
      roomId,
      slug,
    };
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getOptionalAuthSession(ctx);
    if (!userId) {
      return [];
    }

    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", userId))
      .order("desc")
      .collect();

    return rooms.map((room) => ({
      id: room._id,
      name: room.name,
      slug: room.slug,
      scaleType: room.scaleType,
      status: room.status,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    }));
  },
});

export const getBySlug = query({
  args: {
    slug: v.string(),
    guestToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await buildRoomState(ctx, args.slug, args.guestToken);
  },
});

export const updateConfig = mutation({
  args: {
    roomId: v.id("rooms"),
    scaleType: v.union(v.literal("fibonacci"), v.literal("powers_of_two")),
  },
  handler: async (ctx, args) => {
    const { room } = await assertRoomOwner(ctx, args.roomId);

    if (room.status === "voting") {
      throw new ConvexError("Cannot change room settings during an active round");
    }

    await ctx.db.patch(room._id, {
      scaleType: args.scaleType,
      updatedAt: Date.now(),
    });

    return await getRoomBySlugOrThrow(ctx, room.slug);
  },
});
