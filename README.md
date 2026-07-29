# Citebench

Citebench is a lightweight screening workflow for systematic and scoping reviews. The v1 goal is simple: help a small research team upload citation CSVs, screen titles and abstracts, resolve conflicts, and export PRISMA/CSV outputs without spreadsheet chaos.

## Current Status

This repository contains a working local prototype and an authenticated Supabase
data path:

- Next.js App Router scaffold.
- Local project creation, CSV import, screening, conflict review, and export.
- Deployed Supabase Postgres schema with row-level security.
- Magic-link sign-in and callback flow.
- Hosted project, citation, reviewer decision, and final-decision persistence.
- Automatic browser-storage fallback while signed out.
- Build-ready PRD in `docs/PRD.md`.

## Local Development

Use the bundled/package-managed Node environment and run:

```bash
pnpm dev
```

Then open:

```text
http://localhost:3000
```

The app works locally without an account and stores prototype data in the
browser. When Supabase is configured and the user signs in, projects are stored
in Postgres instead. To connect another Supabase project, copy `.env.example` to
`.env.local`, add the project URL and public key, then apply
`supabase/migrations/202607280001_initial_schema.sql` in Supabase.

In the Supabase Auth URL settings, add:

```text
http://localhost:3000/auth/callback
```

## Useful Commands

```bash
pnpm lint
pnpm build
```

## V1 Stack

- Next.js + TypeScript
- Tailwind CSS
- Supabase Auth + Postgres + Row Level Security
- Papa Parse for CSV import
- Vercel deployment

## Product Scope

V1 supports:

- One project owner.
- One optional co-reviewer.
- Title/abstract screening only.
- CSV import.
- Include/Maybe/Exclude reviewer decisions.
- Owner conflict resolution.
- PRISMA-style export.
- Screened dataset CSV export.

Out of scope for v1:

- Full-text PDF screening.
- More than two reviewers.
- Risk of bias assessment.
- Data extraction.
- Institution/team workspaces.
