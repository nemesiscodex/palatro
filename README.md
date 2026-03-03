# palatro

Palatro is a planning poker app for lightweight estimation sessions.

It is built for a simple workflow:

- one authenticated host creates and manages rooms
- each room has a stable shareable URL
- guests join without logging in
- participants vote in real time using planning poker cards
- the room reveals automatically when everyone has voted, or the host can force-finish the round

## Current MVP

The current MVP includes:

- email/password authentication for the room host with Better Auth
- room creation from the dashboard
- stable room URLs at `/rooms/:slug`
- anonymous guest join with a required nickname
- host participation as a voter
- Fibonacci and power-of-two point scales
- `?` as the unknown card
- round controls:
  - start pointing
  - restart pointing
  - force finish round
- automatic reveal when all active participants vote
- result calculation as:
  - most-voted card, or
  - tie
- tie details in the reveal result (top two tied values, highest first)

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

## Local Development

Install dependencies:

```bash
bun install
```

Configure Convex locally:

```bash
bun run dev:setup
```

Set the required backend env values in [packages/backend/.env.local](/Users/julio/personal/palatro/packages/backend/.env.local):

```env
SITE_URL=http://localhost:3001
CONVEX_URL=http://127.0.0.1:3210
CONVEX_SITE_URL=http://127.0.0.1:3211
```

Set the required web env values in [apps/web/.env](/Users/julio/personal/palatro/apps/web/.env):

```env
VITE_CONVEX_URL=http://127.0.0.1:3210
VITE_CONVEX_SITE_URL=http://127.0.0.1:3211
```

Set the Better Auth secret in Convex:

```bash
npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
npx convex env set SITE_URL http://localhost:3001
```

Run the backend and web app:

```bash
bun run dev:server
bun run dev:web
```

Or run the whole workspace:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001).

Main routes:

- `/dashboard` for host sign-in and room creation
- `/rooms/:slug` for the shared planning poker room

## Available Scripts

- `bun run dev` runs the workspace in development mode
- `bun run dev:web` runs only the web app
- `bun run dev:server` runs only the Convex backend
- `bun run dev:setup` configures local Convex development
- `bun run build` builds the workspace
- `bun run check-types` runs type checks across the workspace
- `bun run deploy` deploys infrastructure
- `bun run destroy` destroys deployed infrastructure

## Notes

- The host is the only user who needs to authenticate.
- Guests do not need accounts.
- Convex handles the realtime room state and round updates.
- Better Auth handles host sessions and token bridging into Convex.
