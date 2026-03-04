import { api } from "@palatro/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useConvexAuth,
  useMutation,
  useQuery,
} from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import CreateRoomForm from "@/components/create-room-form";
import RoomList from "@/components/room-list";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const [showSignIn, setShowSignIn] = useState(false);
  const { isAuthenticated, isLoading } = useConvexAuth();
  const apiAny = api as any;
  const rooms = useQuery(apiAny.rooms.listMine, !isLoading && isAuthenticated ? {} : "skip");
  const createRoom = useMutation(apiAny.rooms.create);

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
                    onCreateRoom={async ({ name, scaleType, password }) => {
                      try {
                        const result = await createRoom({ name, scaleType, password });
                        toast.success("Room created");
                        window.location.assign(`/rooms/${result.slug}`);
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Could not create the room",
                        );
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
              <RoomList rooms={(rooms ?? []) as any} />
            </div>
          </section>
        </main>
      </Authenticated>

      <Unauthenticated>
        <main className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-12 lg:grid-cols-[1.15fr_minmax(340px,440px)] lg:items-center">
          <section className="stagger-rise grid gap-7">
            <p className="ornate-label text-primary/60">Pointing poker</p>

            <h1 className="max-w-2xl font-serif text-[4.2rem] leading-[0.88] text-foreground tracking-tight">
              A smoky
              <br />
              <span className="text-gold-gradient italic">planning table</span>
              <br />
              for sharp teams.
            </h1>

            <p className="text-muted-foreground max-w-lg text-base leading-7">
              Palatro turns estimation into a shared ritual: join fast, place your card,
              reveal when the table is ready.
            </p>

            {/* Feature cards with suit marks */}
            <div className="grid gap-4 sm:grid-cols-3">
              {([
                ["\u2660", "?", "Unknown stays on the table"],
                ["\u2665", "8", "Reveal ties and strong signals"],
                ["\u2666", "\u221E", "Guests join without friction"],
              ] as const).map(([suit, mark, text], index) => (
                <div
                  key={mark}
                  className="felt-panel group relative overflow-hidden rounded-[1.6rem] p-5 stagger-rise"
                  style={{ animationDelay: `${140 + index * 70}ms` }}
                >
                  {/* Background suit watermark */}
                  <span className="absolute -bottom-2 -right-1 font-serif text-5xl text-primary/[0.04] transition-all duration-500 group-hover:text-primary/[0.08]">
                    {suit}
                  </span>

                  <div className="text-gold-gradient font-serif text-4xl font-bold">{mark}</div>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Auth form */}
          <section className="stagger-rise" style={{ animationDelay: "180ms" }}>
            {showSignIn ? (
              <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
            ) : (
              <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
            )}
          </section>
        </main>
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
