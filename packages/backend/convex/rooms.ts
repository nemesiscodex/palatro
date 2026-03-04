import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { withUnexpectedErrorLogging } from "./errors";
import { hashPassword } from "./passwordUtils";
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
    password: v.optional(v.string()),
  },
  handler: withUnexpectedErrorLogging("rooms.create", async (ctx, args) => {
    const { userId } = await requireAuthSession(ctx);
    const name = normalizeDisplayName(args.name);

    if (!name) {
      throw new ConvexError("Room name is required");
    }

    const slugBase = createSlugCandidate(name);
    let slug = slugBase;
    let suffix = 0;

    while (
      await ctx.db.query("rooms").withIndex("by_slug", (q: any) => q.eq("slug", slug)).unique()
    ) {
      suffix += 1;
      slug = `${slugBase}-${suffix}`;
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
    scaleType: v.union(v.literal("fibonacci"), v.literal("powers_of_two")),
  },
  handler: withUnexpectedErrorLogging("rooms.updateConfig", async (ctx, args) => {
    const { room } = await assertRoomOwner(ctx, args.roomId);

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
    const { room } = await assertRoomOwner(ctx, args.roomId);

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
