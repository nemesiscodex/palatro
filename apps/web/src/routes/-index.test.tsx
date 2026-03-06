import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const posthogState = {
  capture: vi.fn(),
  registerOnce: vi.fn(),
};

const authState = {
  isAuthenticated: false,
  isLoading: false,
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: any) => ({
    ...options,
    id: path,
  }),
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
}));

vi.mock("convex/react", () => ({
  Authenticated: ({ children }: any) => (authState.isAuthenticated ? children : null),
  Unauthenticated: ({ children }: any) => (!authState.isAuthenticated && !authState.isLoading ? children : null),
  AuthLoading: ({ children }: any) => (authState.isLoading ? children : null),
}));

vi.mock("@posthog/react", () => ({
  usePostHog: () => ({
    capture: posthogState.capture,
    register_once: posthogState.registerOnce,
  }),
}));

vi.mock("@/components/landing-shell", () => ({
  default: () => <div data-testid="landing-shell" />,
}));

import { IndexRouteComponent } from "./index";

describe("IndexRouteComponent", () => {
  beforeEach(() => {
    posthogState.capture.mockReset();
    posthogState.registerOnce.mockReset();
    authState.isAuthenticated = false;
    authState.isLoading = false;
  });

  it("captures landing attribution from UTM params", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        search: "?utm_source=x&utm_medium=social&utm_campaign=launch",
        href: "http://localhost/?utm_source=x&utm_medium=social&utm_campaign=launch",
      },
    });

    render(<IndexRouteComponent />);

    expect(posthogState.registerOnce).toHaveBeenCalledWith({
      utm_source: "x",
      utm_medium: "social",
      utm_campaign: "launch",
    });
    expect(posthogState.capture).toHaveBeenCalledWith("landing_page_viewed", {
      is_authenticated: false,
      utm_source: "x",
      utm_medium: "social",
      utm_campaign: "launch",
    });
  });
});
