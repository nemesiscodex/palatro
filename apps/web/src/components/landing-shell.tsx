import { api } from "@palatro/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import CreateRoomForm from "@/components/create-room-form";
import LandingHeroDemo from "@/components/landing-hero-demo";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { getUserFacingErrorMessage } from "@/lib/errors";
import { ensureGuestOwnerToken } from "@/lib/room-session";
import { Button } from "@/components/ui/button";

export default function LandingShell() {
  const searchState = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        redirectTo: undefined,
        mode: undefined,
      };
    }

    const params = new URLSearchParams(window.location.search);
    return {
      redirectTo: params.get("redirectTo") || undefined,
      mode: params.get("mode") || undefined,
    };
  }, []);
  const [showSignIn, setShowSignIn] = useState(searchState.mode === "signin");
  const [showGuestCreate, setShowGuestCreate] = useState(false);
  const createGuestRoom = useMutation(api.rooms.createGuest);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 lg:py-10">
      <section className="stagger-rise mb-5 lg:mb-8">
        <h1 className="max-w-3xl font-serif text-[2.9rem] leading-[0.95] text-foreground tracking-[-0.03em] sm:text-[3.5rem] lg:text-[clamp(2.75rem,4vw,4.2rem)]">
          Join a table. Pick a card. <span className="text-gold-gradient italic overflow-visible inline-block pr-[0.1em]">Reveal!</span>
        </h1>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem] lg:gap-8">
        <section className="stagger-rise" style={{ animationDelay: "80ms" }}>
          <LandingHeroDemo />
        </section>

        <section className="stagger-rise lg:sticky lg:top-24" style={{ animationDelay: "180ms" }}>
          {showGuestCreate ? (
            <div className="felt-panel relative mx-auto grid w-full max-w-md gap-5 overflow-hidden rounded-[2rem] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.35)] sm:p-8">
              <div>
                <p className="ornate-label mb-3 text-primary/60">Quick trial</p>
                <h2 className="mb-1.5 font-serif text-3xl leading-none tracking-tight lg:text-4xl">
                  Open one <span className="text-gold-gradient italic">guest room</span>
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Run a temporary room on this device, then sign up later to claim it.
                </p>
              </div>

              <CreateRoomForm
                mode="guest"
                onCreateRoom={async ({
                  name,
                  scaleType,
                  consensusMode,
                  consensusThreshold,
                  hostVotingEnabled,
                }) => {
                  try {
                    const guestOwnerToken = ensureGuestOwnerToken();
                    const result = await createGuestRoom({
                      name,
                      scaleType,
                      consensusMode,
                      consensusThreshold,
                      hostVotingEnabled,
                      guestOwnerToken,
                    });
                    toast.success("Guest room created");
                    window.location.assign(`/rooms/${result.slug}`);
                  } catch (error) {
                    toast.error(
                      getUserFacingErrorMessage(error, "Could not create the guest room"),
                    );
                  }
                }}
              />

              <Button variant="link" onClick={() => setShowGuestCreate(false)} className="text-primary/70 hover:text-primary">
                Back to account options
              </Button>
            </div>
          ) : showSignIn ? (
            <SignInForm
              onSwitchToSignUp={() => setShowSignIn(false)}
              redirectTo={searchState.redirectTo}
            />
          ) : (
            <div className="grid gap-4">
              <SignUpForm
                onSwitchToSignIn={() => setShowSignIn(true)}
                redirectTo={searchState.redirectTo}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowGuestCreate(true)}
                className="mx-auto w-full max-w-md"
              >
                Try one guest room
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
