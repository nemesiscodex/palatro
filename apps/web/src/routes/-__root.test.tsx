import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  HeadContent: () => null,
  Outlet: () => null,
  Scripts: () => null,
  useRouteContext: () => ({
    convexQueryClient: { convexClient: {}, serverHttpClient: { setAuth: vi.fn() } },
    token: null,
  }),
  createRootRouteWithContext: () => (options: any) => ({ options }),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    handler: (fn: any) => fn,
  }),
}));

vi.mock("@convex-dev/better-auth/react", () => ({
  ConvexBetterAuthProvider: ({ children }: any) => children,
}));

vi.mock("@posthog/react", () => ({
  PostHogProvider: ({ children }: any) => children,
}));

vi.mock("@tanstack/react-router-devtools", () => ({
  TanStackRouterDevtools: () => null,
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => null,
}));

vi.mock("@/components/sound-settings", () => ({
  SoundSettingsProvider: ({ children }: any) => children,
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {},
}));

vi.mock("@/lib/auth-server", () => ({
  getToken: vi.fn(),
}));

vi.mock("../index.css?url", () => ({
  default: "/index.css",
}));

vi.mock("../components/header", () => ({
  default: () => null,
}));

vi.mock("@/lib/site-url", () => ({
  getSiteUrl: () => "https://palatro.nemesiscodex.org",
}));

import { Route } from "./__root";

interface RootHeadResult {
  links?: Array<Record<string, string>>;
  meta?: Array<Record<string, string>>;
}

interface MockRootRoute {
  options: {
    head: () => RootHeadResult;
  };
}

describe("root metadata", () => {
  it("includes Open Graph and Twitter tags with the banner image", () => {
    const head = (Route as unknown as MockRootRoute).options.head();
    const meta = head.meta as Array<Record<string, string>>;

    expect(head.links).toContainEqual({
      rel: "canonical",
      href: "https://palatro.nemesiscodex.org",
    });
    expect(meta).toContainEqual({
      property: "og:image",
      content: "https://palatro.nemesiscodex.org/banner.png",
    });
    expect(meta).toContainEqual({
      name: "twitter:card",
      content: "summary_large_image",
    });
    expect(meta).toContainEqual({
      name: "twitter:image",
      content: "https://palatro.nemesiscodex.org/banner.png",
    });
    expect(meta).toContainEqual({
      name: "theme-color",
      content: "#071814",
    });
  });
});
