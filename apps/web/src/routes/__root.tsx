import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";
import { PostHogProvider } from "@posthog/react";

import { Toaster } from "@/components/ui/sonner";
import { SoundSettingsProvider } from "@/components/sound-settings";
import { authClient } from "@/lib/auth-client";
import { getToken } from "@/lib/auth-server";

import Header from "../components/header";
import appCss from "../index.css?url";

const getAuth = createServerFn({ method: "GET" }).handler(async () => {
  return await getToken();
});

interface RouterAppContext {
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Palatro — Pointing Poker",
      },
      {
        name: "description",
        content: "A smoky planning table for sharp teams. Real-time pointing poker with shareable rooms.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/favicon.ico",
        sizes: "any",
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
      {
        rel: "icon",
        type: "image/png",
        href: "/favicon-32x32.png",
        sizes: "32x32",
      },
      {
        rel: "icon",
        type: "image/png",
        href: "/favicon-16x16.png",
        sizes: "16x16",
      },
      {
        rel: "apple-touch-icon",
        href: "/apple-touch-icon.png",
        sizes: "180x180",
      },
    ],
  }),

  component: RootDocument,
  beforeLoad: async (ctx) => {
    const token = await getAuth();
    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }
    return {
      isAuthenticated: !!token,
      token,
    };
  },
});

function RootDocument() {
  const context = useRouteContext({ from: Route.id });
  return (
    <ConvexBetterAuthProvider
      client={context.convexQueryClient.convexClient}
      authClient={authClient}
      initialToken={context.token}
    >
      <PostHogProvider
        apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY!}
        options={{
          api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
          capture_exceptions: true,
        }}
      >
        <html lang="en" className="dark">
          <head>
            <HeadContent />
          </head>
          <body>
            <SoundSettingsProvider>
              <div className="grid h-svh grid-rows-[auto_1fr]">
                <Header />
                <Outlet />
              </div>
              <Toaster richColors />
              <TanStackRouterDevtools position="bottom-left" />
              <Scripts />
            </SoundSettingsProvider>
          </body>
        </html>
      </PostHogProvider>
    </ConvexBetterAuthProvider>
  );
}
