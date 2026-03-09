import { describe, expect, expectTypeOf, it } from "vitest";

import type { Doc } from "./_generated/dataModel";
import { filterVotesForRoom } from "./pokerHelpers";

describe("pokerHelpers", () => {
  it("filters host votes out of room tallies when host voting is disabled", () => {
    const votes = [
      { participantId: "host-1", value: "13" },
      { participantId: "guest-1", value: "3" },
    ] as any;
    const participants = [
      { _id: "host-1", kind: "host" },
      { _id: "guest-1", kind: "guest" },
    ] as any;

    expect(filterVotesForRoom(votes, participants, { hostVotingEnabled: false } as any)).toEqual([
      { participantId: "guest-1", value: "3" },
    ]);
  });

  it("keeps host votes in room tallies when host voting is enabled", () => {
    const votes = [
      { participantId: "host-1", value: "13" },
      { participantId: "guest-1", value: "3" },
    ] as any;
    const participants = [
      { _id: "host-1", kind: "host" },
      { _id: "guest-1", kind: "guest" },
    ] as any;

    expect(filterVotesForRoom(votes, participants, { hostVotingEnabled: true } as any)).toEqual(votes);
  });

  it("preserves the full vote document type for downstream consumers", () => {
    const votes = [] as Doc<"votes">[];
    const participants = [] as Pick<Doc<"participants">, "_id" | "kind">[];
    const filteredVotes = filterVotesForRoom(votes, participants, {
      hostVotingEnabled: true,
    } as Pick<Doc<"rooms">, "hostVotingEnabled">);

    expectTypeOf(filteredVotes).toEqualTypeOf<Doc<"votes">[]>();
  });
});
