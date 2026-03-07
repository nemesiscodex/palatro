# Contributing

Issues and pull requests are welcome.

## Development Expectations

- treat visible polish seriously: broken spacing, alignment issues, dead links, and awkward states are product problems
- check the first-run experience, not only your returning local session
- verify desktop and mobile layouts
- verify both light and dark mode behavior

## Tests

Every new feature must include tests in the same change.

Bug fixes should include a regression test when practical.

Use these commands for verification:

```bash
bun run test
bun run test:coverage
```

Notes:

- `bun run test` is the full monorepo suite
- `bun run test:coverage` is the full monorepo suite with coverage reporting
- `bun test` only covers the Bun-compatible backend subset under `packages/backend/convex`

## Local Setup

For local environment setup and development commands, use the [local development guide](docs/local-development.md).
