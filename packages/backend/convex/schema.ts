import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    ownerKind: v.optional(v.union(v.literal("registered"), v.literal("guest"))),
    ownerUserId: v.optional(v.string()),
    ownerGuestTokenHash: v.optional(v.string()),
    name: v.string(),
    slug: v.string(),
    scaleType: v.union(
      v.literal("fibonacci"),
      v.literal("powers_of_two"),
      v.literal("t_shirt"),
      v.literal("custom"),
    ),
    customScaleValues: v.optional(v.array(v.string())),
    allowUnknown: v.boolean(),
    consensusMode: v.optional(v.union(v.literal("plurality"), v.literal("threshold"))),
    consensusThreshold: v.optional(v.number()),
    hostVotingEnabled: v.optional(v.boolean()),
    votingTimeLimitSeconds: v.optional(v.number()),
    password: v.optional(v.string()),
    status: v.union(v.literal("idle"), v.literal("voting"), v.literal("revealed")),
    activeRoundId: v.optional(v.id("rounds")),
    readyCheckStartedAt: v.optional(v.number()),
    readyCheckExpiresAt: v.optional(v.number()),
    readyCheckIsActive: v.optional(v.boolean()),
    createdAt: v.number(),
    lastActivityAt: v.optional(v.number()),
    guestExpiresAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_ownerGuestTokenHash", ["ownerGuestTokenHash"])
    .index("by_slug", ["slug"]),
  participants: defineTable({
    roomId: v.id("rooms"),
    kind: v.union(v.literal("host"), v.literal("guest"), v.literal("viewer")),
    displayName: v.string(),
    guestTokenHash: v.optional(v.string()),
    hostUserId: v.optional(v.string()),
    readyCheckStatus: v.optional(
      v.union(v.literal("pending"), v.literal("yes"), v.literal("no")),
    ),
    readyCheckStartedAt: v.optional(v.number()),
    readyCheckRespondedAt: v.optional(v.number()),
    isActive: v.boolean(),
    lastSeenAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_roomId", ["roomId"])
    .index("by_roomId_and_displayName", ["roomId", "displayName"])
    .index("by_roomId_and_guestTokenHash", ["roomId", "guestTokenHash"])
    .index("by_roomId_and_hostUserId", ["roomId", "hostUserId"]),
  rounds: defineTable({
    roomId: v.id("rooms"),
    roundNumber: v.number(),
    status: v.union(v.literal("voting"), v.literal("revealed")),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    endedReason: v.union(v.literal("all_voted"), v.literal("forced"), v.null()),
    resultType: v.union(v.literal("most_voted"), v.literal("tie"), v.null()),
    resultValue: v.union(v.string(), v.null()),
    consensusReached: v.optional(v.boolean()),
  })
    .index("by_roomId", ["roomId"])
    .index("by_roomId_and_roundNumber", ["roomId", "roundNumber"]),
  votes: defineTable({
    roomId: v.id("rooms"),
    roundId: v.id("rounds"),
    participantId: v.id("participants"),
    value: v.string(),
    submittedAt: v.number(),
  })
    .index("by_roundId", ["roundId"])
    .index("by_roundId_and_participantId", ["roundId", "participantId"]),
});
