import type { ReactElement, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@palatro/backend/convex/_generated/api", () => ({
  api: {
    auth: {
      getCurrentUser: "auth.getCurrentUser",
    },
  },
}));

const mockState = {
  user: {
    name: "Julio Reyes With A Very Long Account Name",
    email: "julio@example.com",
  },
};

vi.mock("convex/react", () => ({
  useQuery: () => mockState.user,
}));

vi.mock("./ui/dropdown-menu", async () => {
  const React = await import("react");

  return {
    DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DropdownMenuTrigger: ({
      children,
      render,
    }: {
      children: ReactNode;
      render: ReactElement<{ children?: ReactNode }>;
    }) => React.cloneElement(render, undefined, children),
    DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DropdownMenuGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <div />,
  };
});

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signOut: vi.fn(),
  },
}));

import UserMenu from "./user-menu";

describe("UserMenu", () => {
  it("keeps the trigger shrinkable for narrow headers", () => {
    render(<UserMenu />);

    const trigger = screen.getByRole("button", { name: /julio reyes with a very long account name/i });
    expect(trigger).toHaveClass(
      "w-full",
      "min-w-0",
      "shrink",
      "justify-start",
      "overflow-hidden",
      "sm:w-auto",
      "sm:max-w-[12rem]",
    );
    expect(screen.getByTestId("user-menu-trigger-label")).toHaveClass(
      "min-w-0",
      "flex-1",
      "truncate",
      "text-left",
      "sm:flex-none",
    );
  });
});
