import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./rateLimit", () => ({
  assertGuestJoinRateLimit: vi.fn(async () => {}),
  assertParticipantModerationRateLimit: vi.fn(async () => {}),
}));

import { joinAsViewer } from "./participants";

type TableName = "rooms" | "participants" | "rounds" | "votes";

class FakeDb {
  tables: Record<TableName, any[]>;

  constructor(seed: Partial<Record<TableName, any[]>>) {
    this.tables = {
      rooms: seed.rooms ?? [],
      participants: seed.participants ?? [],
      rounds: seed.rounds ?? [],
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

  async delete(id: string) {
    for (const table of Object.values(this.tables)) {
      const index = table.findIndex((doc) => doc._id === id);
      if (index >= 0) {
        table.splice(index, 1);
        return;
      }
    }
  }
}

function createCtx(seed: Partial<Record<TableName, any[]>>) {
  return {
    db: new FakeDb(seed),
  };
}

describe("participants.joinAsViewer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a view-only participant with a guest token", async () => {
    const now = 1_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);

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
        },
      ],
    });

    const result = await (joinAsViewer as any)._handler(ctx, {
      slug: "demo-room",
      nickname: "Pat",
    });

    expect(result.guestToken).toBeTypeOf("string");
    expect(ctx.db.tables.participants).toHaveLength(1);
    expect(ctx.db.tables.participants[0]).toMatchObject({
      roomId: "room-1",
      kind: "viewer",
      displayName: "Pat",
      isActive: true,
      lastSeenAt: now,
      createdAt: now,
    });
  });
});
