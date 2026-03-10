import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetSharedMocks, toastError, toastSuccess } from "@/test/mocks";

const routeState = {
  queryValue: undefined as any,
  queryCalls: [] as any[],
  posthogCapture: vi.fn(),
  playSound: vi.fn(),
  mutations: {
    joinAsGuest: vi.fn(),
    joinAsViewer: vi.fn(),
    joinAsHost: vi.fn(),
    heartbeat: vi.fn(),
    leave: vi.fn(),
    kick: vi.fn(),
    castVote: vi.fn(),
    start: vi.fn(),
    restart: vi.fn(),
    forceFinish: vi.fn(),
    updateConfig: vi.fn(),
    updatePassword: vi.fn(),
  },
};

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock("@posthog/react", () => ({
  usePostHog: () => ({
    capture: routeState.posthogCapture,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: any) => ({
    ...options,
    id: path,
    useParams: () => ({ slug: "demo-room" }),
  }),
}));

vi.mock("@palatro/backend/convex/_generated/api", () => ({
  api: {
    rooms: {
      getBySlug: "rooms.getBySlug",
      updateConfig: "rooms.updateConfig",
      updatePassword: "rooms.updatePassword",
    },
    participants: {
      joinAsGuest: "participants.joinAsGuest",
      joinAsViewer: "participants.joinAsViewer",
      joinAsHost: "participants.joinAsHost",
      heartbeat: "participants.heartbeat",
      leave: "participants.leave",
      kick: "participants.kick",
    },
    rounds: {
      castVote: "rounds.castVote",
      start: "rounds.start",
      restart: "rounds.restart",
      forceFinish: "rounds.forceFinish",
    },
  },
}));

vi.mock("convex/react", () => ({
  useQuery: (_key: string, args: unknown) => {
    routeState.queryCalls.push(args);
    return routeState.queryValue;
  },
  useMutation: (key: string) => {
    const map: Record<string, keyof typeof routeState.mutations> = {
      "participants.joinAsGuest": "joinAsGuest",
      "participants.joinAsViewer": "joinAsViewer",
      "participants.joinAsHost": "joinAsHost",
      "participants.heartbeat": "heartbeat",
      "participants.leave": "leave",
      "participants.kick": "kick",
      "rounds.castVote": "castVote",
      "rounds.start": "start",
      "rounds.restart": "restart",
      "rounds.forceFinish": "forceFinish",
      "rooms.updateConfig": "updateConfig",
      "rooms.updatePassword": "updatePassword",
    };

    return routeState.mutations[map[key]];
  },
}));

vi.mock("@/hooks/use-app-sound", () => ({
  useAppSound: () => routeState.playSound,
}));

vi.mock("@/lib/site-url", () => ({
  getSiteUrl: () => "https://palatro.nemesiscodex.org",
}));

import { RoomPage, Route } from "./$slug";

describe("RoomPage", () => {
  beforeEach(() => {
    routeState.queryValue = undefined;
    routeState.queryCalls = [];
    for (const mutation of Object.values(routeState.mutations)) {
      mutation.mockReset();
    }
    routeState.posthogCapture.mockReset();
    routeState.playSound.mockReset();
    resetSharedMocks();
  });

  it("waits for storage before querying and shows the loading state first", async () => {
    routeState.queryValue = undefined;

    render(<RoomPage slug="demo-room" />);

    expect(screen.getByText("Loading room...")).toBeInTheDocument();
    expect(routeState.queryCalls[0]).toBe("skip");
  });

  it("renders the join flow and stores the guest token after a successful join", async () => {
    routeState.queryValue = {
      room: {
        id: "room-1",
        name: "Sprint Poker",
        slug: "demo-room",
        scaleType: "fibonacci",
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        status: "idle",
        hasPassword: false,
      },
      deck: ["1", "2", "3"],
      participants: [],
      activeRound: null,
      viewer: {
        isOwner: false,
        participantId: null,
        participantKind: null,
        canVote: false,
        needsJoin: true,
        currentVote: null,
        displayName: "",
        isAuthenticated: false,
      },
    };
    routeState.mutations.joinAsGuest.mockResolvedValue({ guestToken: "guest-123" });

    render(<RoomPage slug="demo-room" />);

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Alex" } });
    fireEvent.click(screen.getByRole("button", { name: "Join the table" }));

    await waitFor(() => {
      expect(routeState.mutations.joinAsGuest).toHaveBeenCalledWith({
        slug: "demo-room",
        nickname: "Alex",
        guestToken: undefined,
        password: undefined,
      });
    });
    expect(window.localStorage.getItem("pointing-poker:guest-token:demo-room")).toBe("guest-123");
    expect(toastSuccess).toHaveBeenCalledWith("Joined room");
  });

  it("joins as view only and stores the guest token after a successful join", async () => {
    routeState.queryValue = {
      room: {
        id: "room-1",
        name: "Sprint Poker",
        slug: "demo-room",
        scaleType: "fibonacci",
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        status: "idle",
        hasPassword: false,
      },
      deck: ["1", "2", "3"],
      participants: [],
      activeRound: null,
      viewer: {
        isOwner: false,
        participantId: null,
        participantKind: null,
        canVote: false,
        needsJoin: true,
        currentVote: null,
        displayName: "",
        isAuthenticated: false,
      },
    };
    routeState.mutations.joinAsViewer.mockResolvedValue({ guestToken: "viewer-123" });

    render(<RoomPage slug="demo-room" />);

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Alex" } });
    fireEvent.click(screen.getByRole("button", { name: "View only" }));
    fireEvent.click(screen.getByRole("button", { name: "Join as viewer" }));

    await waitFor(() => {
      expect(routeState.mutations.joinAsViewer).toHaveBeenCalledWith({
        slug: "demo-room",
        nickname: "Alex",
        guestToken: undefined,
        password: undefined,
      });
    });
    expect(window.localStorage.getItem("pointing-poker:guest-token:demo-room")).toBe("viewer-123");
    expect(toastSuccess).toHaveBeenCalledWith("Joined as viewer");
  });

  it("auto-joins the host when the owner needs a seat", async () => {
    routeState.queryValue = {
      room: {
        id: "room-1",
        name: "Sprint Poker",
        slug: "demo-room",
        scaleType: "fibonacci",
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        status: "idle",
        hasPassword: false,
      },
      deck: ["1", "2", "3"],
      participants: [],
      activeRound: null,
      viewer: {
        isOwner: true,
        participantId: null,
        participantKind: null,
        canVote: false,
        needsJoin: true,
        currentVote: null,
        displayName: "Dealer",
        isAuthenticated: true,
      },
    };
    routeState.mutations.joinAsHost.mockResolvedValue({ participantId: "host-1" });

    render(<RoomPage slug="demo-room" />);

    await waitFor(() => {
      expect(routeState.mutations.joinAsHost).toHaveBeenCalledWith({ slug: "demo-room" });
    });
  });

  it("submits votes when the viewer can vote", async () => {
    routeState.queryValue = {
      room: {
        id: "room-1",
        name: "Sprint Poker",
        slug: "demo-room",
        scaleType: "fibonacci",
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        status: "voting",
        hasPassword: false,
      },
      deck: ["1", "2", "3"],
      participants: [{ id: "guest-1", displayName: "Alex", hasVoted: false, revealedVote: null, kind: "guest" }],
      activeRound: {
        id: "round-1",
        roundNumber: 1,
        status: "voting",
        resultType: null,
        resultValue: null,
      },
      viewer: {
        isOwner: false,
        participantId: "guest-1",
        participantKind: "guest",
        canVote: true,
        needsJoin: false,
        currentVote: null,
        displayName: "Alex",
        isAuthenticated: false,
      },
    };
    routeState.mutations.castVote.mockResolvedValue(null);

    render(<RoomPage slug="demo-room" />);

    fireEvent.click(
      screen.getAllByRole("button").find((button) => button.textContent?.includes("1"))!,
    );

    await waitFor(() => {
      expect(routeState.mutations.castVote).toHaveBeenCalledWith({
        roomId: "room-1",
        roundId: "round-1",
        participantId: "guest-1",
        value: "1",
        guestToken: undefined,
      });
    });
    expect(routeState.posthogCapture).toHaveBeenCalledWith("vote_cast", {
      room_id: "room-1",
      room_slug: "demo-room",
      round_id: "round-1",
      round_number: 1,
      scale_type: "fibonacci",
      vote_value: "1",
      had_previous_vote: false,
      is_owner: false,
    });
  });

  it("shows results and owner controls in the appropriate states", () => {
    routeState.queryValue = {
      room: {
        id: "room-1",
        name: "Sprint Poker",
        slug: "demo-room",
        scaleType: "fibonacci",
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        status: "revealed",
        hasPassword: false,
      },
      deck: ["1", "2", "3"],
      participants: [],
      activeRound: {
        id: "round-1",
        roundNumber: 1,
        status: "revealed",
        resultType: "most_voted",
        resultValue: "8",
        consensusReached: true,
      },
      viewer: {
        isOwner: true,
        participantId: "host-1",
        participantKind: "host",
        canVote: false,
        needsJoin: false,
        currentVote: null,
        displayName: "Dealer",
        isAuthenticated: true,
      },
    };

    render(<RoomPage slug="demo-room" />);

    expect(screen.getByRole("main").className).toContain("items-start");
    expect(screen.getByTestId("room-main-column").className).toContain("gap-4");
    expect(screen.getByText("Round 1 result")).toBeInTheDocument();
    expect(screen.getByText("Configuration")).toBeInTheDocument();
    expect(screen.queryByText("Only the room owner can manage rounds.")).not.toBeInTheDocument();
    expect(routeState.posthogCapture).toHaveBeenCalledWith("round_done", {
      room_id: "room-1",
      room_slug: "demo-room",
      round_id: "round-1",
      round_number: 1,
      result_type: "most_voted",
      result_value: "8",
      consensus_reached: true,
      consensus_mode: "plurality",
      consensus_threshold: 70,
      scale_type: "fibonacci",
      votes_count: 0,
      is_owner: true,
    });
  });

  it("allows guests to leave and clears their stored token", async () => {
    window.localStorage.setItem("pointing-poker:guest-token:demo-room", "guest-123");
    routeState.queryValue = {
      room: {
        id: "room-1",
        name: "Sprint Poker",
        slug: "demo-room",
        scaleType: "fibonacci",
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        status: "idle",
        hasPassword: false,
      },
      deck: ["1", "2", "3"],
      participants: [],
      activeRound: null,
      viewer: {
        isOwner: false,
        participantId: "guest-1",
        participantKind: "guest",
        canVote: false,
        needsJoin: false,
        currentVote: null,
        displayName: "Alex",
        isAuthenticated: false,
      },
    };
    routeState.mutations.leave.mockResolvedValue(null);

    render(<RoomPage slug="demo-room" />);

    fireEvent.click(screen.getByRole("button", { name: "Leave table" }));

    await waitFor(() => {
      expect(routeState.mutations.leave).toHaveBeenCalledWith({
        roomId: "room-1",
        participantId: "guest-1",
        guestToken: "guest-123",
      });
    });
    expect(window.localStorage.getItem("pointing-poker:guest-token:demo-room")).toBeNull();
  });

  it("shows a user-facing error when a mutation fails", async () => {
    routeState.queryValue = {
      room: {
        id: "room-1",
        name: "Sprint Poker",
        slug: "demo-room",
        scaleType: "fibonacci",
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        status: "idle",
        hasPassword: false,
      },
      deck: ["1", "2", "3"],
      participants: [],
      activeRound: null,
      viewer: {
        isOwner: false,
        participantId: null,
        participantKind: null,
        canVote: false,
        needsJoin: true,
        currentVote: null,
        displayName: "",
        isAuthenticated: false,
      },
    };
    routeState.mutations.joinAsGuest.mockRejectedValue(new Error("Join failed"));

    render(<RoomPage slug="demo-room" />);

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Alex" } });
    fireEvent.click(screen.getByRole("button", { name: "Join the table" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Join failed");
    });
  });

  it("plays config sound after successful scale and password changes", async () => {
    routeState.queryValue = {
      room: {
        id: "room-1",
        name: "Sprint Poker",
        slug: "demo-room",
        scaleType: "fibonacci",
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        status: "idle",
        hasPassword: true,
      },
      deck: ["1", "2", "3"],
      participants: [],
      activeRound: null,
      viewer: {
        isOwner: true,
        participantId: "host-1",
        participantKind: "host",
        canVote: false,
        needsJoin: false,
        currentVote: null,
        displayName: "Dealer",
        isAuthenticated: true,
      },
    };
    routeState.mutations.updateConfig.mockResolvedValue(null);
    routeState.mutations.updatePassword.mockResolvedValue({ hasPassword: false });

    render(<RoomPage slug="demo-room" />);

    fireEvent.click(screen.getByRole("button", { name: /Power of Two/ }));
    await waitFor(() => {
      expect(routeState.mutations.updateConfig).toHaveBeenCalledWith({
        roomId: "room-1",
        scaleType: "powers_of_two",
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove password" }));
    await waitFor(() => {
      expect(routeState.mutations.updatePassword).toHaveBeenCalledWith({
        roomId: "room-1",
        password: undefined,
      });
    });

    expect(routeState.playSound).toHaveBeenCalledTimes(2);
  });

  it("shows a waiting message for a host-only dealer during voting", () => {
    routeState.queryValue = {
      room: {
        id: "room-1",
        name: "Sprint Poker",
        slug: "demo-room",
        scaleType: "fibonacci",
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: false,
        status: "voting",
        hasPassword: false,
      },
      deck: ["1", "2", "3"],
      participants: [
        { id: "host-1", displayName: "Dealer", hasVoted: false, revealedVote: null, kind: "host" },
      ],
      activeRound: {
        id: "round-1",
        roundNumber: 1,
        status: "voting",
        resultType: null,
        resultValue: null,
      },
      viewer: {
        isOwner: true,
        participantId: "host-1",
        participantKind: "host",
        canVote: false,
        needsJoin: false,
        currentVote: null,
        displayName: "Dealer",
        isAuthenticated: true,
      },
    };

    render(<RoomPage slug="demo-room" />);

    expect(screen.getByText("Hosting this round. Waiting for players to vote.")).toBeInTheDocument();
  });

  it("shows a waiting message for view-only participants during voting", () => {
    routeState.queryValue = {
      room: {
        id: "room-1",
        name: "Sprint Poker",
        slug: "demo-room",
        scaleType: "fibonacci",
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        status: "voting",
        hasPassword: false,
      },
      deck: ["1", "2", "3"],
      participants: [
        { id: "viewer-1", displayName: "Pat", hasVoted: false, revealedVote: null, kind: "viewer" },
      ],
      activeRound: {
        id: "round-1",
        roundNumber: 1,
        status: "voting",
        resultType: null,
        resultValue: null,
      },
      viewer: {
        isOwner: false,
        participantId: "viewer-1",
        participantKind: "viewer",
        canVote: false,
        needsJoin: false,
        currentVote: null,
        displayName: "Pat",
        isAuthenticated: false,
      },
    };

    render(<RoomPage slug="demo-room" />);

    expect(screen.getByText("Watching this round. View-only participants don't vote.")).toBeInTheDocument();
    expect(screen.getByText("Participants")).toBeInTheDocument();
  });

  it("includes share metadata for room links", () => {
    const head = Route.head?.({ params: { slug: "demo-room" } } as any);
    expect(head?.meta).toContainEqual({
      property: "og:title",
      content: "Room demo-room - Palatro",
    });
    expect(head?.meta).toContainEqual({
      name: "twitter:image",
      content: "https://palatro.nemesiscodex.org/banner.png",
    });
    expect(head?.meta).toContainEqual({
      property: "og:url",
      content: "https://palatro.nemesiscodex.org/rooms/demo-room",
    });
    expect(head?.links).toContainEqual({
      rel: "canonical",
      href: "https://palatro.nemesiscodex.org/rooms/demo-room",
    });
    expect(head?.meta).toContainEqual({
      name: "robots",
      content: "noindex, nofollow",
    });
  });
});
