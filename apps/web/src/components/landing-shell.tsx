import { useState } from "react";

import LandingHeroDemo from "@/components/landing-hero-demo";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export default function LandingShell() {
  const [showSignIn, setShowSignIn] = useState(false);

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
          {showSignIn ? (
            <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
          ) : (
            <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
          )}
        </section>
      </div>
    </main>
  );
}
