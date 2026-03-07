# Local Development

This guide covers running Palatro locally for development.

## Requirements

- Bun
- Node.js tooling for `npx`
- A local Convex development environment

## Install

```bash
bun install
```

## Configure Convex

Run the backend setup once:

```bash
bun run dev:setup
```

Set these backend values in [`packages/backend/.env.local`](/Users/julio/personal/palatro/packages/backend/.env.local):

```env
SITE_URL=http://localhost:3001
CONVEX_URL=http://127.0.0.1:3210
CONVEX_SITE_URL=http://127.0.0.1:3211
```

Set these web values in [`apps/web/.env`](/Users/julio/personal/palatro/apps/web/.env):

```env
VITE_CONVEX_URL=http://127.0.0.1:3210
VITE_CONVEX_SITE_URL=http://127.0.0.1:3211
```

Set the Better Auth secret in Convex:

```bash
npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
npx convex env set SITE_URL http://localhost:3001
```

## Run The App

Start the full workspace:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001).

If you need to run services separately:

```bash
bun run dev:server
bun run dev:web
```

## Useful Scripts

- `bun run dev` runs the full workspace in development mode
- `bun run dev:web` runs only the web app
- `bun run dev:server` runs only the Convex backend
- `bun run dev:setup` configures local Convex development
- `bun run build` builds the workspace
- `bun run check-types` runs type checks across the workspace
- `bun run test` runs the full monorepo test suite
- `bun run test:coverage` runs the full monorepo test suite with coverage

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
