import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export default function LandingShell() {
  const [showSignIn, setShowSignIn] = useState(false);

  return (
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
              <span className="absolute -bottom-2 -right-1 font-serif text-5xl text-primary/[0.04] transition-all duration-500 group-hover:text-primary/[0.08]">
                {suit}
              </span>

              <div className="text-gold-gradient font-serif text-4xl font-bold">{mark}</div>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="stagger-rise" style={{ animationDelay: "180ms" }}>
        {showSignIn ? (
          <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
        ) : (
          <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
        )}
      </section>
    </main>
  );
}
