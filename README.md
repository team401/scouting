# Team 401 Scouting

Team 401's scouting and alliance-selection application for the 2026 FRC
season. It is a mobile-first Next.js application deployed as a Cloudflare
Worker at [scout.team401.org](https://scout.team401.org).

## Stack

- Next.js and TypeScript through Vinext
- Cloudflare Workers, D1, and R2
- Better Auth with email/password accounts
- IndexedDB and a service worker for offline scouting
- GitHub Actions for build verification and production deployment

## Local development

Requirements: Node.js 22.13 or newer.

```sh
npm install
cp .env.example .env.local
npm run build
npm run db:setup:local
npm run dev
```

Generate a local authentication secret with `npx auth@latest secret` and place
it in `.env.local`. Do not commit environment files or production credentials.

Before submitting changes, run:

```sh
npm run typecheck
npm run build
```

See [the architecture notes](docs/architecture.md) for the data and offline
design and [the deployment guide](docs/cloudflare-deployment.md) for production
configuration.
