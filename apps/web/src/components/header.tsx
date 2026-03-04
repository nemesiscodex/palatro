import { api } from "@palatro/backend/convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";

import UserMenu from "./user-menu";

export default function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const apiAny = api as any;
  const rooms = useQuery(apiAny.rooms.listMine, !isLoading && isAuthenticated ? {} : "skip");
  const links = [{ to: "/dashboard", label: "Dashboard" }] as const;

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[rgba(5,16,14,0.72)] backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-7xl flex-col px-5 py-3.5">
        <div className="flex items-center justify-between gap-4">
          <Link to="/dashboard" className="group flex items-center gap-3.5">
            {/* Logo mark — spade suit with gold ring */}
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-primary/25 bg-gradient-to-br from-primary/15 to-primary/5 font-serif text-xl text-primary shadow-[0_0_20px_rgba(218,185,100,0.12)] transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-[0_0_28px_rgba(218,185,100,0.2)]">
              {"\u2660"}
            </span>
            <span className="flex flex-col">
              <span className="ornate-label text-primary/70 transition-colors group-hover:text-primary/90">Palatro</span>
              <span className="font-serif text-[1.35rem] leading-none text-foreground tracking-tight">
                Pointing Poker
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2.5">
            <nav className="flex gap-2 text-sm">
              {links.map(({ to, label }) => {
                return (
                  <Link
                    key={to}
                    to={to}
                    className="rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-[0.68rem] font-medium uppercase tracking-[0.22em] text-muted-foreground transition-all duration-200 hover:-translate-y-px hover:border-primary/25 hover:text-foreground hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
            {isAuthenticated ? <UserMenu /> : null}
          </div>
        </div>

        {/* Room pills row */}
        {isAuthenticated && (rooms?.length ?? 0) > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.04] pt-3">
            <span className="ornate-label mr-1 text-primary/50">Rooms</span>
            {(rooms ?? []).map((room: any) => (
              <Link
                key={room.id}
                to="/rooms/$slug"
                params={{ slug: room.slug }}
                className="group/pill relative rounded-full border border-white/[0.06] bg-white/[0.025] px-3.5 py-1.5 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-all duration-200 hover:-translate-y-px hover:border-primary/30 hover:text-foreground"
              >
                <span className="mr-1.5 text-primary/40 transition-colors group-hover/pill:text-primary/70">{"\u2666"}</span>
                {room.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {/* Gold accent line at bottom */}
      <div className="gold-rule" />
    </header>
  );
}
