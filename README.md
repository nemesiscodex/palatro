# Palatro

<p align="left">
  <img src="apps/web/public/brand/palatro-logo.svg" alt="Palatro logo mark" height="64" />
  <img src="apps/web/public/brand/palatro-texto-logo.svg" alt="Palatro wordmark" height="64" />
</p>

<p align="left">
  <img src=".github/assets/palatro-screenshot.png" alt="Palatro room screenshot" width="960" />
</p>

Palatro is a planning poker app for fast estimation sessions.

It is built around one simple loop: a host opens a room, shares one stable URL, guests join without accounts, everyone votes in real time, and the round reveals as soon as the table is ready.

## See The Product Fast

Palatro has three main routes:

- `/` shows the public landing page for first-time visitors
- `/dashboard` is the host control area for signing in and creating rooms
- `/rooms/:slug` is the live shared room where guests join and the team votes

The core feature is the room itself:

- one room keeps the same shareable URL
- guests join with only a nickname
- votes update in real time
- rounds reveal automatically when all active participants have voted
- the host can still restart or force-finish a round when needed

## Current MVP

The current MVP includes:

- email/password authentication for the room host with Better Auth
- room creation from the dashboard
- stable room URLs at `/rooms/:slug`
- anonymous guest join with a required nickname
- host participation as a voter
- Fibonacci and power-of-two point scales
- `?` as the unknown card
- round controls: start pointing, restart pointing, and force finish
- automatic reveal when all active participants vote
- result calculation as the most-voted card or a tie
- tie details in the reveal result (top two tied values, highest first)

## Quick Start

Install dependencies:

```bash
bun install
```

Configure local Convex and start the app:

```bash
bun run dev:setup
bun run dev
```

Open [http://localhost:3001](http://localhost:3001).

If you need the services separately:

```bash
bun run dev:server
bun run dev:web
```

## Required Local Env

Set the required backend values in [packages/backend/.env.local](/Users/julio/personal/palatro/packages/backend/.env.local):

```env
SITE_URL=http://localhost:3001
CONVEX_URL=http://127.0.0.1:3210
CONVEX_SITE_URL=http://127.0.0.1:3211
```

Set the required web values in [apps/web/.env](/Users/julio/personal/palatro/apps/web/.env):

```env
VITE_CONVEX_URL=http://127.0.0.1:3210
VITE_CONVEX_SITE_URL=http://127.0.0.1:3211
```

Set the Better Auth secret in Convex:

```bash
npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
npx convex env set SITE_URL http://localhost:3001
```

## Stack

- Bun
- TypeScript
- TanStack Start
- TanStack Router
- Tailwind CSS
- shadcn/ui primitives
- Convex
- Better Auth
- Turborepo

## Workspace Layout

```text
palatro/
├── apps/
│   └── web/                # Web UI (TanStack Start)
├── packages/
│   ├── backend/            # Convex schema and functions
│   ├── config/             # Shared TypeScript config
│   ├── env/                # Shared env validation
│   └── infra/              # Deployment config
```

## Scripts

- `bun run dev` runs the full workspace in development mode
- `bun run dev:web` runs only the web app
- `bun run dev:server` runs only the Convex backend
- `bun run dev:setup` configures local Convex development
- `bun run build` builds the workspace
- `bun run check-types` runs type checks across the workspace
- `bun run test` runs the full monorepo suite through Turbo and Vitest
- `bun run test:coverage` runs the full monorepo suite with coverage reporting
- `bun run deploy` deploys infrastructure
- `bun run destroy` destroys deployed infrastructure

## Testing

Use the full-suite commands for normal development and CI:

```bash
bun run test
bun run test:coverage
```

Important:

- `bun run test` is the full monorepo suite
- `bun run test:coverage` is the full monorepo suite with coverage
- `bun test` only covers the Bun-compatible backend subset under `packages/backend/convex`

## Contributing

Issues and pull requests are welcome.

Before opening a PR:

- keep visible polish tight: broken spacing, alignment issues, dead links, and awkward states are product problems
- test first impressions for a brand-new visitor, not only your returning local session
- verify desktop and mobile layouts
- verify both light and dark mode behavior
- include tests with new features, and add regression tests for bug fixes when practical
