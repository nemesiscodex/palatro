import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError } from "convex/values";

import { components } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";

const TOO_MANY_JOIN_ATTEMPTS_MESSAGE =
  "Too many join attempts. Please wait a moment and try again.";

const rateLimits = {
  roomCreatePerUser: {
    kind: "token bucket",
    period: 10 * MINUTE,
    rate: 3,
    capacity: 3,
  },
  guestJoinPerRoom: {
    kind: "token bucket",
    period: MINUTE,
    rate: 30,
    capacity: 10,
  },
  guestJoinPerSession: {
    kind: "token bucket",
    period: MINUTE,
    rate: 6,
    capacity: 3,
  },
  voteCastPerParticipant: {
    kind: "token bucket",
    period: 10_000,
    rate: 12,
    capacity: 6,
  },
  roundControlPerRoom: {
    kind: "token bucket",
    period: MINUTE,
    rate: 6,
    capacity: 3,
  },
  roomSettingsPerRoom: {
    kind: "token bucket",
    period: MINUTE,
    rate: 10,
    capacity: 5,
  },
  participantModerationPerRoom: {
    kind: "token bucket",
    period: MINUTE,
    rate: 15,
    capacity: 5,
  },
  roomDeletePerUser: {
    kind: "token bucket",
    period: HOUR,
    rate: 10,
    capacity: 5,
  },
} as const;

type RateLimitName = keyof typeof rateLimits;

const limiter = new RateLimiter(components.rateLimiter, rateLimits);

export async function assertRateLimit(
  ctx: MutationCtx,
  name: RateLimitName,
  options: {
    key?: string;
    message: string;
  },
) {
  const { ok } = await limiter.limit(ctx, name, options.key ? { key: options.key } : {});

  if (!ok) {
    throw new ConvexError(options.message);
  }
}

export async function assertRoomCreateRateLimit(ctx: MutationCtx, userId: string) {
  await assertRateLimit(ctx, "roomCreatePerUser", {
    key: userId,
    message: "Too many room creation attempts. Please wait a few minutes and try again.",
  });
}

export async function assertGuestJoinRateLimit(
  ctx: MutationCtx,
  roomKey: string,
  sessionKey: string,
) {
  await assertRateLimit(ctx, "guestJoinPerRoom", {
    key: roomKey,
    message: TOO_MANY_JOIN_ATTEMPTS_MESSAGE,
  });
  await assertRateLimit(ctx, "guestJoinPerSession", {
    key: `${roomKey}:${sessionKey}`,
    message: TOO_MANY_JOIN_ATTEMPTS_MESSAGE,
  });
}

export async function assertVoteCastRateLimit(
  ctx: MutationCtx,
  participantId: string,
) {
  await assertRateLimit(ctx, "voteCastPerParticipant", {
    key: participantId,
    message: "You're changing votes too quickly. Please slow down.",
  });
}

export async function assertRoundControlRateLimit(ctx: MutationCtx, roomId: string) {
  await assertRateLimit(ctx, "roundControlPerRoom", {
    key: roomId,
    message: "Round controls are being used too quickly. Please wait a moment.",
  });
}

export async function assertRoomSettingsRateLimit(ctx: MutationCtx, roomId: string) {
  await assertRateLimit(ctx, "roomSettingsPerRoom", {
    key: roomId,
    message: "Room settings are being changed too quickly. Please wait a moment.",
  });
}

export async function assertParticipantModerationRateLimit(
  ctx: MutationCtx,
  roomId: string,
) {
  await assertRateLimit(ctx, "participantModerationPerRoom", {
    key: roomId,
    message: "Too many participant management actions. Please wait a moment.",
  });
}

export async function assertRoomDeleteRateLimit(ctx: MutationCtx, userId: string) {
  await assertRateLimit(ctx, "roomDeletePerUser", {
    key: userId,
    message: "Too many room deletion attempts. Please wait before trying again.",
  });
}
