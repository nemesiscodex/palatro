import { api } from "@palatro/backend/convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { Github, Volume2, VolumeX } from "lucide-react";

import { useSoundSettings } from "@/components/sound-settings";
import UserMenu from "./user-menu";

export default function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const rooms = useQuery(api.rooms.listMine, !isLoading && isAuthenticated ? {} : "skip");
  const { muted, toggleMuted } = useSoundSettings();
  const links = isAuthenticated ? [{ to: "/dashboard", label: "Dashboard" }] as const : [];
  const roomPills = (rooms ?? []) as Array<{ id: string; slug: string; name: string }>;

  return (
    <header className="sticky top-0 z-20 border-b border-white/6 bg-[rgba(5,16,14,0.72)] backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-3 sm:px-5 sm:py-3.5">
        <div
          data-testid="header-top"
          className="flex flex-wrap items-center justify-between gap-3 sm:gap-4"
        >
          <Link
            to={isAuthenticated ? "/dashboard" : "/"}
            className="group flex min-w-0 flex-1 items-center gap-2 sm:flex-none sm:gap-2.5"
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center transition-[filter,transform,opacity] duration-300 group-hover:drop-shadow-[0_0_12px_rgba(34,122,92,0.28)] sm:h-11 sm:w-11">
              <img
                src="/brand/palatro-logo.svg"
                alt="Palatro joker mark"
                className="h-10 w-10 object-contain sm:h-11 sm:w-11"
                width={44}
                height={44}
                loading="eager"
                fetchPriority="high"
              />
            </span>
            <span className="flex min-w-0 flex-col items-start justify-center gap-0.5">
              <img
                src="/brand/palatro-texto-logo.svg"
                alt="Palatro"
                className="h-5 w-auto max-w-[8.5rem] object-contain opacity-95 transition-opacity duration-300 group-hover:opacity-100 sm:h-6 sm:max-w-none"
                width={124}
                height={24}
                loading="eager"
                fetchPriority="high"
              />
              <span className="hidden text-[0.72rem] font-medium uppercase tracking-[0.16em] text-primary/75 transition-colors group-hover:text-primary/90 min-[380px]:block">
                Pointing Poker
              </span>
            </span>
          </Link>
          <div
            data-testid="header-actions"
            className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap sm:gap-2.5"
          >
            <nav className="flex flex-wrap justify-end gap-2 text-sm">
              {links.map(({ to, label }) => {
                return (
                  <Link
                    key={to}
                    to={to}
                    className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 hover:-translate-y-px hover:border-primary/25 hover:text-foreground hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] sm:px-4 sm:tracking-[0.22em]"
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
            <a
              href="https://github.com/nemesiscodex/palatro"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="View Palatro on GitHub"
              className="rounded-full border border-white/[0.06] bg-white/[0.03] p-2.5 text-muted-foreground transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 hover:-translate-y-px hover:border-primary/25 hover:text-foreground hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
            >
              <Github className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={toggleMuted}
              aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
              aria-pressed={muted}
              className="rounded-full border border-white/[0.06] bg-white/[0.03] p-2.5 text-muted-foreground transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 hover:-translate-y-px hover:border-primary/25 hover:text-foreground hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            {isAuthenticated ? <UserMenu /> : null}
          </div>
        </div>

        {/* Room pills row */}
        {isAuthenticated && (rooms?.length ?? 0) > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.04] pt-3">
            <span className="ornate-label mr-1 text-primary/50">Rooms</span>
            {roomPills.map((room) => (
              <Link
                key={room.id}
                to="/rooms/$slug"
                params={{ slug: room.slug }}
                title={room.name}
                className="group/pill relative min-w-0 max-w-full truncate rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-muted-foreground transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 hover:-translate-y-px hover:border-primary/30 hover:text-foreground sm:max-w-56 sm:px-3.5 sm:tracking-[0.18em]"
              >
                <span className="mr-1.5 text-primary/40 transition-colors group-hover/pill:text-primary/70">{"\u2666"}</span>
                <span className="inline-block max-w-[9rem] truncate align-bottom sm:max-w-40">
                  {room.name}
                </span>
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
