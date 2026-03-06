import { describe, expect, it, vi } from "vitest";

vi.mock("@palatro/env/web", () => ({
  env: {
    VITE_CONVEX_SITE_URL: "https://palatro.app/",
  },
}));

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

import { Route } from "./__root";

describe("root metadata", () => {
  it("includes Open Graph and Twitter tags with the banner image", () => {
    const head = Route.options.head();
    const meta = head.meta as Array<Record<string, string>>;

    expect(head.links).toContainEqual({
      rel: "canonical",
      href: "https://palatro.app",
    });
    expect(meta).toContainEqual({
      property: "og:image",
      content: "https://palatro.app/banner.png",
    });
    expect(meta).toContainEqual({
      name: "twitter:card",
      content: "summary_large_image",
    });
    expect(meta).toContainEqual({
      name: "twitter:image",
      content: "https://palatro.app/banner.png",
    });
  });
});
