# Citebench PRD

Status: v1 build spec  
Owner: Olumide Elijah Sorinola  
Last updated: 2026-07-29

## Implementation Status

Completed:

- Project creation and browser persistence.
- CSV import, field mapping, duplicate detection, and dropped-row summary.
- Title/abstract screening with keyboard shortcuts.
- Maybe review/final decisions, dashboard progress, PRISMA preview, and CSV export.
- Supabase project connection and hosted schema deployment.
- Row-level security verified on projects, reviewers, citations, decisions, and
  final decisions.
- Magic-link auth integration, local callback configuration, and successful
  sign-in validation with a real email account in Chrome.
- Hybrid persistence: authenticated workflows use Supabase while signed-out
  users can continue with the browser prototype.
- Hosted project creation/list/view, citation import, reviewer decisions, and
  final decisions.
- Authenticated project creation derives ownership from the Supabase session
  inside the database, preventing client/RLS identity mismatches.
- Configurable solo, dual-independent, and dual-with-adjudicator workflows.
- Owner review-team panel with role-specific invitations, copyable links,
  accepted/pending status, and member removal.
- Invite-aware magic-link sign-in returns accepted reviewers to screening and
  adjudicators to conflict resolution.
- Cross-reviewer conflict derivation from both hosted decision sets, with owner
  or adjudicator final decisions.
- Completed screening state provides direct actions to the project overview and
  decision review.
- Responsive cobalt visual system with teal reserved for success and completion
  states.
- Synthetic 12-row acceptance dataset covering duplicates, missing data, clear
  exclusions, and uncertain records.
- Public source repository at `https://github.com/izzecode/Citebench`.
- Production deployment at `https://citebench-six.vercel.app`, linked to the
  GitHub `main` branch.
- Production Supabase Site URL and authentication callback configured.

Next validation and launch work:

- Run the hosted acceptance test in `docs/HOSTED_ACCEPTANCE_TEST.md`.
- Co-reviewer invite testing with two real email accounts.
- PRISMA PNG export.
- Privacy, terms, monitoring, and launch policies.

## Summary

Citebench is a lightweight web app for early-career researchers running systematic or scoping reviews. It helps a small review team move from an exported citation CSV to title/abstract screening, conflict resolution, a screened dataset, and a PRISMA-style flow diagram without relying on spreadsheets or heavyweight institutional software.

The v1 product is intentionally narrow: one project owner, up to two independent screeners, one optional adjudicator, title/abstract screening only, CSV import, conflict resolution, and export.

## Target Users

### Primary User

An early-career researcher, PhD student, research assistant, or junior fellow leading a first or second systematic/scoping review. They are comfortable with spreadsheets but want a structured workflow.

### Secondary Users

A co-reviewer invited to screen citations, or an adjudicator invited to resolve
disagreements. They should be able to follow a role-specific link, sign in, and
start the assigned work with little setup.

## Positioning

Citebench is not a full replacement for Covidence, Rayyan, DistillerSR, Zotero, or Mendeley. It is the fastest simple path for a small review team to:

1. Upload citations.
2. Screen titles and abstracts.
3. Resolve conflicts.
4. Export PRISMA and CSV outputs.

## V1 Goals

- Let a researcher create a project and import citations in under 15 minutes.
- Let owners choose solo, dual-independent, or dual-with-adjudicator workflows.
- Support up to two reviewers screening the same citation set independently.
- Surface reviewer disagreements automatically.
- Let the project owner or assigned adjudicator make final include/exclude
  decisions.
- Generate a PRISMA-style flow diagram from project data.
- Export the screened dataset as CSV.
- Provide a deployable portfolio-quality product with a real live URL.

## V1 Non-Goals

- Full-text screening.
- PDF upload or storage.
- Risk of bias assessment.
- Data extraction for meta-analysis.
- Reference manager replacement.
- More than two primary screeners.
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
- CSV parsing: local typed parser with quoted-cell handling, field aliases, and
  DOI/title duplicate detection.
- Hosting: Vercel.
- Diagram export: generated SVG converted/downloaded as PNG in-browser.

### Review Workflows

V1 supports three explicit workflows:

- Solo: the owner screens and resolves uncertain records.
- Dual independent: the owner and one invited reviewer screen independently;
  the owner resolves disagreements.
- Dual with adjudicator: the owner and one invited reviewer screen
  independently; one invited adjudicator resolves disagreements without
  submitting primary screening votes.

The maximum team size is three people, but the maximum number of primary
screeners remains two. Larger voting panels are out of scope for v1.

### Screening Verdicts

Reviewers can choose:

- Include.
- Maybe.
- Exclude.

The project owner can make final decisions only as:

- Include.
- Exclude.

### Conflict Rules

A citation enters resolution after both primary reviewers have screened it when
their verdicts differ or either reviewer selected Maybe.

Examples:

- Include vs Exclude: conflict.
- Include vs Maybe: conflict.
- Exclude vs Maybe: conflict.
- Maybe vs Maybe: requires resolution.

Matching Include or matching Exclude verdicts are accepted without a separate
final decision. In solo mode, the owner's Maybe decisions enter resolution.

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

1. Project owner chooses a workflow and enters the email for an available role.
2. App creates a pending reviewer or adjudicator record.
3. Owner copies and sends the role-specific invitation link.
4. Invitee opens the link and requests a Supabase magic link using the invited
   email.
5. If the signed-in email matches the pending record, the invite is accepted.
6. Reviewers are sent to screening; adjudicators are sent to resolution.

Custom invite tokens are deferred unless Supabase magic-link matching proves insufficient.

## Core Screens

### Landing Page

- Product headline: "Citebench."
- Value proposition: "Screen evidence with clarity, from first import to final
  decision."
- Primary CTA: "Start a review."
- Secondary CTA: "Explore the workspace."
- Three-step import, screening, and resolution explanation.
- Focused V1 scope section.
- Footer sign-in link.

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
- Review workflow.

Follow-up setup actions:

- Import CSV.
- Invite reviewer or adjudicator when required by the selected workflow.

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
- Completion state with project overview and decision-review actions.
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
- `screening_mode text not null check screening_mode in ('solo', 'dual', 'dual_adjudicated')`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### reviewers

- `id uuid primary key`
- `project_id uuid not null references projects(id)`
- `user_id uuid references auth.users(id)`
- `email text not null`
- `role text not null check role in ('owner', 'reviewer', 'adjudicator')`
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
- User can select solo, dual-independent, or dual-with-adjudicator mode.
- User can invite one co-reviewer and, when enabled, one adjudicator.
- Invitees can accept and land in their role-specific workflow.
- Both primary reviewers can screen independently.
- Owner and assigned adjudicator can see conflicts.
- The configured resolver can save final decisions.
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

### Phase 1: Local Product Shell — Complete

- Scaffold Next.js app.
- Add Tailwind styling.
- Add landing page.
- Add route structure.
- Add static dashboard/screening prototypes.

### Phase 2: Supabase Foundation — Complete

- Create Supabase schema migration.
- Add auth helpers.
- Implement magic-link sign-in.
- Implement project create/list/view.
- Add RLS policies.

### Phase 3: Citation Import and Screening — Hosted Validation

- Add CSV upload.
- Add field mapping.
- Add duplicate detection.
- Persist citations.
- Build screening queue and decisions.

### Phase 4: Collaboration and Conflicts — Complete

- Reviewer invites and copyable share links complete.
- Pending invite acceptance and direct screening return complete.
- Configurable review workflows and role limits complete.
- Cross-reviewer conflict derivation complete.
- Owner/adjudicator final decision workflow complete.

### Phase 5: PRISMA and Export — In Progress

- Generate PRISMA SVG.
- Add PNG export.
- Add screened dataset CSV export.
- Polish dashboard and launch pages.

## Launch Checklist

- [x] Live production URL works.
- [x] Magic-link sign-in works.
- [x] Sample CSV is available.
- [ ] Privacy notice and terms are linked.
- [x] GitHub repo has a clear README.
- [ ] README includes screenshots, live URL, and project story.
- [ ] At least two external testers complete a screening session.
- [ ] Portfolio, LinkedIn, and CV are updated.
