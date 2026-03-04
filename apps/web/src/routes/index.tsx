import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

import LandingShell from "@/components/landing-shell";

export const Route = createFileRoute("/")({
  component: IndexRouteComponent,
});

function IndexRouteComponent() {
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
