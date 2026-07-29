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
- Review workflow: `Dual with adjudicator`

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
7. On the project overview, confirm the workflow is `Dual with adjudicator`.
8. Invite a second test email as the reviewer, copy the generated link, and
   accept it in a signed-out browser. Confirm it opens the screening queue.
9. Screen all nine citations as the invited reviewer, deliberately disagreeing
   with the owner on at least one citation.
10. Invite a third test email as the adjudicator, copy the generated link, and
    accept it in another signed-out browser. Confirm it opens conflict
    resolution instead of screening.
11. Confirm both invitees appear as `active` with the correct roles in the
    owner's review-team panel.
12. Confirm resolution stays unavailable for citations until both primary
    reviewers have voted.
13. Resolve every disagreement and Maybe with a non-empty rationale as the
    adjudicator.
14. Confirm the dashboard metrics update after each decision.
15. Open the PRISMA view and confirm its totals match the dashboard.
16. Export the screened CSV and confirm both reviewer decisions and final
    decisions are populated.

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

Expected result after both reviewers finish and at least one item is resolved:

- `citation_rows`: 11
- `unique_citations`: 9
- `reviewer_decisions`: 18
- `final_decisions`: at least 1

## Pass Criteria

- No browser console errors block the workflow.
- The project remains available after a hard refresh.
- Only the invited emails can accept their pending role slots.
- Reviewer and adjudicator links return each invitee to the correct workflow.
- The adjudicator cannot submit primary screening decisions.
- Dashboard and PRISMA totals agree.
- Exported decisions match the choices made in the UI.
- Supabase returns the expected counts.
- A signed-out browser cannot read the hosted project.
