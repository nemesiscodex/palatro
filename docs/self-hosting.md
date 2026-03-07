# Self-Hosting

Palatro currently uses:

- TanStack Start for the web app
- Convex for the backend and realtime data layer
- Better Auth for host authentication
- Alchemy for infrastructure deployment

## Current Deployment Shape

The repository includes infrastructure commands through `@palatro/infra`:

```bash
bun run deploy
bun run destroy
```

The current infrastructure package deploys the web app through Alchemy, and the application expects Convex environment variables to be available at runtime.

## Before You Deploy

At minimum, review and provide production values for:

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`
- `SITE_URL`
- `BETTER_AUTH_SECRET`

You should also review:

- your Convex production deployment configuration
- your web app environment files
- the infrastructure definition in [`packages/infra/alchemy.run.ts`](/Users/julio/personal/palatro/packages/infra/alchemy.run.ts)

## Notes

This document is intentionally high level for now. If Palatro will be shared as a self-hosted project, the next useful improvement would be a full production deployment guide covering:

- Convex production setup
- web environment configuration
- domain and callback URL setup
- secret management
- deployment and rollback workflow
