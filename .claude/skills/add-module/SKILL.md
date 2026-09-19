---
name: add-module
description: Scaffold a new tenant-scoped business module (CRM, ERP, etc.) for the lohn.cc platform, following the conventions established by the core package.
---

# Add a lohn.cc module

Use this when asked to add a new business module to the platform — e.g. "add a CRM module", "start the ERP invoicing module", "add a `leads` package".

## Conventions (established by `packages/core` — auth + tenancy)

- **Monorepo**: pnpm workspace + Turborepo. New modules live at `packages/<name>` and are picked up automatically by `pnpm-workspace.yaml` (`packages/*`).
- **Tenancy**: every business table belongs to an organization. Better Auth's `organization` plugin (in `@lohn/auth`) is the source of truth for tenants — do not create a parallel "tenant" or "account" table. Reference it as `organizationId: text("organization_id").notNull().references(() => organization.id)`.
- **Schema**: each module owns a schema file under `packages/db/src/schema/<module>.ts`, imported into `packages/db/src/schema/index.ts` via `export * from "./<module>";` (no `.js` extension — see note below). Tables use `pgTable`, snake_case column names, `text("id").primaryKey()` for IDs (matches Better Auth's ID style), `createdAt`/`updatedAt` timestamps.
- **Module code lives in `packages/db`, not a separate per-module DB package** — one shared Postgres schema, namespaced by table prefix if needed, keeps migrations and joins simple for a one-person team. Only split into its own package if a module is later spun out as a standalone product.
- **Auth checks**: every mutating server action / route handler in `apps/web` must call `auth.api.getSession({ headers: await headers() })` and verify the caller is a member of the `organizationId` being acted on (via `auth.api.getFullOrganization` or a direct `member` table lookup) before touching module data. Never trust an `organizationId` from the client without checking membership.
- **UI**: module pages live under `apps/web/src/app/<module>/`. Keep server components as the default; only mark `"use client"` for interactive forms (see `src/app/sign-up/page.tsx`, `src/app/org-panel.tsx` for the pattern).
- **Extension imports**: within `packages/db` and `packages/auth`, use extensionless relative imports (`./schema/index`, not `./schema/index.js`) — `tsconfig.base.json` uses `moduleResolution: Bundler`, and Next.js/Turbopack resolve these fine, but the `.js`-extension form breaks drizzle-kit's config loader in this repo. Cross-package imports still go through the package's `exports` map (e.g. `@lohn/db/schema`).

## Steps

1. **Create the package skeleton** (only if the module needs its own deployable surface — most business modules do NOT need this; they just add a schema file + web routes). Copy the shape of `packages/auth/package.json` for a new internal package: `name: "@lohn/<name>"`, `"type": "module"`, `exports` map, `workspace:*` deps.
2. **Add the schema**: create `packages/db/src/schema/<module>.ts` with tenant-scoped tables, add relations if needed, then `export * from "./<module>";` in `packages/db/src/schema/index.ts`.
3. **Generate + apply the migration**:
   ```
   cd packages/db
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```
   (Postgres must be running — `podman-compose -f infra/podman-compose.yml up -d`.)
4. **Add server actions / route handlers** in `apps/web/src/app/<module>/`, gated by the auth+membership check above.
5. **Add UI** under the same route folder, following the existing page patterns.
6. **Typecheck the affected packages directly with `tsc`, not `turbo run typecheck`** — in this sandboxed dev environment, Turborepo's task spawner fails with `Exec format error` when it shells out to task binaries; running `tsc --noEmit` (bare, or via `-p <package>`) directly works fine. Re-test this if working outside the sandbox — it may be a sandbox-specific quirk, not a real repo issue.
7. Run the golden path manually (sign up / sign in already covered by core — exercise the new module's create/read/update flow via `curl` against `apps/web`'s dev server, or in the browser) before calling the module done.

## Stack reference

Turborepo (pnpm workspaces) + Next.js (App Router, TS) + Drizzle ORM + PostgreSQL + Better Auth (`organization` plugin for multi-tenancy). Postgres runs containerized via Podman (`infra/podman-compose.yml`); the app is intended to be exposed via Cloudflare Tunnel for remote/client access rather than opening ports directly (tunnel setup is a manual, interactive step — not yet wired up as of the core module's build).
