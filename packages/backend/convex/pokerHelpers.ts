import { ConvexError } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";

import { authComponent } from "./auth";
import {
  computeRoundResult,
  getDeck,
  hashGuestToken,
  isParticipantEligibleToVote,
  isParticipantFresh,
  normalizeDisplayName,
  resolveConsensusConfig,
  resolveHostVotingEnabled,
} from "./pointingPoker";

type Ctx = any;
const GUEST_ROOM_TTL_MS = 24 * 60 * 60 * 1000;

export function resolveRoomOwnerKind(
  room: Pick<Doc<"rooms">, "ownerKind">,
): "registered" | "guest" {
  return room.ownerKind ?? "registered";
}

export async function requireAuthSession(ctx: Ctx) {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  const userId = authUser ? String(authUser._id) : "";

  if (!authUser || !userId) {
    throw new ConvexError("Not authenticated");
  }

  return {
    authUser,
    userId,
  };
}

export async function getOptionalAuthSession(ctx: Ctx) {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  const userId = authUser ? String(authUser._id) : null;
  return {
    authUser,
    userId: userId || null,
  };
}

export async function getRoomBySlugOrThrow(ctx: Ctx, slug: string) {
  const room = await getRoomBySlug(ctx, slug);

  if (!room) {
    throw new ConvexError("Room not found");
  }

  assertRoomNotExpired(room);

  return room;
}

export async function getRoomBySlug(ctx: Ctx, slug: string) {
  return await ctx.db
    .query("rooms")
    .withIndex("by_slug", (q: any) => q.eq("slug", slug))
    .unique();
}

export async function assertRoomOwner(ctx: Ctx, roomId: Id<"rooms">) {
  const { authUser, userId } = await requireAuthSession(ctx);
  const room = (await ctx.db.get(roomId)) as Doc<"rooms"> | null;

  if (!room) {
    throw new ConvexError("Room not found");
  }

  assertRoomNotExpired(room);

  if (room.ownerKind !== "registered" || room.ownerUserId !== userId) {
    throw new ConvexError("Only the room owner can do that");
  }

  return {
    authUser,
    userId,
    room,
  };
}

export function getOptionalGuestOwnerSession(_ctx: Ctx, guestOwnerToken?: string) {
  const token = guestOwnerToken?.trim();
  const guestOwnerTokenHash = token ? hashGuestToken(token) : "";

  return {
    guestOwnerToken: token || null,
    guestOwnerTokenHash: guestOwnerTokenHash || null,
  };
}

export function isGuestRoomExpired(
  room: Pick<Doc<"rooms">, "ownerKind" | "guestExpiresAt">,
  now = Date.now(),
) {
  return resolveRoomOwnerKind(room) === "guest" && !!room.guestExpiresAt && room.guestExpiresAt <= now;
}

export function assertRoomNotExpired(
  room: Pick<Doc<"rooms">, "ownerKind" | "guestExpiresAt">,
  now = Date.now(),
) {
  if (isGuestRoomExpired(room, now)) {
    throw new ConvexError("This guest room has expired. Create an account to keep rooms longer.");
  }
}

export function getRoomActivityPatch(
  room: Pick<Doc<"rooms">, "ownerKind">,
  now = Date.now(),
) {
  return resolveRoomOwnerKind(room) === "guest"
    ? {
        lastActivityAt: now,
        guestExpiresAt: now + GUEST_ROOM_TTL_MS,
        updatedAt: now,
      }
    : {
        lastActivityAt: now,
        updatedAt: now,
      };
}

export async function touchRoomActivity(ctx: Ctx, roomId: Id<"rooms">, now = Date.now()) {
  const room = (await ctx.db.get(roomId)) as Doc<"rooms"> | null;

  if (!room) {
    throw new ConvexError("Room not found");
  }

  assertRoomNotExpired(room, now);
  await ctx.db.patch(room._id, getRoomActivityPatch(room, now));
  return room;
}

export async function assertRoomManagementAccess(
  ctx: Ctx,
  roomId: Id<"rooms">,
  guestOwnerToken?: string,
) {
  const room = (await ctx.db.get(roomId)) as Doc<"rooms"> | null;

  if (!room) {
    throw new ConvexError("Room not found");
  }

  assertRoomNotExpired(room);

  if (resolveRoomOwnerKind(room) === "registered") {
    const { authUser, userId } = await requireAuthSession(ctx);

    if (room.ownerUserId !== userId) {
      throw new ConvexError("Only the room owner can do that");
    }

    return {
      room,
      authUser,
      userId,
      isGuestOwner: false,
    };
  }

  const guestOwnerSession = getOptionalGuestOwnerSession(ctx, guestOwnerToken);

  if (
    !guestOwnerSession.guestOwnerTokenHash ||
    room.ownerGuestTokenHash !== guestOwnerSession.guestOwnerTokenHash
  ) {
    throw new ConvexError("Only the room owner can do that");
  }

  return {
    room,
    authUser: null,
    userId: null,
    isGuestOwner: true,
  };
}

export async function getFreshParticipants(ctx: Ctx, roomId: Id<"rooms">, now = Date.now()) {
  const participants = await ctx.db
    .query("participants")
    .withIndex("by_roomId", (q: any) => q.eq("roomId", roomId))
    .collect();

  return participants.filter(
    (participant: Doc<"participants">) =>
      participant.isActive && isParticipantFresh(participant.lastSeenAt, now),
  );
}

export function canParticipantVoteInRoom(
  participant: Pick<Doc<"participants">, "kind">,
  room: Pick<Doc<"rooms">, "hostVotingEnabled">,
) {
  return isParticipantEligibleToVote(participant.kind, room.hostVotingEnabled);
}

export function filterVotesForRoom<
  TVotes extends ReadonlyArray<Pick<Doc<"votes">, "participantId">>,
  TParticipant extends Pick<Doc<"participants">, "_id" | "kind">,
>(
  votes: TVotes,
  participants: TParticipant[],
  room: Pick<Doc<"rooms">, "hostVotingEnabled">,
): Array<TVotes[number]> {
  const participantsById = new Map(
    participants.map((participant) => [String(participant._id), participant] as const),
  );

  return votes.filter((vote) => {
    const participant = participantsById.get(String(vote.participantId));
    return participant ? canParticipantVoteInRoom(participant, room) : false;
  });
}

export async function getFreshVotingParticipants(ctx: Ctx, room: Doc<"rooms">, now = Date.now()) {
  const participants = await getFreshParticipants(ctx, room._id, now);
  return participants.filter((participant: Doc<"participants">) => canParticipantVoteInRoom(participant, room));
}

export function sortParticipantsForDisplay(participants: Doc<"participants">[]) {
  return [...participants].sort((left, right) => {
    if (left.kind === right.kind) {
      return 0;
    }

    if (left.kind === "viewer") {
      return 1;
    }

    if (right.kind === "viewer") {
      return -1;
    }

    return 0;
  });
}

export async function findGuestParticipantByToken(
  ctx: Ctx,
  roomId: Id<"rooms">,
  guestToken?: string,
) {
  if (!guestToken) {
    return null;
  }

  const guestTokenHash = hashGuestToken(guestToken);
  if (!guestTokenHash) {
    return null;
  }

  return await ctx.db
    .query("participants")
    .withIndex("by_roomId_and_guestTokenHash", (q: any) =>
      q.eq("roomId", roomId).eq("guestTokenHash", guestTokenHash),
    )
    .unique();
}

export async function findHostParticipantByUserId(
  ctx: Ctx,
  roomId: Id<"rooms">,
  hostUserId: string,
) {
  return await ctx.db
    .query("participants")
    .withIndex("by_roomId_and_hostUserId", (q: any) =>
      q.eq("roomId", roomId).eq("hostUserId", hostUserId),
    )
    .unique();
}

export async function findHostParticipantByGuestOwnerToken(
  ctx: Ctx,
  roomId: Id<"rooms">,
  guestOwnerToken?: string,
) {
  if (!guestOwnerToken) {
    return null;
  }

  const guestOwnerTokenHash = hashGuestToken(guestOwnerToken);
  if (!guestOwnerTokenHash) {
    return null;
  }

  const participant = await ctx.db
    .query("participants")
    .withIndex("by_roomId_and_guestTokenHash", (q: any) =>
      q.eq("roomId", roomId).eq("guestTokenHash", guestOwnerTokenHash),
    )
    .unique();

  if (!participant || participant.kind !== "host") {
    return null;
  }

  return participant;
}

export async function ensureUniqueDisplayName(
  ctx: Ctx,
  roomId: Id<"rooms">,
  displayName: string,
  excludeParticipantId?: Id<"participants">,
) {
  const normalized = normalizeDisplayName(displayName).toLowerCase();
  const now = Date.now();

  const participants = await ctx.db
    .query("participants")
    .withIndex("by_roomId", (q: any) => q.eq("roomId", roomId))
    .collect();

  const duplicate = participants.find((participant: Doc<"participants">) => {
    if (
      !participant.isActive ||
      !isParticipantFresh(participant.lastSeenAt, now) ||
      participant._id === excludeParticipantId
    ) {
      return false;
    }
    return normalizeDisplayName(participant.displayName).toLowerCase() === normalized;
  });

  if (duplicate) {
    throw new ConvexError("Nickname is already in use");
  }
}

export async function finishRound(
  ctx: Ctx,
  room: Doc<"rooms">,
  round: Doc<"rounds">,
  endedReason: "all_voted" | "forced",
) {
  const votes = await ctx.db
    .query("votes")
    .withIndex("by_roundId", (q: any) => q.eq("roundId", round._id))
    .collect();
  const participants = await ctx.db
    .query("participants")
    .withIndex("by_roomId", (q: any) => q.eq("roomId", room._id))
    .collect();
  const eligibleVotes = filterVotesForRoom(votes, participants, room);

  const consensusConfig = resolveConsensusConfig({
    consensusMode: room.consensusMode,
    consensusThreshold: room.consensusThreshold,
  });
  const { resultType, resultValue, consensusReached } = computeRoundResult(
    eligibleVotes.map((vote: Doc<"votes">) => vote.value),
    consensusConfig,
  );
  const endedAt = Date.now();

  await ctx.db.patch(round._id, {
    status: "revealed",
    endedAt,
    endedReason,
    resultType,
    resultValue,
    consensusReached,
  });

  await ctx.db.patch(room._id, {
    status: "revealed",
    activeRoundId: round._id,
    ...getRoomActivityPatch(room, endedAt),
  });

  return {
    resultType,
    resultValue,
    consensusReached,
  };
}

export async function buildRoomState(
  ctx: Ctx,
  slug: string,
  guestToken?: string,
  guestOwnerToken?: string,
) {
  const room = await getRoomBySlug(ctx, slug);
  if (!room) {
    return null;
  }
  if (isGuestRoomExpired(room)) {
    return null;
  }
  const now = Date.now();
  const participants = sortParticipantsForDisplay(await getFreshParticipants(ctx, room._id, now));
  const activeRound = room.activeRoundId ? await ctx.db.get(room.activeRoundId) : null;
  const roundVotes: Doc<"votes">[] =
    activeRound
      ? await ctx.db
          .query("votes")
          .withIndex("by_roundId", (q: any) => q.eq("roundId", activeRound._id))
          .collect()
      : [];
  const eligibleRoundVotes = filterVotesForRoom(roundVotes, participants, room);

  const votesByParticipantId = new Map<Id<"participants">, Doc<"votes">>(
    eligibleRoundVotes.map((vote: Doc<"votes">) => [vote.participantId, vote]),
  );
  const { authUser, userId } = await getOptionalAuthSession(ctx);
  const registeredHostParticipant =
    userId && resolveRoomOwnerKind(room) === "registered"
      ? await findHostParticipantByUserId(ctx, room._id, userId)
      : null;
  const guestOwnerHostParticipant =
    resolveRoomOwnerKind(room) === "guest"
      ? await findHostParticipantByGuestOwnerToken(ctx, room._id, guestOwnerToken)
      : null;
  const guestParticipant = guestToken
    ? await findGuestParticipantByToken(ctx, room._id, guestToken)
    : null;
  const knownParticipant = registeredHostParticipant ?? guestOwnerHostParticipant ?? guestParticipant;
  const viewerParticipant = knownParticipant?.isActive ? knownParticipant : null;
  const guestOwnerSession = getOptionalGuestOwnerSession(ctx, guestOwnerToken);
  const ownerKind = resolveRoomOwnerKind(room);
  const isRegisteredOwner = ownerKind === "registered" && !!userId && room.ownerUserId === userId;
  const isGuestOwner =
    ownerKind === "guest" &&
    !!guestOwnerSession.guestOwnerTokenHash &&
    room.ownerGuestTokenHash === guestOwnerSession.guestOwnerTokenHash;
  const isOwner = isRegisteredOwner || isGuestOwner;
  const consensusConfig = resolveConsensusConfig({
    consensusMode: room.consensusMode,
    consensusThreshold: room.consensusThreshold,
  });
  const hostVotingEnabled = resolveHostVotingEnabled(room.hostVotingEnabled);

  return {
    room: {
      id: room._id,
      name: room.name,
      slug: room.slug,
      scaleType: room.scaleType,
      consensusMode: consensusConfig.consensusMode,
      consensusThreshold: consensusConfig.consensusThreshold,
      hostVotingEnabled,
      status: room.status,
      hasPassword: !!room.password,
      ownerKind,
      guestExpiresAt: room.guestExpiresAt ?? null,
    },
    eligibleParticipantCount: participants.filter((participant: Doc<"participants">) =>
      canParticipantVoteInRoom(participant, room),
    ).length,
    deck: getDeck(room.scaleType),
    participants: participants.map((participant: Doc<"participants">) => {
      const vote = activeRound ? votesByParticipantId.get(participant._id) : null;
      return {
        id: participant._id,
        displayName: participant.displayName,
        isActive: participant.isActive,
        hasVoted: !!vote,
        revealedVote: room.status === "revealed" ? vote?.value ?? null : null,
        kind: participant.kind,
      };
    }),
    activeRound: activeRound
      ? {
          id: activeRound._id,
          roundNumber: activeRound.roundNumber,
          status: activeRound.status,
          resultType: activeRound.resultType,
          resultValue: activeRound.resultValue,
          consensusReached: activeRound.consensusReached ?? activeRound.resultType === "most_voted",
        }
      : null,
    viewer: {
      isOwner,
      isGuestOwner,
      canClaimOwnership: ownerKind === "guest" && !!userId && isGuestOwner,
      participantId: viewerParticipant?._id ?? null,
      participantKind: viewerParticipant?.kind ?? null,
      canVote:
        !!viewerParticipant &&
        room.status === "voting" &&
        !!activeRound &&
        canParticipantVoteInRoom(viewerParticipant, room),
      needsJoin: !viewerParticipant,
      currentVote:
        viewerParticipant && activeRound
          ? (votesByParticipantId.get(viewerParticipant._id)?.value ?? null)
          : null,
      displayName:
        viewerParticipant?.displayName ??
        knownParticipant?.displayName ??
        (isRegisteredOwner
          ? normalizeDisplayName(String(authUser?.name ?? authUser?.email ?? "Host"))
          : ""),
      isAuthenticated: !!userId,
    },
  };
}

export function assertVoteValueAllowed(scaleType: Doc<"rooms">["scaleType"], value: string) {
  if (!getDeck(scaleType).includes(value)) {
    throw new ConvexError("Invalid vote value");
  }
}
