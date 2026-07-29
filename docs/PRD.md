# Citebench PRD

Status: v1 build spec  
Owner: Olumide Elijah Sorinola  
Last updated: 2026-07-28

## Implementation Status

Completed:

- Project creation and browser persistence.
- CSV import, field mapping, duplicate detection, and dropped-row summary.
- Title/abstract screening with keyboard shortcuts.
- Maybe review/final decisions, dashboard progress, PRISMA preview, and CSV export.
- Supabase project connection and hosted schema deployment.
- Row-level security verified on projects, reviewers, citations, decisions, and
  final decisions.
- Magic-link auth integration and local callback URL configuration.
- Hybrid persistence: authenticated workflows use Supabase while signed-out
  users can continue with the browser prototype.
- Hosted project creation/list/view, citation import, reviewer decisions, and
  final decisions.

Next validation and launch work:

- End-to-end magic-link sign-in and hosted persistence test with a real email.
- Co-reviewer invite testing with two real email accounts.
- Reviewer conflict derivation from both hosted decision sets.
- PRISMA PNG export.
- Production deployment and launch policies.

## Summary

Citebench is a lightweight web app for early-career researchers running systematic or scoping reviews. It helps a small review team move from an exported citation CSV to title/abstract screening, conflict resolution, a screened dataset, and a PRISMA-style flow diagram without relying on spreadsheets or heavyweight institutional software.

The v1 product is intentionally narrow: one project owner, up to one co-reviewer, title/abstract screening only, CSV import, conflict resolution, and export.

## Target Users

### Primary User

An early-career researcher, PhD student, research assistant, or junior fellow leading a first or second systematic/scoping review. They are comfortable with spreadsheets but want a structured workflow.

### Secondary User

A co-reviewer invited to screen citations. They should be able to follow a link, sign in, and start screening with little setup.

## Positioning

Citebench is not a full replacement for Covidence, Rayyan, DistillerSR, Zotero, or Mendeley. It is the fastest simple path for a small review team to:

1. Upload citations.
2. Screen titles and abstracts.
3. Resolve conflicts.
4. Export PRISMA and CSV outputs.

## V1 Goals

- Let a researcher create a project and import citations in under 15 minutes.
- Support two reviewers screening the same citation set independently.
- Surface reviewer disagreements automatically.
- Let the project owner make final include/exclude decisions.
- Generate a PRISMA-style flow diagram from project data.
- Export the screened dataset as CSV.
- Provide a deployable portfolio-quality product with a real live URL.

## V1 Non-Goals

- Full-text screening.
- PDF upload or storage.
- Risk of bias assessment.
- Data extraction for meta-analysis.
- Reference manager replacement.
- More than two reviewers.
- Team or institution workspaces.
- Real-time collaborative editing.
- Custom PRISMA templates.
- Mobile-first optimization.
- Multi-language support.

## Product Decisions

### Stack

- Framework: Next.js App Router.
- Language: TypeScript.
- Styling: Tailwind CSS.
- UI primitives: local components first; shadcn/ui can be added if useful.
- Auth: Supabase magic-link authentication.
- Database: Supabase Postgres.
- Security: Supabase Row Level Security on all user/project data tables.
- CSV parsing: Papa Parse.
- Hosting: Vercel.
- Diagram export: generated SVG converted/downloaded as PNG in-browser.

### Reviewer Limit

V1 supports a maximum of two reviewers per project:

- Owner reviewer.
- Optional invited co-reviewer.

Any request for three or more reviewers is out of scope for v1.

### Screening Verdicts

Reviewers can choose:

- Include.
- Maybe.
- Exclude.

The project owner can make final decisions only as:

- Include.
- Exclude.

### Conflict Rules

A citation is considered a conflict when both reviewers have screened it and their verdicts differ.

Examples:

- Include vs Exclude: conflict.
- Include vs Maybe: conflict.
- Exclude vs Maybe: conflict.
- Maybe vs Maybe: not a conflict, but still unresolved until final decision rules are applied.

For v1, any citation with at least one Maybe should appear in the conflict/resolution workflow unless both reviewers chose the same non-Maybe verdict.

### Duplicate Detection

During import, Citebench detects duplicates synchronously using:

1. DOI match, case-insensitive and normalized.
2. If no DOI, normalized title match.

Duplicate citations are stored with `duplicate_of` pointing to the retained citation and are excluded from screening queues.

### CSV Import

V1 accepts `.csv` files from PubMed, Scopus, or generic reference managers.

Required field:

- Title.

Recommended fields:

- Abstract.
- Authors.
- Year.
- Journal.
- DOI.
- Source.

The importer should map common field variants, including:

- `title`, `Title`, `Article Title`.
- `abstract`, `Abstract`.
- `authors`, `Authors`, `Author`.
- `year`, `Year`, `Publication Year`.
- `journal`, `Journal`, `Source title`.
- `doi`, `DOI`.

Rows without a usable title are dropped and counted with a reason.

### Invite Flow

V1 invite flow:

1. Project owner enters co-reviewer email.
2. App creates a pending reviewer record.
3. Co-reviewer signs in with Supabase magic link.
4. If the signed-in email matches a pending reviewer record, the invite is accepted.

Custom invite tokens are deferred unless Supabase magic-link matching proves insufficient.

## Core Screens

### Landing Page

- Headline: "Run your systematic review without the spreadsheet chaos."
- Short subtitle.
- Primary CTA.
- Three-step explanation.
- Public roadmap/out-of-scope section.
- Footer links: GitHub, About, portfolio, privacy, terms.

### Auth

- Email input.
- Magic-link send confirmation.
- Auth callback route.

### Project List

- Shows projects owned by or assigned to the signed-in user.
- New project button.
- Empty state for first-time users.

### Project Setup

Fields:

- Title.
- Research question.
- Inclusion criteria.
- Exclusion criteria.

Follow-up setup actions:

- Import CSV.
- Invite co-reviewer.

### CSV Import

- Upload CSV.
- Preview detected fields.
- Show import summary:
  - Imported citations.
  - Duplicates.
  - Dropped rows.
- Confirm import.

### Project Dashboard

Dashboard metrics:

- Total unique citations.
- Screened count.
- Reviewer progress.
- Pending conflicts.
- Final included count.

Actions:

- Resume screening.
- Resolve conflicts.
- View PRISMA.
- Export CSV.

### Screening Interface

- One citation at a time.
- Citation title, year, journal, authors, abstract.
- Include, Maybe, Exclude actions.
- Optional exclusion/maybe reason.
- Back/forward navigation.
- Keyboard shortcuts:
  - `1`: Include.
  - `2`: Maybe.
  - `3`: Exclude.
  - Left/right arrows: previous/next.

### Conflict Resolution

- List of unresolved conflicts.
- Citation title and reviewer verdicts.
- Decision modal/detail view.
- Final Include/Exclude decision.
- Required short rationale.

### PRISMA Flow

Generated from project data:

- Records identified.
- Duplicates removed.
- Records screened.
- Records excluded.
- Records included.

V1 should export PNG and keep SVG generation deterministic.

### Export

CSV export includes:

- Citation metadata.
- Duplicate status.
- Reviewer verdicts.
- Reviewer reasons.
- Final decision.
- Final rationale.

## Data Model

### users

Supabase Auth users are canonical. A local profile table may be added only if needed.

### projects

- `id uuid primary key`
- `owner_id uuid not null references auth.users(id)`
- `title text not null`
- `research_question text`
- `inclusion_criteria text`
- `exclusion_criteria text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### reviewers

- `id uuid primary key`
- `project_id uuid not null references projects(id)`
- `user_id uuid references auth.users(id)`
- `email text not null`
- `role text not null check role in ('owner', 'reviewer')`
- `invited_at timestamptz`
- `accepted_at timestamptz`

### citations

- `id uuid primary key`
- `project_id uuid not null references projects(id)`
- `title text not null`
- `abstract text`
- `authors text`
- `year integer`
- `journal text`
- `doi text`
- `source text`
- `duplicate_of uuid references citations(id)`
- `created_at timestamptz not null default now()`

### decisions

- `id uuid primary key`
- `citation_id uuid not null references citations(id)`
- `reviewer_id uuid not null references reviewers(id)`
- `verdict text not null check verdict in ('include', 'exclude', 'maybe')`
- `reason text`
- `created_at timestamptz not null default now()`
- Unique constraint: `(citation_id, reviewer_id)`

### final_decisions

- `id uuid primary key`
- `citation_id uuid not null references citations(id)`
- `verdict text not null check verdict in ('include', 'exclude')`
- `rationale text not null`
- `decided_by uuid not null references auth.users(id)`
- `created_at timestamptz not null default now()`
- Unique constraint: `(citation_id)`

## Security Requirements

- Magic-link authentication only.
- No passwords handled by the app.
- All project data protected by RLS.
- Users can access a project only if they are the owner or an accepted reviewer.
- Pending reviewer acceptance requires matching authenticated email.
- No PII collected beyond email.
- Privacy notice and basic terms required before public launch.

## Performance Targets

- Screening navigation: under 100ms perceived response between citations.
- CSV import: 5,000 citations under 30 seconds.
- PRISMA diagram generation: under 2 seconds.

## V1 Acceptance Criteria

- User can sign in by magic link.
- User can create a project.
- User can import a CSV and see import summary.
- User can screen unique citations.
- User can invite one co-reviewer.
- Co-reviewer can accept and screen.
- Owner can see conflicts.
- Owner can resolve conflicts.
- Dashboard reflects project progress.
- PRISMA flow renders from project data.
- User can export CSV.
- App is deployed publicly.

## Risks

- Supabase RLS mistakes could expose project data.
- CSV formats vary heavily across databases and reference managers.
- Duplicate detection can create false positives or false negatives.
- Email deliverability can affect magic-link and invite reliability.
- Free-tier limits may affect large citation imports.
- Research users may expect audit logs and more formal compliance than v1 provides.

## Build Plan

### Phase 1: Local Product Shell

- Scaffold Next.js app.
- Add Tailwind styling.
- Add landing page.
- Add route structure.
- Add static dashboard/screening prototypes.

### Phase 2: Supabase Foundation

- Create Supabase schema migration.
- Add auth helpers.
- Implement magic-link sign-in.
- Implement project create/list/view.
- Add RLS policies.

### Phase 3: Citation Import and Screening

- Add CSV upload.
- Add field mapping.
- Add duplicate detection.
- Persist citations.
- Build screening queue and decisions.

### Phase 4: Collaboration and Conflicts

- Add reviewer invites.
- Add pending invite acceptance.
- Add conflict derivation.
- Add final decision workflow.

### Phase 5: PRISMA and Export

- Generate PRISMA SVG.
- Add PNG export.
- Add screened dataset CSV export.
- Polish dashboard and launch pages.

## Launch Checklist

- Live URL works.
- Magic-link sign-in works.
- Sample CSV is available.
- Privacy notice and terms are linked.
- GitHub repo has clear README.
- README includes screenshot, live URL, and project story.
- At least two external testers complete a screening session.
- Portfolio, LinkedIn, and CV are updated.
