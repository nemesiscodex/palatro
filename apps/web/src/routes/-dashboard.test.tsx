import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MockLink, MockNavigate, RenderIf, resetSharedMocks, toastError, toastSuccess } from "@/test/mocks";

const convexState = {
  auth: { isAuthenticated: true, isLoading: false },
  queryValue: [] as any,
  createRoom: vi.fn(),
  deleteRoom: vi.fn(),
};

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: any) => ({
    ...options,
    id: path,
    useParams: () => ({}),
  }),
  Link: MockLink,
  Navigate: MockNavigate,
}));

vi.mock("@palatro/backend/convex/_generated/api", () => ({
  api: {
    rooms: {
      listMine: "rooms.listMine",
      create: "rooms.create",
      remove: "rooms.remove",
    },
  },
}));

vi.mock("convex/react", () => ({
  Authenticated: ({ children }: any) => <RenderIf when={convexState.auth.isAuthenticated}>{children}</RenderIf>,
  Unauthenticated: ({ children }: any) => <RenderIf when={!convexState.auth.isAuthenticated}>{children}</RenderIf>,
  AuthLoading: ({ children }: any) => <RenderIf when={convexState.auth.isLoading}>{children}</RenderIf>,
  useConvexAuth: () => convexState.auth,
  useQuery: () => convexState.queryValue,
  useMutation: (key: string) => {
    if (key === "rooms.create") {
      return convexState.createRoom;
    }
    if (key === "rooms.remove") {
      return convexState.deleteRoom;
    }
    return vi.fn();
  },
}));

import { DashboardPage, Route } from "./dashboard";

describe("DashboardPage", () => {
  beforeEach(() => {
    convexState.auth = { isAuthenticated: true, isLoading: false };
    convexState.queryValue = [];
    convexState.createRoom.mockReset();
    convexState.deleteRoom.mockReset();
    resetSharedMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("renders create and list sections for authenticated users", () => {
    convexState.queryValue = [
      {
        id: "room-1",
        name: "Sprint Poker",
        slug: "sprint-poker",
        scaleType: "fibonacci",
        status: "idle",
      },
    ];

    render(<DashboardPage />);

    expect(screen.getByText("Open a new table")).toBeInTheDocument();
    expect(screen.getByText("Active rooms")).toBeInTheDocument();
    expect(screen.getByText("Sprint Poker")).toBeInTheDocument();
  });

  it("creates a room, shows a toast, and redirects", async () => {
    convexState.createRoom.mockResolvedValue({ slug: "new-room" });

    render(<DashboardPage />);

    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "New Room" } });
    fireEvent.click(screen.getByRole("button", { name: "Open table" }));

    await waitFor(() => {
      expect(convexState.createRoom).toHaveBeenCalledWith({
        name: "New Room",
        scaleType: "fibonacci",
        consensusMode: "plurality",
        consensusThreshold: 70,
        hostVotingEnabled: true,
        password: undefined,
        slug: undefined,
      });
    });
    expect(toastSuccess).toHaveBeenCalledWith("Room created");
    expect(window.location.assign).toHaveBeenCalledWith("/rooms/new-room");
  });

  it("shows a clear error when the custom slug is already taken", async () => {
    convexState.createRoom.mockRejectedValue(
      new Error(
        'Uncaught ConvexError: Room slug already exists. Choose another custom slug or leave it empty to use a random UUID.\n',
      ),
    );

    render(<DashboardPage />);

    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "New Room" } });
    fireEvent.change(screen.getByLabelText("Custom URL slug (optional)"), {
      target: { value: "existing-slug" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open table" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "Room slug already exists. Choose another custom slug or leave it empty to use a random UUID.",
      );
    });
  });

  it("deletes a room and reports failures", async () => {
    convexState.queryValue = [
      {
        id: "room-1",
        name: "Sprint Poker",
        slug: "sprint-poker",
        scaleType: "fibonacci",
        status: "idle",
      },
    ];
    convexState.deleteRoom.mockRejectedValue(new Error("Delete failed"));

    render(<DashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(convexState.deleteRoom).toHaveBeenCalledWith({ roomId: "room-1" });
    });
    expect(toastError).toHaveBeenCalledWith("Delete failed");
  });

  it("redirects unauthenticated users", () => {
    convexState.auth = { isAuthenticated: false, isLoading: false };

    render(<DashboardPage />);

    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/");
  });

  it("marks dashboard route as noindex", () => {
    const head = Route.head?.();
    expect(head?.meta).toContainEqual({
      name: "robots",
      content: "noindex, nofollow",
    });
  });
});
