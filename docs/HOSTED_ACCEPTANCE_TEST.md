# Citebench Hosted Acceptance Test

Status: Ready to run  
Last updated: 2026-07-29

## Purpose

Confirm that an authenticated review workflow persists correctly to Supabase
from project creation through screening, final decisions, and export.

## Preconditions

- The local app is running at `http://localhost:3000`.
- Supabase environment variables are present in `.env.local`.
- All migrations in `supabase/migrations` have been applied.
- `http://localhost:3000/auth/callback` is an allowed Auth redirect URL.
- The tester has completed magic-link sign-in in the browser used for the test.
- The app sidebar shows the signed-in email and the project list says
  `Synced with Supabase`.

## Test Project

Use these values:

- Title: `Telehealth follow-up after stroke - hosted acceptance test`
- Research question: `How is telehealth used to support adults after stroke discharge?`
- Inclusion criteria: `Adults after stroke; telehealth follow-up; primary research; title or abstract in English.`
- Exclusion criteria: `Non-stroke populations; no telehealth component; protocols, editorials, or reviews.`

## Workflow

1. Create the test project and confirm the import screen opens.
2. Select `Use sample dataset`, then import the records.
3. Confirm the import result contains:
   - 12 source rows.
   - 9 unique citations.
   - 2 duplicate citations.
   - 1 dropped row with a missing title.
4. Screen the first citation as `Include`.
5. Screen the second citation as `Maybe` with `Unclear from abstract`.
6. Finish the remaining citations and confirm the completion panel offers
   `Review decisions` and `Continue to project`.
7. On the project overview, enter a second test email under `Review team`,
   create the invitation, and copy the generated link.
8. Open the link in a signed-out browser, request access using the invited
   email, and confirm the magic link opens this project's screening queue.
9. Confirm the co-reviewer appears as `active` in the owner's review-team panel.
10. Open the review queue for uncertain records and save a final decision with a
   non-empty rationale.
11. Confirm the dashboard metrics update after each decision.
12. Open the PRISMA view and confirm its totals match the dashboard.
13. Export the screened CSV and confirm reviewer and final-decision columns are
   populated.

## Database Verification

Run this read-only query in the Supabase SQL editor:

```sql
select
  p.title,
  count(distinct c.id) as citation_rows,
  count(distinct c.id) filter (where c.duplicate_of is null) as unique_citations,
  count(distinct d.id) as reviewer_decisions,
  count(distinct fd.id) as final_decisions
from public.projects p
left join public.citations c on c.project_id = p.id
left join public.decisions d on d.citation_id = c.id
left join public.final_decisions fd on fd.citation_id = c.id
where p.title = 'Telehealth follow-up after stroke - hosted acceptance test'
group by p.id, p.title;
```

Expected result after the workflow:

- `citation_rows`: 11
- `unique_citations`: 9
- `reviewer_decisions`: 2
- `final_decisions`: 1

## Pass Criteria

- No browser console errors block the workflow.
- The project remains available after a hard refresh.
- Only the invited email can accept the pending co-reviewer slot.
- The invite link returns the accepted co-reviewer to the correct queue.
- Dashboard and PRISMA totals agree.
- Exported decisions match the choices made in the UI.
- Supabase returns the expected counts.
- A signed-out browser cannot read the hosted project.
