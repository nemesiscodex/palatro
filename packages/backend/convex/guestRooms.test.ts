import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./rateLimit", () => ({
  assertRoomCreateRateLimit: vi.fn(async () => {}),
  assertRoomDeleteRateLimit: vi.fn(async () => {}),
  assertRoomSettingsRateLimit: vi.fn(async () => {}),
  assertRoundControlRateLimit: vi.fn(async () => {}),
  assertVoteCastRateLimit: vi.fn(async () => {}),
  assertGuestJoinRateLimit: vi.fn(async () => {}),
  assertParticipantModerationRateLimit: vi.fn(async () => {}),
}));

import { authComponent } from "./auth";
import { joinAsHost, kick } from "./participants";
import {
  claimGuestOwnership,
  createGuest,
  getBySlug,
  listMine,
  updateConfig,
  updatePassword,
} from "./rooms";
import { forceFinish, start } from "./rounds";

type TableName = "rooms" | "participants" | "rounds" | "votes";
type TestCtx = ReturnType<typeof createCtx>;
type AuthUser = Awaited<ReturnType<typeof authComponent.safeGetAuthUser>> | undefined;

interface MutationHandler<TArgs, TResult> {
  _handler: (ctx: TestCtx, args: TArgs) => Promise<TResult>;
}

function getMutationHandler<TArgs, TResult>(mutation: unknown): MutationHandler<TArgs, TResult> {
  return mutation as MutationHandler<TArgs, TResult>;
}

const authState = {
  user: undefined as AuthUser,
};

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

    const applyFilters = () =>
      table.filter((doc) => filters.every((filter) => doc[filter.field] === filter.value));

    const chain = {
      collect: async () => applyFilters(),
      unique: async () => applyFilters()[0] ?? null,
      order: (_direction: "asc" | "desc") => chain,
    };

    return {
      withIndex: (_indexName: string, callback: (q: any) => unknown) => {
        const indexChain = {
          eq: (field: string, value: unknown) => {
            filters.push({ field, value });
            return indexChain;
          },
        };
        callback(indexChain);
        return chain;
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

describe("guest-owned rooms", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authState.user = undefined;
    vi.spyOn(authComponent, "safeGetAuthUser").mockImplementation(async () => authState.user);
  });

  it("creates a guest room without auth using a generated slug", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("guest-room-slug" as `${string}-${string}-${string}-${string}-${string}`);
    const now = 1_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const ctx = createCtx({});

    const result = await getMutationHandler<
      {
        name: string;
        scaleType: "fibonacci";
        consensusMode: "plurality";
        consensusThreshold: number;
        hostVotingEnabled: boolean;
        guestOwnerToken: string;
      },
      { roomId: string; slug: string }
    >(createGuest)._handler(ctx, {
      name: "Guest Poker",
      scaleType: "fibonacci",
      consensusMode: "plurality",
      consensusThreshold: 70,
      hostVotingEnabled: true,
      guestOwnerToken: "owner-123",
    });

    expect(result).toEqual({
      roomId: "rooms-1",
      slug: "guest-room-slug",
    });
    expect(ctx.db.tables.rooms[0]).toMatchObject({
      ownerKind: "guest",
      ownerGuestTokenHash: "owner-123",
      slug: "guest-room-slug",
      guestExpiresAt: now + 24 * 60 * 60 * 1000,
      lastActivityAt: now,
    });
  });

  it("creates a guest room with a persisted custom scale", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("guest-custom-room" as `${string}-${string}-${string}-${string}-${string}`);
    const now = 1_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const ctx = createCtx({});

    await getMutationHandler<
      {
        name: string;
        scaleType: "custom";
        customScaleValues: string[];
        consensusMode: "plurality";
        consensusThreshold: number;
        hostVotingEnabled: boolean;
        guestOwnerToken: string;
      },
      { roomId: string; slug: string }
    >(createGuest)._handler(ctx, {
      name: "Guest Poker",
      scaleType: "custom",
      customScaleValues: ["1", "2", "a"],
      consensusMode: "plurality",
      consensusThreshold: 70,
      hostVotingEnabled: true,
      guestOwnerToken: "owner-123",
    });

    expect(ctx.db.tables.rooms[0]).toMatchObject({
      scaleType: "custom",
      customScaleValues: ["1", "2", "a"],
    });
  });

  it("rejects a second active guest room for the same device token", async () => {
    const now = 1_500_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerKind: "guest",
          ownerGuestTokenHash: "owner-123",
          slug: "existing-room",
          name: "Existing",
          scaleType: "fibonacci",
          allowUnknown: true,
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: true,
          status: "idle",
          createdAt: now - 1_000,
          lastActivityAt: now - 1_000,
          guestExpiresAt: now + 10_000,
          updatedAt: now - 1_000,
        },
      ],
    });

    await expect(
      getMutationHandler<
        {
          name: string;
          scaleType: "fibonacci";
          consensusMode: "plurality";
          consensusThreshold: number;
          hostVotingEnabled: boolean;
          guestOwnerToken: string;
        },
        { roomId: string; slug: string }
      >(createGuest)._handler(ctx, {
        name: "Guest Poker",
        scaleType: "fibonacci",
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        guestOwnerToken: "owner-123",
      }),
    ).rejects.toThrow("You already have an active guest room on this device.");
  });

  it("lets a guest owner join as host, kick guests, update config, and control rounds", async () => {
    const now = 2_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerKind: "guest",
          ownerGuestTokenHash: "owner-123",
          slug: "demo-room",
          name: "Demo",
          scaleType: "fibonacci",
          allowUnknown: true,
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: true,
          status: "idle",
          createdAt: now - 1_000,
          lastActivityAt: now - 1_000,
          guestExpiresAt: now + 10_000,
          updatedAt: now - 1_000,
        },
      ],
      participants: [
        {
          _id: "guest-1",
          roomId: "room-1",
          kind: "guest",
          guestTokenHash: "guest-abc",
          displayName: "Alex",
          isActive: true,
          lastSeenAt: now,
          createdAt: now,
        },
      ],
    });

    const hostResult = await getMutationHandler<
      { slug: string; guestOwnerToken: string },
      { participantId: string }
    >(joinAsHost)._handler(ctx, {
      slug: "demo-room",
      guestOwnerToken: "owner-123",
    });
    expect(hostResult).toEqual({ participantId: "participants-2" });
    expect(ctx.db.tables.participants[1]).toMatchObject({
      roomId: "room-1",
      kind: "host",
      guestTokenHash: "owner-123",
      displayName: "Host",
    });

    await getMutationHandler<
      { roomId: string; participantId: string; guestOwnerToken: string },
      null
    >(kick)._handler(ctx, {
      roomId: "room-1",
      participantId: "guest-1",
      guestOwnerToken: "owner-123",
    });
    expect(ctx.db.tables.participants[0]).toMatchObject({
      isActive: false,
    });

    await getMutationHandler<
      {
        roomId: string;
        scaleType: "powers_of_two" | "fibonacci";
        consensusMode: "threshold" | "plurality";
        consensusThreshold: number;
        hostVotingEnabled: boolean;
        guestOwnerToken: string;
      },
      unknown
    >(updateConfig)._handler(ctx, {
      roomId: "room-1",
      scaleType: "powers_of_two",
      consensusMode: "threshold",
      consensusThreshold: 80,
      hostVotingEnabled: false,
      guestOwnerToken: "owner-123",
    });
    expect(ctx.db.tables.rooms[0]).toMatchObject({
      scaleType: "powers_of_two",
      consensusMode: "threshold",
      consensusThreshold: 80,
      hostVotingEnabled: false,
    });

    await getMutationHandler<
      { roomId: string; guestOwnerToken: string },
      { roomId: string; roundId: string }
    >(start)._handler(ctx, {
      roomId: "room-1",
      guestOwnerToken: "owner-123",
    });
    expect(ctx.db.tables.rooms[0]).toMatchObject({
      status: "voting",
      activeRoundId: "rounds-1",
    });

    await getMutationHandler<
      { roomId: string; guestOwnerToken: string },
      unknown
    >(forceFinish)._handler(ctx, {
      roomId: "room-1",
      guestOwnerToken: "owner-123",
    });
    expect(ctx.db.tables.rooms[0]).toMatchObject({
      status: "revealed",
    });
    expect(ctx.db.tables.rounds[0]).toMatchObject({
      status: "revealed",
      endedReason: "forced",
    });
  });

  it("rejects invalid custom scale updates", async () => {
    const now = 2_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerKind: "guest",
          ownerGuestTokenHash: "owner-123",
          slug: "demo-room",
          name: "Demo",
          scaleType: "fibonacci",
          allowUnknown: true,
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: true,
          status: "idle",
          createdAt: now - 1_000,
          lastActivityAt: now - 1_000,
          guestExpiresAt: now + 10_000,
          updatedAt: now - 1_000,
        },
      ],
    });

    await expect(
      getMutationHandler<
        {
          roomId: string;
          scaleType: "custom";
          customScaleValues: string[];
          consensusMode: "plurality";
          consensusThreshold: number;
          hostVotingEnabled: boolean;
          guestOwnerToken: string;
        },
        unknown
      >(updateConfig)._handler(ctx, {
        roomId: "room-1",
        scaleType: "custom",
        customScaleValues: ["1", "2"],
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        guestOwnerToken: "owner-123",
      }),
    ).rejects.toThrow("Custom scale must include at least 3 values");
  });

  it("rejects password changes for guest-owned rooms", async () => {
    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerKind: "guest",
          ownerGuestTokenHash: "owner-123",
          slug: "demo-room",
          name: "Demo",
          scaleType: "fibonacci",
          allowUnknown: true,
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: true,
          status: "idle",
          createdAt: 1,
          lastActivityAt: 1,
          guestExpiresAt: Date.now() + 10_000,
          updatedAt: 1,
        },
      ],
    });

    await expect(
      getMutationHandler<
        { roomId: string; password: string },
        { hasPassword: boolean }
      >(updatePassword)._handler(ctx, {
        roomId: "room-1",
        password: "secret",
      }),
    ).rejects.toThrow("Create an account to unlock room passwords.");
  });

  it("rejects mismatched guest-owner tokens and registered non-owners", async () => {
    const now = Date.now();
    const ctx = createCtx({
      rooms: [
        {
          _id: "guest-room",
          ownerKind: "guest",
          ownerGuestTokenHash: "owner-123",
          slug: "guest-room",
          name: "Guest",
          scaleType: "fibonacci",
          allowUnknown: true,
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: true,
          status: "idle",
          createdAt: now,
          lastActivityAt: now,
          guestExpiresAt: now + 10_000,
          updatedAt: now,
        },
        {
          _id: "registered-room",
          ownerKind: "registered",
          ownerUserId: "user-1",
          slug: "registered-room",
          name: "Registered",
          scaleType: "fibonacci",
          allowUnknown: true,
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: true,
          status: "idle",
          createdAt: now,
          lastActivityAt: now,
          updatedAt: now,
        },
      ],
    });

    await expect(
      getMutationHandler<
        {
          roomId: string;
          scaleType: "fibonacci";
          consensusMode: "plurality";
          consensusThreshold: number;
          hostVotingEnabled: boolean;
          guestOwnerToken: string;
        },
        unknown
      >(updateConfig)._handler(ctx, {
        roomId: "guest-room",
        scaleType: "fibonacci",
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        guestOwnerToken: "wrong-token",
      }),
    ).rejects.toThrow("Only the room owner can do that");

    authState.user = { _id: "user-2" } as unknown as AuthUser;
    await expect(
      getMutationHandler<
        {
          roomId: string;
          scaleType: "fibonacci";
          consensusMode: "plurality";
          consensusThreshold: number;
          hostVotingEnabled: boolean;
        },
        unknown
      >(updateConfig)._handler(ctx, {
        roomId: "registered-room",
        scaleType: "fibonacci",
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
      }),
    ).rejects.toThrow("Only the room owner can do that");
  });

  it("claims a guest room for the authenticated user and lists it in their dashboard", async () => {
    const now = Date.now();
    authState.user = { _id: "user-7", name: "Dealer" } as unknown as AuthUser;
    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerKind: "guest",
          ownerGuestTokenHash: "owner-123",
          slug: "demo-room",
          name: "Demo",
          scaleType: "fibonacci",
          allowUnknown: true,
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: true,
          status: "idle",
          createdAt: now - 1_000,
          lastActivityAt: now - 1_000,
          guestExpiresAt: now + 10_000,
          updatedAt: now - 1_000,
        },
      ],
      participants: [
        {
          _id: "participant-host-1",
          roomId: "room-1",
          kind: "host",
          guestTokenHash: "owner-123",
          displayName: "Host",
          isActive: true,
          lastSeenAt: now - 500,
          createdAt: now - 900,
        },
      ],
    });

    const stateBeforeClaim = await getMutationHandler<
      { slug: string; guestOwnerToken: string },
      {
        viewer: {
          isOwner: boolean;
          isGuestOwner: boolean;
          canClaimOwnership: boolean;
          isAuthenticated: boolean;
          participantId: string | null;
          needsJoin: boolean;
        };
      }
    >(getBySlug)._handler(ctx, {
      slug: "demo-room",
      guestOwnerToken: "owner-123",
    });
    expect(stateBeforeClaim.viewer).toMatchObject({
      isOwner: true,
      isGuestOwner: true,
      canClaimOwnership: true,
      isAuthenticated: true,
      participantId: "participant-host-1",
      needsJoin: false,
    });

    await getMutationHandler<
      { roomId: string; guestOwnerToken: string },
      { roomId: string; slug: string }
    >(claimGuestOwnership)._handler(ctx, {
      roomId: "room-1",
      guestOwnerToken: "owner-123",
    });

    expect(ctx.db.tables.rooms[0]).toMatchObject({
      ownerKind: "registered",
      ownerUserId: "user-7",
      ownerGuestTokenHash: undefined,
      guestExpiresAt: undefined,
    });
    expect(ctx.db.tables.participants).toHaveLength(1);
    expect(ctx.db.tables.participants[0]).toMatchObject({
      _id: "participant-host-1",
      kind: "host",
      hostUserId: "user-7",
      guestTokenHash: undefined,
      displayName: "Dealer",
      isActive: true,
    });

    const stateAfterClaim = await getMutationHandler<
      { slug: string; guestOwnerToken: string },
      {
        viewer: {
          isOwner: boolean;
          isGuestOwner: boolean;
          canClaimOwnership: boolean;
          isAuthenticated: boolean;
          participantId: string | null;
          needsJoin: boolean;
        };
      }
    >(getBySlug)._handler(ctx, {
      slug: "demo-room",
      guestOwnerToken: "owner-123",
    });
    expect(stateAfterClaim.viewer).toMatchObject({
      isOwner: true,
      isGuestOwner: false,
      canClaimOwnership: false,
      isAuthenticated: true,
      participantId: "participant-host-1",
      needsJoin: false,
    });

    const rooms = await getMutationHandler<Record<string, never>, Array<{ id: string; slug: string }>>(
      listMine,
    )._handler(ctx, {});
    expect(rooms).toHaveLength(1);
    expect(rooms[0]).toMatchObject({
      id: "room-1",
      slug: "demo-room",
    });

    authState.user = undefined;
    await expect(
      getMutationHandler<
        {
          roomId: string;
          scaleType: "fibonacci";
          consensusMode: "plurality";
          consensusThreshold: number;
          hostVotingEnabled: boolean;
          guestOwnerToken: string;
        },
        unknown
      >(updateConfig)._handler(ctx, {
        roomId: "room-1",
        scaleType: "fibonacci",
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        guestOwnerToken: "owner-123",
      }),
    ).rejects.toThrow("Not authenticated");
  });

  it("treats expired guest rooms as inaccessible", async () => {
    const now = 5_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const ctx = createCtx({
      rooms: [
        {
          _id: "room-1",
          ownerKind: "guest",
          ownerGuestTokenHash: "owner-123",
          slug: "expired-room",
          name: "Expired",
          scaleType: "fibonacci",
          allowUnknown: true,
          consensusMode: "plurality",
          consensusThreshold: 70,
          hostVotingEnabled: true,
          status: "idle",
          createdAt: now - 10_000,
          lastActivityAt: now - 10_000,
          guestExpiresAt: now - 1,
          updatedAt: now - 10_000,
        },
      ],
    });

    const state = await getMutationHandler<
      { slug: string; guestOwnerToken: string },
      unknown
    >(getBySlug)._handler(ctx, {
      slug: "expired-room",
      guestOwnerToken: "owner-123",
    });
    expect(state).toBeNull();

    await expect(
      getMutationHandler<
        {
          roomId: string;
          scaleType: "fibonacci";
          consensusMode: "plurality";
          consensusThreshold: number;
          hostVotingEnabled: boolean;
          guestOwnerToken: string;
        },
        unknown
      >(updateConfig)._handler(ctx, {
        roomId: "room-1",
        scaleType: "fibonacci",
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        guestOwnerToken: "owner-123",
      }),
    ).rejects.toThrow("This guest room has expired. Create an account to keep rooms longer.");
  });
});
