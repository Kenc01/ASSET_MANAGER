# Dev Account Manager

A personal productivity dashboard for developers to organize and track development/test accounts — with status tracking, live cooldown timers, encrypted password storage, and import/export.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/dev-account-manager run dev` — run the frontend (port 23495)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind CSS + shadcn/ui

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/accounts.ts` — Accounts table schema
- `artifacts/api-server/src/routes/accounts.ts` — All account API routes
- `artifacts/dev-account-manager/src/` — Frontend React app

## Architecture decisions

- Passwords are encrypted with bcryptjs before storage and never returned via API — the frontend shows a lock icon for security
- Cooldown end time is computed from `cooldownStartedAt + cooldownDurationHours`, not stored separately — reduces sync issues
- All status transitions happen through dedicated endpoints (not just PATCH /accounts/:id) so the server can set timestamps automatically
- Frontend uses wouter for routing with a persistent sidebar layout

## Product

- Dashboard overview with account cards, stats (Total, Available, In Use, Cooling Down, Ready Soon)
- Status system: Available (green), In Use (blue), Cooling Down (orange with live countdown timer), Archived (gray)
- Cooldown timers update every second in real time
- Search by email or tag, filter by status, sort by recently-used / ready-first / cooldown-ending-soon
- Add/Edit account modal with email, password, notes, tags, cooldown duration
- Export accounts as JSON, import from JSON file
- Archived accounts page
- Toast notifications on all actions

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm run typecheck:libs` after any schema changes before running the API server typecheck
- `bcryptjs` is installed as a devDependency on the api-server (used at runtime in the CJS bundle)
- The `account_status` pgEnum must be dropped and recreated if you add new status values

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
