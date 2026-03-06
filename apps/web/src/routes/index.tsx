import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useEffect } from "react";
import { usePostHog } from "@posthog/react";

import LandingShell from "@/components/landing-shell";

export const Route = createFileRoute("/")({
  component: IndexRouteComponent,
});

function getAttributionParams(search: string) {
  const params = new URLSearchParams(search);
  const trackedKeys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
  ] as const;

  return trackedKeys.reduce<Record<string, string>>((acc, key) => {
    const value = params.get(key);
    if (value) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

export function IndexRouteComponent() {
  const posthog = usePostHog();

  useEffect(() => {
    const attribution =
      typeof window === "undefined"
        ? {}
        : getAttributionParams(window.location.search);

    if (Object.keys(attribution).length > 0) {
      (posthog as any).register_once?.(attribution);
    }

    posthog.capture('landing_page_viewed', {
      is_authenticated: false,
      ...attribution,
    });
  }, [posthog]);

  return (
    <>
      <Authenticated>
        <Navigate to="/dashboard" />
      </Authenticated>

      <Unauthenticated>
        <LandingShell />
      </Unauthenticated>

      <AuthLoading>
        <div className="flex flex-col items-center gap-3 px-4 py-16">
          <div className="flex gap-2 text-xl text-primary/30 animate-pulse">
            <span>{"\u2660"}</span>
            <span>{"\u2665"}</span>
            <span>{"\u2666"}</span>
            <span>{"\u2663"}</span>
          </div>
          <p className="ornate-label text-primary/50">Shuffling the deck</p>
        </div>
      </AuthLoading>
    </>
  );
}
