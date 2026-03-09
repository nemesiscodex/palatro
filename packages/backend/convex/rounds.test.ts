import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./rateLimit", () => ({
  assertRoundControlRateLimit: vi.fn(async () => {}),
  assertVoteCastRateLimit: vi.fn(async () => {}),
}));

import { authComponent } from "./auth";
import { castVote } from "./rounds";

const authState = {
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
});
