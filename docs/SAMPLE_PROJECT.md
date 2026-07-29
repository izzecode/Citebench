# Citebench Sample Project

Use this synthetic project to test project setup, CSV import, duplicate
detection, screening, uncertain-record resolution, PRISMA totals, and export.

## Project Setup

- Title: `Telehealth follow-up after stroke - hosted acceptance test`
- Research question: `How is telehealth used to support adults after stroke discharge?`
- Inclusion criteria: `Adults after stroke; telehealth follow-up or remote rehabilitation after discharge; primary research; title or abstract in English.`
- Exclusion criteria: `Non-stroke populations; acute telestroke treatment only; no telehealth component; protocols, editorials, or evidence reviews.`

## Dataset

- Local download: `http://localhost:3000/citebench-sample-citations.csv`
- In the import screen: select `Use sample dataset`.
- Repository file: `public/citebench-sample-citations.csv`

The dataset contains 12 source rows:

- 9 unique citations.
- 2 duplicate records, one matched by DOI and one by normalized title.
- 1 malformed row without a title.
- 1 record without an abstract.
- Several clear inclusion and exclusion examples.

## Suggested Decisions

| Citation | Suggested decision | Reason |
| --- | --- | --- |
| Telehealth follow-up after stroke | Include | Directly evaluates virtual follow-up after stroke discharge. |
| Video-based rehabilitation coaching for stroke survivors | Include | Relevant remote rehabilitation intervention. |
| Telephone medication support after ischemic stroke | Include | Post-discharge telehealth support for a stroke population. |
| Remote blood pressure monitoring after stroke | Include | Remote secondary-prevention follow-up. |
| Caregiver experiences of virtual post-stroke clinics | Maybe | Relevant setting, but eligibility may depend on the review population definition. |
| Telestroke thrombolysis in rural emergency departments | Exclude | Acute treatment rather than post-discharge follow-up. |
| Mobile physiotherapy after knee arthroplasty | Exclude | Wrong population. |
| Protocol for a virtual stroke follow-up trial | Exclude | Protocol without study results. |
| Community portal for long-term stroke recovery | Maybe | No abstract; full details are unclear. |

Duplicate rows are retained for audit purposes but do not enter the screening
queue.
