import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./rateLimit", () => ({
  assertRoundControlRateLimit: vi.fn(async () => {}),
  assertVoteCastRateLimit: vi.fn(async () => {}),
}));

import { authComponent } from "./auth";
import { buildRoomState } from "./pokerHelpers";
import {
  castVote,
  respondReadyCheck,
  startReadyCheck,
  syncReadyCheckTimeout,
  syncTimeout,
} from "./rounds";

const authState: {
  user: { _id: string } | undefined;
} = {
  user: { _id: "user-1" },
};

type TableName = "rooms" | "rounds" | "participants" | "votes";

class FakeDb {
  tables: Record<TableName, any[]>;

  constructor(seed: Partial<Record<TableName, any[]>>) {
    this.tables = {
      rooms: seed.rooms ?? [],
      rounds: seed.rounds ?? [],
      participants: seed.participants ?? [],
      votes: seed.votes ?? [],
    };
  }

  async get(id: string) {
    for (const table of Object.values(this.tables)) {
      const found = table.find((doc) => doc._id === id);
      if (found) {
        return found;
      }
    }

    return null;
  }

  query(tableName: TableName) {
    const table = this.tables[tableName];
    let filters: Array<{ field: string; value: unknown }> = [];

    return {
      withIndex: (_indexName: string, callback: (q: any) => unknown) => {
        const chain = {
          eq: (field: string, value: unknown) => {
            filters.push({ field, value });
            return chain;
          },
        };
        callback(chain);

        return {
          collect: async () =>
            table.filter((doc) => filters.every((filter) => doc[filter.field] === filter.value)),
          unique: async () => {
            const matches = table.filter((doc) =>
              filters.every((filter) => doc[filter.field] === filter.value),
            );
            return matches[0] ?? null;
          },
        };
      },
    };
  }

  async insert(tableName: TableName, value: any) {
    const nextId = `${tableName}-${this.tables[tableName].length + 1}`;
    const doc = { _id: nextId, ...value };
    this.tables[tableName].push(doc);
    return nextId;
  }

  async patch(id: string, value: Record<string, unknown>) {
    const doc = await this.get(id);
    if (!doc) {
      throw new Error(`Missing doc ${id}`);
    }

    Object.assign(doc, value);
  }
}

function createCtx(seed: Partial<Record<TableName, any[]>>) {
  return {
    db: new FakeDb(seed),
  };
}

describe("rounds.castVote", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authState.user = { _id: "user-1" };
    vi.spyOn(authComponent, "safeGetAuthUser").mockImplementation(async () => authState.user as any);
  });

  it("rejects a host vote when host voting is disabled", async () => {
    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerUserId: "user-1",
          scaleType: "fibonacci",
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: false,
          status: "voting",
          activeRoundId: "round-1",
        },
      ],
      rounds: [
        {
          _id: "round-1",
          roomId: "room-1",
          status: "voting",
          roundNumber: 1,
        },
      ],
      participants: [
        {
          _id: "host-1",
          roomId: "room-1",
          kind: "host",
          hostUserId: "user-1",
          displayName: "Dealer",
          isActive: true,
          lastSeenAt: Date.now(),
        },
      ],
    });

    await expect(
      (castVote as any)._handler(ctx, {
        roomId: "room-1",
        roundId: "round-1",
        participantId: "host-1",
        value: "8",
      }),
    ).rejects.toThrow("Host voting is disabled for this room");

    expect(ctx.db.tables.votes).toHaveLength(0);
  });

  it("auto-finishes the round after a guest votes when the host is excluded", async () => {
    const now = Date.now();
    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerUserId: "user-1",
          scaleType: "fibonacci",
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: false,
          status: "voting",
          activeRoundId: "round-1",
        },
      ],
      rounds: [
        {
          _id: "round-1",
          roomId: "room-1",
          status: "voting",
          roundNumber: 1,
          endedReason: null,
          resultType: null,
          resultValue: null,
        },
      ],
      participants: [
        {
          _id: "host-1",
          roomId: "room-1",
          kind: "host",
          hostUserId: "user-1",
          displayName: "Dealer",
          isActive: true,
          lastSeenAt: now,
        },
        {
          _id: "guest-1",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token",
          displayName: "Alex",
          isActive: true,
          lastSeenAt: now,
        },
      ],
    });

    await (castVote as any)._handler(ctx, {
      roomId: "room-1",
      roundId: "round-1",
      participantId: "guest-1",
      value: "5",
      guestToken: "guest-token",
    });

    expect(ctx.db.tables.votes).toHaveLength(1);
    expect(ctx.db.tables.votes[0]).toMatchObject({
      roomId: "room-1",
      roundId: "round-1",
      participantId: "guest-1",
      value: "5",
    });
    expect(ctx.db.tables.rounds[0]).toMatchObject({
      _id: "round-1",
      status: "revealed",
      endedReason: "all_voted",
      resultType: "most_voted",
      resultValue: "5",
      consensusReached: true,
    });
    expect(ctx.db.tables.rooms[0]).toMatchObject({
      _id: "room-1",
      status: "revealed",
      activeRoundId: "round-1",
    });
  });

  it("keeps a stale dealer in the voting quorum when host voting is enabled", async () => {
    const now = 212_000;
    vi.spyOn(Date, "now").mockReturnValue(now);

    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerUserId: "user-1",
          scaleType: "fibonacci",
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: true,
          status: "voting",
          activeRoundId: "round-1",
        },
      ],
      rounds: [
        {
          _id: "round-1",
          roomId: "room-1",
          status: "voting",
          roundNumber: 1,
          endedReason: null,
          resultType: null,
          resultValue: null,
        },
      ],
      participants: [
        {
          _id: "host-1",
          roomId: "room-1",
          kind: "host",
          hostUserId: "user-1",
          displayName: "Dealer",
          isActive: true,
          lastSeenAt: 90_000,
        },
        {
          _id: "guest-1",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token",
          displayName: "Alex",
          isActive: true,
          lastSeenAt: now,
        },
      ],
    });

    await (castVote as any)._handler(ctx, {
      roomId: "room-1",
      roundId: "round-1",
      participantId: "guest-1",
      value: "5",
      guestToken: "guest-token",
    });

    expect(ctx.db.tables.votes).toHaveLength(1);
    expect(ctx.db.tables.rounds[0]).toMatchObject({
      _id: "round-1",
      status: "voting",
      endedReason: null,
      resultType: null,
      resultValue: null,
    });
    expect(ctx.db.tables.rooms[0]).toMatchObject({
      _id: "room-1",
      status: "voting",
    });
  });

  it("rejects votes from expired guests until they rejoin", async () => {
    const now = 212_000;
    vi.spyOn(Date, "now").mockReturnValue(now);

    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerUserId: "user-1",
          scaleType: "fibonacci",
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: true,
          status: "voting",
          activeRoundId: "round-1",
        },
      ],
      rounds: [
        {
          _id: "round-1",
          roomId: "room-1",
          status: "voting",
          roundNumber: 1,
        },
      ],
      participants: [
        {
          _id: "guest-1",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token",
          displayName: "Alex",
          isActive: true,
          lastSeenAt: 90_000,
        },
      ],
    });

    await expect(
      (castVote as any)._handler(ctx, {
        roomId: "room-1",
        roundId: "round-1",
        participantId: "guest-1",
        value: "8",
        guestToken: "guest-token",
      }),
    ).rejects.toThrow("Participant is no longer active in the room");

    expect(ctx.db.tables.votes).toHaveLength(0);
  });

  it("rejects votes from view-only participants", async () => {
    const now = Date.now();
    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerUserId: "user-1",
          scaleType: "fibonacci",
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: true,
          status: "voting",
          activeRoundId: "round-1",
        },
      ],
      rounds: [
        {
          _id: "round-1",
          roomId: "room-1",
          status: "voting",
          roundNumber: 1,
        },
      ],
      participants: [
        {
          _id: "viewer-1",
          roomId: "room-1",
          kind: "viewer",
          guestTokenHash: "viewer-token",
          displayName: "Pat",
          isActive: true,
          lastSeenAt: now,
        },
      ],
    });

    await expect(
      (castVote as any)._handler(ctx, {
        roomId: "room-1",
        roundId: "round-1",
        participantId: "viewer-1",
        value: "8",
        guestToken: "viewer-token",
      }),
    ).rejects.toThrow("View-only participants cannot vote");

    expect(ctx.db.tables.votes).toHaveLength(0);
  });

  it("defaults missing votes to question mark when the timer expires", async () => {
    vi.spyOn(Date, "now").mockReturnValue(31_000);

    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerUserId: "user-1",
          scaleType: "fibonacci",
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: true,
          votingTimeLimitSeconds: 30,
          status: "voting",
          activeRoundId: "round-1",
        },
      ],
      rounds: [
        {
          _id: "round-1",
          roomId: "room-1",
          status: "voting",
          roundNumber: 1,
          startedAt: 0,
          endedReason: null,
          resultType: null,
          resultValue: null,
        },
      ],
      participants: [
        {
          _id: "guest-1",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token-1",
          displayName: "Alex",
          isActive: true,
          lastSeenAt: 31_000,
        },
        {
          _id: "guest-2",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token-2",
          displayName: "Sam",
          isActive: true,
          lastSeenAt: 31_000,
        },
      ],
      votes: [
        {
          _id: "vote-1",
          roomId: "room-1",
          roundId: "round-1",
          participantId: "guest-1",
          value: "5",
          submittedAt: 20_000,
        },
      ],
    });

    await (syncTimeout as any)._handler(ctx, {
      roomId: "room-1",
      roundId: "round-1",
    });

    expect(ctx.db.tables.votes).toEqual([
      expect.objectContaining({
        participantId: "guest-1",
        value: "5",
      }),
      expect.objectContaining({
        participantId: "guest-2",
        value: "?",
        submittedAt: 31_000,
      }),
    ]);
    expect(ctx.db.tables.rounds[0]).toMatchObject({
      _id: "round-1",
      status: "revealed",
      endedReason: "all_voted",
      resultType: "most_voted",
      resultValue: "5",
      consensusReached: true,
    });
  });

  it("rejects late votes after expiring the round", async () => {
    vi.spyOn(Date, "now").mockReturnValue(31_000);

    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerUserId: "user-1",
          scaleType: "fibonacci",
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: true,
          votingTimeLimitSeconds: 30,
          status: "voting",
          activeRoundId: "round-1",
        },
      ],
      rounds: [
        {
          _id: "round-1",
          roomId: "room-1",
          status: "voting",
          roundNumber: 1,
          startedAt: 0,
          endedReason: null,
          resultType: null,
          resultValue: null,
        },
      ],
      participants: [
        {
          _id: "guest-1",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token",
          displayName: "Alex",
          isActive: true,
          lastSeenAt: 31_000,
        },
      ],
    });

    await expect(
      (castVote as any)._handler(ctx, {
        roomId: "room-1",
        roundId: "round-1",
        participantId: "guest-1",
        value: "8",
        guestToken: "guest-token",
      }),
    ).rejects.toThrow("Voting time limit has expired");

    expect(ctx.db.tables.votes).toEqual([
      expect.objectContaining({
        participantId: "guest-1",
        value: "?",
        submittedAt: 31_000,
      }),
    ]);
    expect(ctx.db.tables.rounds[0]).toMatchObject({
      _id: "round-1",
      status: "revealed",
      endedReason: "all_voted",
    });
  });
});

describe("rounds.readyCheck", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authState.user = { _id: "user-1" };
    vi.spyOn(authComponent, "safeGetAuthUser").mockImplementation(async () => authState.user as any);
  });

  it("starts a ready check for all non-host participants", async () => {
    vi.spyOn(Date, "now").mockReturnValue(10_000);

    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerUserId: "user-1",
          status: "idle",
          updatedAt: 0,
        },
      ],
      participants: [
        {
          _id: "host-1",
          roomId: "room-1",
          kind: "host",
          hostUserId: "user-1",
          displayName: "Dealer",
          isActive: true,
          lastSeenAt: 10_000,
        },
        {
          _id: "guest-1",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token",
          displayName: "Alex",
          isActive: true,
          lastSeenAt: 10_000,
        },
        {
          _id: "viewer-1",
          roomId: "room-1",
          kind: "viewer",
          guestTokenHash: "viewer-token",
          displayName: "Pat",
          isActive: true,
          lastSeenAt: 10_000,
        },
        {
          _id: "guest-2",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "stale-guest-token",
          displayName: "Sam",
          isActive: true,
          lastSeenAt: -200_000,
        },
      ],
    });

    await (startReadyCheck as any)._handler(ctx, {
      roomId: "room-1",
    });

    expect(ctx.db.tables.rooms[0]).toMatchObject({
      _id: "room-1",
      readyCheckStartedAt: 10_000,
      readyCheckExpiresAt: 25_000,
      readyCheckIsActive: true,
    });
    expect(ctx.db.tables.participants[0]).toMatchObject({
      _id: "host-1",
    });
    expect(ctx.db.tables.participants[0]).not.toHaveProperty("readyCheckStatus");
    expect(ctx.db.tables.participants[1]).toMatchObject({
      _id: "guest-1",
      readyCheckStatus: "pending",
      readyCheckStartedAt: 10_000,
    });
    expect(ctx.db.tables.participants[2]).toMatchObject({
      _id: "viewer-1",
      readyCheckStatus: "pending",
      readyCheckStartedAt: 10_000,
    });
    expect(ctx.db.tables.participants[3]).toMatchObject({
      _id: "guest-2",
    });
    expect(ctx.db.tables.participants[3]).not.toHaveProperty("readyCheckStatus");
  });

  it("records participant responses and auto-fails unanswered participants at timeout", async () => {
    vi.spyOn(Date, "now").mockReturnValue(12_000);

    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerUserId: "user-1",
          status: "idle",
          readyCheckStartedAt: 10_000,
          readyCheckExpiresAt: 25_000,
          readyCheckIsActive: true,
          updatedAt: 0,
        },
      ],
      participants: [
        {
          _id: "guest-1",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token-1",
          displayName: "Alex",
          isActive: true,
          lastSeenAt: 10_000,
          readyCheckStatus: "pending",
          readyCheckStartedAt: 10_000,
        },
        {
          _id: "guest-2",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token-2",
          displayName: "Sam",
          isActive: true,
          lastSeenAt: 10_000,
          readyCheckStatus: "pending",
          readyCheckStartedAt: 10_000,
        },
      ],
    });

    await (respondReadyCheck as any)._handler(ctx, {
      roomId: "room-1",
      participantId: "guest-1",
      answer: "yes",
      guestToken: "guest-token-1",
    });

    expect(ctx.db.tables.participants[0]).toMatchObject({
      _id: "guest-1",
      readyCheckStatus: "yes",
      readyCheckRespondedAt: 12_000,
    });

    vi.spyOn(Date, "now").mockReturnValue(26_000);

    await (syncReadyCheckTimeout as any)._handler(ctx, {
      roomId: "room-1",
    });

    expect(ctx.db.tables.rooms[0]).toMatchObject({
      _id: "room-1",
      readyCheckIsActive: false,
    });
    expect(ctx.db.tables.participants).toEqual([
      expect.objectContaining({
        _id: "guest-1",
        readyCheckStatus: "yes",
      }),
      expect.objectContaining({
        _id: "guest-2",
        readyCheckStatus: "no",
        readyCheckRespondedAt: 26_000,
      }),
    ]);
  });

  it("ends the ready check as soon as every participant has responded", async () => {
    vi.spyOn(Date, "now").mockReturnValue(12_000);

    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerUserId: "user-1",
          status: "idle",
          readyCheckStartedAt: 10_000,
          readyCheckExpiresAt: 25_000,
          readyCheckIsActive: true,
          updatedAt: 0,
        },
      ],
      participants: [
        {
          _id: "guest-1",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token-1",
          displayName: "Alex",
          isActive: true,
          lastSeenAt: 10_000,
          readyCheckStatus: "pending",
          readyCheckStartedAt: 10_000,
        },
      ],
    });

    await (respondReadyCheck as any)._handler(ctx, {
      roomId: "room-1",
      participantId: "guest-1",
      answer: "yes",
      guestToken: "guest-token-1",
    });

    expect(ctx.db.tables.rooms[0]).toMatchObject({
      _id: "room-1",
      readyCheckIsActive: false,
    });
    expect(ctx.db.tables.participants[0]).toMatchObject({
      _id: "guest-1",
      readyCheckStatus: "yes",
      readyCheckRespondedAt: 12_000,
    });
  });

  it("lets expired guests rejoin an active ready check with yes", async () => {
    vi.spyOn(Date, "now").mockReturnValue(212_000);

    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerUserId: "user-1",
          status: "idle",
          readyCheckStartedAt: 210_000,
          readyCheckExpiresAt: 225_000,
          readyCheckIsActive: true,
          updatedAt: 0,
        },
      ],
      participants: [
        {
          _id: "guest-1",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token-1",
          displayName: "Alex",
          isActive: true,
          lastSeenAt: 212_000,
          readyCheckStatus: "pending",
          readyCheckStartedAt: 210_000,
        },
        {
          _id: "guest-2",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token-2",
          displayName: "Sam",
          isActive: true,
          lastSeenAt: 90_000,
        },
        {
          _id: "guest-3",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token-3",
          displayName: "Pat",
          isActive: true,
          lastSeenAt: 212_000,
          readyCheckStatus: "pending",
          readyCheckStartedAt: 210_000,
        },
      ],
    });

    await (respondReadyCheck as any)._handler(ctx, {
      roomId: "room-1",
      participantId: "guest-2",
      answer: "yes",
      guestToken: "guest-token-2",
    });

    expect(ctx.db.tables.rooms[0]).toMatchObject({
      _id: "room-1",
      readyCheckIsActive: true,
    });
    expect(ctx.db.tables.participants[1]).toMatchObject({
      _id: "guest-2",
      readyCheckStatus: "yes",
      readyCheckStartedAt: 210_000,
      readyCheckRespondedAt: 212_000,
      lastSeenAt: 212_000,
      isActive: true,
    });
  });

  it("ends immediately when the owner is alone in the room", async () => {
    vi.spyOn(Date, "now").mockReturnValue(10_000);

    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerUserId: "user-1",
          status: "idle",
          updatedAt: 0,
        },
      ],
      participants: [
        {
          _id: "host-1",
          roomId: "room-1",
          kind: "host",
          hostUserId: "user-1",
          displayName: "Dealer",
          isActive: true,
          lastSeenAt: 10_000,
        },
      ],
    });

    await (startReadyCheck as any)._handler(ctx, {
      roomId: "room-1",
    });

    expect(ctx.db.tables.rooms[0]).toMatchObject({
      _id: "room-1",
      readyCheckStartedAt: 10_000,
      readyCheckExpiresAt: 25_000,
      readyCheckIsActive: false,
    });
  });

  it("reports whether everyone was ready in the room state", async () => {
    vi.spyOn(Date, "now").mockReturnValue(20_000);

    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerUserId: "user-1",
          slug: "demo-room",
          name: "Sprint Poker",
          scaleType: "fibonacci",
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: true,
          status: "idle",
          readyCheckStartedAt: 10_000,
          readyCheckExpiresAt: 25_000,
          readyCheckIsActive: false,
        },
      ],
      participants: [
        {
          _id: "host-1",
          roomId: "room-1",
          kind: "host",
          hostUserId: "user-1",
          displayName: "Dealer",
          isActive: true,
          lastSeenAt: 20_000,
        },
        {
          _id: "guest-1",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token-1",
          displayName: "Alex",
          isActive: true,
          lastSeenAt: 20_000,
          readyCheckStatus: "yes",
          readyCheckStartedAt: 10_000,
          readyCheckRespondedAt: 12_000,
        },
        {
          _id: "guest-2",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token-2",
          displayName: "Sam",
          isActive: true,
          lastSeenAt: 20_000,
          readyCheckStatus: "no",
          readyCheckStartedAt: 10_000,
          readyCheckRespondedAt: 13_000,
        },
      ],
    });

    const roomState = await buildRoomState(ctx as any, "demo-room");

    expect(roomState?.readyCheck).toMatchObject({
      isActive: false,
      result: "not_all_ready",
    });
  });

  it("exposes a rejoin prompt for an expired guest during an active ready check", async () => {
    vi.spyOn(Date, "now").mockReturnValue(212_000);
    authState.user = undefined;

    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerUserId: "user-1",
          slug: "demo-room",
          name: "Sprint Poker",
          scaleType: "fibonacci",
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: true,
          status: "idle",
          readyCheckStartedAt: 210_000,
          readyCheckExpiresAt: 225_000,
          readyCheckIsActive: true,
        },
      ],
      participants: [
        {
          _id: "host-1",
          roomId: "room-1",
          kind: "host",
          hostUserId: "user-1",
          displayName: "Dealer",
          isActive: true,
          lastSeenAt: 212_000,
        },
        {
          _id: "guest-1",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token-1",
          displayName: "Alex",
          isActive: true,
          lastSeenAt: 90_000,
        },
      ],
    });

    const roomState = await buildRoomState(ctx as any, "demo-room", "guest-token-1");

    expect(roomState?.readyCheck).toMatchObject({
      isActive: true,
      viewerCanRespond: false,
      viewerCanRejoin: true,
      viewerRejoinParticipantId: "guest-1",
    });
    expect(roomState?.viewer).toMatchObject({
      participantId: null,
      needsJoin: true,
    });
  });

  it("ignores expired guests when computing the finished ready check result", async () => {
    vi.spyOn(Date, "now").mockReturnValue(220_000);

    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerUserId: "user-1",
          slug: "demo-room",
          name: "Sprint Poker",
          scaleType: "fibonacci",
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: true,
          status: "idle",
          readyCheckStartedAt: 210_000,
          readyCheckExpiresAt: 225_000,
          readyCheckIsActive: false,
        },
      ],
      participants: [
        {
          _id: "host-1",
          roomId: "room-1",
          kind: "host",
          hostUserId: "user-1",
          displayName: "Dealer",
          isActive: true,
          lastSeenAt: 220_000,
        },
        {
          _id: "guest-1",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token-1",
          displayName: "Alex",
          isActive: true,
          lastSeenAt: 220_000,
          readyCheckStatus: "yes",
          readyCheckStartedAt: 210_000,
          readyCheckRespondedAt: 212_000,
        },
        {
          _id: "guest-2",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-token-2",
          displayName: "Sam",
          isActive: true,
          lastSeenAt: 90_000,
          readyCheckStatus: "pending",
          readyCheckStartedAt: 210_000,
        },
      ],
    });

    const roomState = await buildRoomState(ctx as any, "demo-room");

    expect(roomState?.readyCheck).toMatchObject({
      isActive: false,
      result: "all_ready",
    });
  });
});
