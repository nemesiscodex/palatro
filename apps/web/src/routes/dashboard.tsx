import { api } from "@palatro/backend/convex/_generated/api";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { usePostHog } from "@posthog/react";

import CreateRoomForm from "@/components/create-room-form";
import RoomList from "@/components/room-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserFacingErrorMessage } from "@/lib/errors";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      {
        title: "Dashboard - Palatro",
      },
      {
        name: "description",
        content: "Manage your planning poker rooms and create new tables.",
      },
      {
        name: "robots",
        content: "noindex, nofollow",
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <DashboardPage />;
}

export function DashboardPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const apiAny = api as any;
  const rooms = useQuery(apiAny.rooms.listMine, !isLoading && isAuthenticated ? {} : "skip");
  const createRoom = useMutation(apiAny.rooms.create);
  const deleteRoom = useMutation(apiAny.rooms.remove);
  const posthog = usePostHog();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      posthog.capture('dashboard_viewed', {
        rooms_count: (rooms ?? []).length,
      });
    }
  }, [isLoading, isAuthenticated, rooms, posthog]);

  return (
    <>
      <Authenticated>
        <main className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
          <section className="grid content-start gap-6">
            {/* Hero panel */}
            <div className="felt-panel stagger-rise relative overflow-hidden rounded-[2rem] px-6 py-6">
              {/* Decorative corner suit */}
              <span className="absolute top-5 right-6 font-serif text-4xl text-primary/[0.06]">
                {"\u2660"}
              </span>

              <p className="ornate-label text-primary/60">Dealer station</p>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
                <div>
                  <h1 className="font-serif text-[2.8rem] leading-[0.9] text-foreground">
                    Run rounds
                    <br />
                    <span className="text-gold-gradient italic">like a card room.</span>
                  </h1>
                  <p className="text-muted-foreground mt-4 max-w-sm text-sm leading-relaxed">
                    Build a shareable estimation table, control the reveal, and keep the room
                    focused on the next decision.
                  </p>
                </div>
                <div className="grid min-w-32 gap-1 text-right">
                  <span className="ornate-label text-primary/50">Open Rooms</span>
                  <span className="text-gold-gradient font-serif text-5xl font-bold leading-none">
                    {(rooms ?? []).length}
                  </span>
                </div>
              </div>
              <div className="gold-rule mt-5" />
            </div>

            {/* Create room card */}
            <Card className="stagger-rise" style={{ animationDelay: "80ms" }}>
              <CardHeader>
                <CardTitle>Open a new table</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {isLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <span className="ornate-label text-primary/50 animate-pulse">
                      Shuffling the deck...
                    </span>
                  </div>
                ) : (
                  <CreateRoomForm
                    onCreateRoom={async ({ name, scaleType, consensusMode, consensusThreshold, password, slug }) => {
                      try {
                        const result = await createRoom({
                          name,
                          scaleType,
                          consensusMode,
                          consensusThreshold,
                          password,
                          slug,
                        });
                        toast.success("Room created");
                        window.location.assign(`/rooms/${result.slug}`);
                      } catch (error) {
                        toast.error(getUserFacingErrorMessage(error, "Could not create the room"));
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid content-start gap-5">
            {/* Active rooms header */}
            <div
              className="felt-panel stagger-rise relative overflow-hidden rounded-[2rem] px-6 py-5"
              style={{ animationDelay: "120ms" }}
            >
              <span className="absolute bottom-4 right-6 font-serif text-3xl text-primary/[0.05]">
                {"\u2665"}
              </span>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="ornate-label text-primary/60">Your tables</p>
                  <h2 className="mt-2 font-serif text-4xl leading-none">Active rooms</h2>
                  <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                    Each room keeps a stable URL you can share with your team.
                  </p>
                </div>
              </div>
            </div>

            {/* Room list */}
            <div className="stagger-rise" style={{ animationDelay: "180ms" }}>
              <RoomList
                rooms={(rooms ?? []) as any}
                onDeleteRoom={(room) => {
                  if (
                    typeof window !== "undefined" &&
                    !window.confirm(`Delete "${room.name}"? This cannot be undone.`)
                  ) {
                    return;
                  }

                  void deleteRoom({ roomId: room.id as any })
                    .then(() => {
                      toast.success("Room deleted");
                    })
                    .catch((error) => {
                      toast.error(getUserFacingErrorMessage(error, "Could not delete the room"));
                    });
                }}
              />
            </div>
          </section>
        </main>
      </Authenticated>

      <Unauthenticated>
        <Navigate to="/" />
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
