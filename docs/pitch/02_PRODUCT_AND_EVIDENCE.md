# Product snapshot and pitch evidence

This is a dated pitch audit, not an implementation specification. Read the [existing product catalog](../planning/01_PRODUCT_DEFINITION.md), [research](../planning/02_RESEARCH.md), [architecture](../planning/03_ARCHITECTURE.md), and [build plan](../planning/04_BUILD_PLAN.md) for material already in GitHub. Their plans and suggested demonstrations are not verification.

## Repository and deployment snapshot

Git fetch and the GitHub branches API agreed at approximately 9:55 AM Pacific on November 15:

| Reference | Commit | Pitch significance |
| --- | --- | --- |
| main | `8a454dedf941bd38325fa9c147c295d09b2fca8c` | Starter plus documentation |
| codex/full-app-trial | `c0b380f110ed9557b87e5886c637f096d918c8e4` | Newest combined candidate found |
| integration/cohesive-app | `087a9be6db7701ae0d4caf568d5e4ff5382f647f` | Earlier integration branch |

Separate branches also exist for people/roles, temporary coverage, meals/daily care, health records, calendar/delegation and medication scanning. Alerts/NFC, medication-support and paid-help branch tips were still at the main snapshot. Do not infer feature completion from a branch name.

GitHub reported a successful Vercel status for full-app-trial at **2026-11-15 07:54:10 UTC** (November 14, 11:54:10 PM Pacific), linking to [this deployment dashboard](https://vercel.com/wyattr22/handsin/48RnYXsXHy7N4ykZWtdpdfb3tfmr). Deployment details were inaccessible to the reviewer's Vercel connection because it lacked the team's authorization. The public preview URL, backend configuration and submitted commit remain unknown.

The README's [handsin-six.vercel.app](https://handsin-six.vercel.app) was opened successfully in a browser and showed the branded starting page with “build in progress” wording. This URL is not confirmed as the team's final submission. Main's source matches that page's visible content, but the exact served deployment SHA was not established.

Only [PR 1](https://github.com/wyattr22/handsIn/pull/1) and [PR 2](https://github.com/wyattr22/handsIn/pull/2) were returned by the PR collection at inspection; both were unmerged. No releases were returned. These observations may become stale.

## Existing implementation evidence to read

All links below are pinned to the inspected combined candidate:

- [Connected workspace and prior verification](https://github.com/wyattr22/handsIn/blob/c0b380f110ed9557b87e5886c637f096d918c8e4/docs/CONNECTED_WORKSPACE.md)
- [Trial checklist and boundaries](https://github.com/wyattr22/handsIn/blob/c0b380f110ed9557b87e5886c637f096d918c8e4/docs/TRIAL_CHECKLIST.md)
- [Teammate setup and release boundaries](https://github.com/wyattr22/handsIn/blob/c0b380f110ed9557b87e5886c637f096d918c8e4/docs/TEAMMATE_START_HERE.md)
- [Connected workspace source](https://github.com/wyattr22/handsIn/blob/c0b380f110ed9557b87e5886c637f096d918c8e4/src/features/workspace/ConnectedWorkspace.tsx)
- [Authenticated record API](https://github.com/wyattr22/handsIn/blob/c0b380f110ed9557b87e5886c637f096d918c8e4/app/api/records/route.ts)
- [Capture and review flow](https://github.com/wyattr22/handsIn/blob/c0b380f110ed9557b87e5886c637f096d918c8e4/src/features/workspace/CaptureRecord.tsx)
- [Source extraction](https://github.com/wyattr22/handsIn/blob/c0b380f110ed9557b87e5886c637f096d918c8e4/src/features/workspace/extract-source.ts)
- [Medication parser](https://github.com/wyattr22/handsIn/blob/c0b380f110ed9557b87e5886c637f096d918c8e4/lib/medications/parse-label.ts)
- [Health-report parser and synthetic sample](https://github.com/wyattr22/handsIn/blob/c0b380f110ed9557b87e5886c637f096d918c8e4/lib/health/parse-report.ts)

The full-app-trial documentation reports 112 tests, local backend permission/transaction checks and browser trials with fictional accounts. The pitch reviewer did not rerun them. Reuse the original records rather than duplicating their detailed architecture or test lists here.

## Claims register

| ID | Claim and evidence class | What can be said now | Limitation or proof still needed |
| --- | --- | --- | --- |
| C01 | Public starter observed live | The recorded public URL showed the starter during review | Does not identify final submission |
| C02 | Connected workspace/API source inspected | Candidate code supports shared care records and visit transitions | Must verify deployed two-account behavior |
| C03 | Prior tests reported in repository | Engineering notes report successful local trials | Fictional test accounts are not customers; not rerun; hosted state unknown |
| C04 | OCR/parser source inspected | Tesseract reads text; rules parse fields for human review | No generative-model call found in inspected flows; do not call this Claude reasoning |
| C05 | Capture guard inspected in code | Connected capture requires review confirmation before save | Deployed behavior not verified; a checkbox is not clinical validation |
| C06 | Founder-reported family experience | Seven relatives helped, but only two were willing to handle intimate care | Public sharing authorized; one family, France; no US generalization |
| C07 | Competitor primary pages read | Shared-care products already exist | Vendor claims were not independently tested; no exclusive advantage established |
| C08 | Historical $8/month proposal | A possible price to test | Not validated willingness to pay, revenue or a final team decision |
| C09 | Clinical/outcome/compliance claims | No such claims are presently supported | No clinical accuracy, reduced errors, time savings, outcomes or HIPAA certification evidence |
| C10 | AI calls, live notifications, booking, payments | Do not present as verified completed features | Candidate handoff lists unfinished boundaries; refresh if newer evidence appears |
| C11 | Refresh mechanism source inspected | Connected workspace refreshes periodically and on focus | Ten-second interval in inspected source; do not promise instant real-time sync |
| C12 | GitHub successful deployment status | GitHub reports the candidate deployed | Does not establish working hosted backend, access, upload flow or submitted version |

## AI and health trust

The inspected capture paths use Tesseract OCR and regular-expression parsing. Suggested lab questions are templated from flagged results. No generative-model call was found in those inspected flows. This is a scoped finding, not a claim that no model exists anywhere in future branches.

The candidate's review UI is a concrete potential trust demonstration: compare extracted values to the source, correct them, then explicitly confirm. Describe it as transcription review, not approval of treatment. Show this only after verifying the submitted version.

The original brief mentions Claude, Twilio and AI calls; that is proposed architecture. Coding with Codex is distinct from an AI feature in the app. Verify tool credits with teammates.

Do not claim that HandsIn diagnoses, prescribes, chooses safe doses, guarantees drug compatibility, prevents missed doses, replaces professionals, monitors emergencies, or is HIPAA compliant. Avoid a disclaimer recital; show one actual safeguard and answer detailed questions honestly.

## Current alternatives

Primary sources checked November 15, 2026:

- [Caring Village features](https://caringvillage.com/app/): advertises shared calendars, medication tracking, document storage, messaging, care plans and named task owners; also an AI caregiver assistant.
- [Caring Village pricing](https://caringvillage.com/pricing/): page displayed free, $14.99/month Circle and $24.99/month Village options. Refresh billing selection and current prices before quoting. These prices do not validate HandsIn's willingness to pay.
- [Lotsa Helping Hands](https://lotsahelpinghands.com/): advertises a care calendar, meal/ride task signup and communication; describes its service as free.
- Group chats and spreadsheets remain proposed incumbent behaviors to confirm in actual interviews.

Retire the historical “nobody connects them” line and any unsupported claim that existing apps cannot coordinate responsibilities. HandsIn's proposed emphasis is a clear handoff with accepted responsibility and attributed updates. Preference, ease and differentiation must be tested rather than asserted as uniqueness.

## Compact rubric assessment

Full tiers are in the competition document. No defensible aggregate score was assigned because the submitted product, customer evidence and rehearsal were missing.

| Criterion | Evidence we have | What we can show | Missing proof | Best next action |
| --- | --- | --- | --- | --- |
| Execution/design 25 | Source and reported local tests; public starter observed | Conditional handoff candidate | Submitted hosted flow across accounts | Verify final URL and complete one flow |
| Problem/user 25 | Specific founder experience | The permitted family story | Likely-user conversations and actual use artifacts | Inventory evidence with exact counts/provenance |
| Customers 20 | Family payer and price hypotheses | A small concrete recruitment plan | Named reachable families, switching and price evidence | Identify first three US care circles |
| Pitch/demo 15 | Story and timing proposal | One coherent handoff | Stopwatch rehearsal and honest Q&A | Rehearse actual clicks to 3:40 |
| Creative AI 15 | OCR and parsing; historical build-tool references | Real extraction if verified | Distinctive demonstrated contribution | Name mechanism and verify credits |

Current assessment: execution is unresolved rather than proven by source; problem is specific but validation is missing; business is plausible but untested; pitch is unrehearsed; high creative-AI scores are not currently substantiated. Judge the actual final evidence, not this snapshot's uncertainty.

## Evidence to collect without inventing traction

For each conversation or use session record date, participant role, how recruited, question/task, observed result, exact quote if permitted, assistance required and limits. Count distinct people and families separately. Describe fictional-data usability testing as such. A teammate running the demo is not a target customer.

If no external evidence exists, say the family experience motivated the prototype and describe the next validation step. Do not transform a proposed pilot into an ongoing pilot or a warm introduction into a partnership.

