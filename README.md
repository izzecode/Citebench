# Citebench

Citebench is a focused title and abstract screening workspace for systematic and
scoping reviews. It helps small review teams clean citation exports, make
consistent decisions, resolve disagreements, and produce traceable review
outputs.

## Current Status

This repository contains a working local prototype and an authenticated Supabase
data path:

- Next.js App Router scaffold.
- Local project creation, CSV import, screening, conflict review, and export.
- Deployed Supabase Postgres schema with row-level security.
- Magic-link sign-in and callback flow, validated with a real account.
- Hosted project, citation, reviewer decision, and final-decision persistence.
- Copyable co-reviewer invitations with email-matched acceptance and direct
  return to the shared screening queue.
- Clear completion actions after a reviewer finishes every citation.
- Automatic browser-storage fallback while signed out.
- Responsive cobalt interface with semantic success states.
- Public source repository at `https://github.com/izzecode/Citebench`.
- Build-ready PRD, sample project, and hosted acceptance test in `docs/`.

The next milestone is the two-account hosted acceptance test, followed by
cross-reviewer conflict derivation and production deployment.

## Local Development

Use the bundled/package-managed Node environment and run:

```bash
pnpm dev
```

Then open:

```text
http://localhost:3000
```

The synthetic acceptance dataset is available at:

```text
http://localhost:3000/citebench-sample-citations.csv
```

The app includes a signed-out local demo that stores data in the browser. When
Supabase is configured and the user signs in, projects are stored in Postgres
instead. To connect another Supabase project, copy `.env.example` to
`.env.local`, add the project URL and public key, then apply
the SQL files in `supabase/migrations` in filename order.

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
- Typed CSV parsing with field aliases and duplicate detection
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
