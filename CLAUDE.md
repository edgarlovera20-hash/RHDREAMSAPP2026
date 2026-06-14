# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`HD-RH` (npm name `rhdreamsapp2026`) is the recruitment platform of the Heavenly Dreams (HD)
ecosystem (`rh.heavenlydreams.com.mx`): job posts, candidate records, interviews, evaluations, the
hiring workflow, and RH reports. Per `ecosystem-boundaries.v1.json` it must **not** own client debt
management, finance treasury, global role administration, or control-tower decisions. It forwards
events to `HD-BRAIN` and `HD-OPERATIONS` (`*_EVENTS_URL=.../api/events/ingest`).

This is the most feature-rich app in the ecosystem. It is one of several sibling apps; the shared
foundation lives in `HD-CORE`.

## Critical: sibling checkout requirement

Dependencies on the shared layer use relative paths, e.g.
`"@hd/core-rbac": "file:../HD-CORE/packages/rbac"`. **`HD-CORE` must be cloned as a sibling
directory** (`../HD-CORE`) or `npm install` fails. CI checks out `HD-CORE` alongside this repo (see
`.github/workflows/ci.yml`). Auth, RBAC, types, and validation come from `@hd/core-*`.

> `README.md` lists an aspirational stack (Next.js/NestJS/Shadcn). The actual stack is React 18 +
> Vite 6 + Tailwind v4 (client) and Express + Prisma (server), plus the integrations below.

## Commands

```bash
npm install              # runs `prisma generate` via postinstall
npm run dev              # tsx server.ts — Express server
npm run lint             # eslint src --ext ts,tsx && tsc --noEmit  ← the real quality gate here
npm run typecheck        # placeholder (echo TODO) — use `lint` instead
npm run test             # placeholder (echo TODO)
npm run format           # prettier on src/**
npm run build            # build:client (vite build) + build:server (esbuild → dist/server.cjs)
npm start                # node dist/server.cjs
# Operational / data scripts:
npm run train:agents         # node scripts/train-agents.mjs
npm run simulate:users       # node scripts/simulate-users.mjs
npm run simulate:messages    # node scripts/simulate-message-load.mjs
# Deploy:
npm run deploy:cloudflare    # vite build + wrangler pages deploy
```

Unlike the other HD apps, the quality gate here is **`npm run lint`** (ESLint + `tsc --noEmit`), not
`typecheck`. There is a full `eslint.config.js`. No test runner is wired up yet.

## Architecture

**Single Express process, two modes** (`server.ts`): mounts API routers under `/api/*`; in
production also serves the Vite-built client with SPA fallback.

Server code is more layered than the other apps (`server/`): `routes/`, `controllers/`, `services/`,
`modules/`, `validators/`, `middleware/` (JWT `requireAuth`, audit), `events/`, `config/`, `db.ts`,
`utils/`. The React client lives in `src/`.

**Integrations** (this app is the heavy one):
- **WhatsApp Business** via `@whiskeysockets/baileys` (QR pairing via `qrcode`) — see
  `docs/whatsapp-business-integration-plan.md`.
- **Background jobs** via `bullmq` + `ioredis` (`REDIS_URL`).
- **AI agents** via `@google/genai` (see `docs/RH_AGENT_POLICY.md`, `docs/agent-training-report.md`).
- **Firebase** (`firebase`, `firestore.rules`, `firebase*.json`) for some realtime/storage features.
- **Candidate import** from Computrabajo (`COMPUTRABAJO_*` env vars).

**Deployment targets**: `Dockerfile`, `render.yaml`, `wrangler.toml` / Cloudflare Pages, `.do/`
(DigitalOcean). Persistence via `prisma/schema.prisma` (PostgreSQL); run `npx prisma generate` after
schema edits.

## RBAC

Use `@hd/core-rbac`'s `hasPermission()` (wildcards like `rh.*`, e.g. `rh.candidates.read`,
`rh.reports.view`). Permission strings are defined centrally in HD-CORE.

## Config & docs

Copy `.env.example` to `.env` (`DATABASE_URL`, `REDIS_URL`, Google GenAI / Firebase / Computrabajo
keys, `BRAIN_EVENTS_URL`, `OPERATIONS_EVENTS_URL`, `VITE_API_BASE_URL`). Extensive design docs live
in `docs/` (production architecture, events, domain separation, agent policy, WhatsApp plan,
quality gate) plus top-level `PRODUCTION_PLAN.md` and `SECURITY.md` — read these before non-trivial
changes.
