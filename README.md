# Citebench

Citebench is a focused evidence-screening workspace for systematic and scoping
reviews. It helps small review teams clean citation exports, screen titles and
abstracts, review full-text PDFs, resolve disagreements, and produce traceable
review outputs.

Production: `https://citebench-six.vercel.app`

## Current Status

This repository contains a working local prototype and an authenticated Supabase
data path:

- Next.js App Router scaffold.
- Local project creation, CSV import, screening, conflict review, and export.
- Deployed Supabase Postgres schema with row-level security.
- Magic-link sign-in and callback flow, validated with a real account.
- Hosted project, citation, reviewer decision, and final-decision persistence.
- Configurable solo, dual-independent, and dual-with-adjudicator workflows.
- Automatic role-specific invitation emails, resend controls, copyable links,
  email-matched acceptance, and direct return to the assigned workflow.
- Automatic cross-reviewer conflict derivation with owner or adjudicator
  resolution.
- Clear completion actions after a reviewer finishes every citation.
- Private full-text PDF storage with reviewer decisions, exclusion reasons,
  adjudication, and signed document links.
- Full-text PRISMA counts and a combined title/abstract plus full-text CSV
  export.
- Automatic browser-storage fallback while signed out.
- Responsive cobalt interface with semantic success states.
- Public source repository at `https://github.com/izzecode/Citebench`.
- Production deployment at `https://citebench-six.vercel.app`.
- Build-ready PRD, sample project, and hosted acceptance test in `docs/`.

The next milestone is production SMTP configuration and the multi-account
hosted acceptance test, followed by PRISMA PNG export and launch hardening.

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
- Solo, dual-independent, or dual-with-adjudicator review workflows.
- Up to two independent screeners and one non-screening adjudicator.
- Title/abstract screening only.
- CSV import.
- Include/Maybe/Exclude reviewer decisions.
- Owner conflict resolution.
- PRISMA-style export.
- Screened dataset CSV export.

Out of scope for v1:

- Full-text PDF screening.
- More than two primary screeners.
- Risk of bias assessment.
- Data extraction.
- Institution/team workspaces.

The first V2 slice now adds:

- Private PDF upload and replacement for included citations.
- Independent full-text Include/Exclude decisions.
- Standard exclusion reasons and reviewer notes.
- Full-text conflict resolution by the configured resolver.
- PRISMA full-text counts and combined CSV export.

Production collaborator delivery requires custom SMTP in Supabase. Until that
is configured, Citebench still creates the pending role and exposes its
invitation link, but external invitees may not receive either invitation or
sign-in emails.
