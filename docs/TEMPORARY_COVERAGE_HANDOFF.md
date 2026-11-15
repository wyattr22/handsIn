# Temporary coverage — first interactive slice

**Current update:** Coverage now shares a demo session with the calendar and a Today screen, using the integration branch's Morgan-family identities and shell. See [calendar connection and integration alignment](COVERAGE_CALENDAR_CONNECTION.md) for current routes, walkthrough and verification. The original first-slice account below is historical; its Nora/Casey walkthrough is superseded by Alex/Ben.

Built locally November 14, 2026 on `codex/temporary-coverage`, based on `8a454de`. The user authorized beginning the build after reviewing the preparation package. No other branch was merged. Main, deployment and database are unchanged.

## Open and run

- `/coverage` explains integration status and links to the demo; it exposes no care records.
- `/coverage/demo` runs the complete fictional coordinator/helper walkthrough. Start as Maya, review the selected everyday tasks and sharing approval, request Casey, then switch to Casey to accept. Use **Demo tools → Start visit**, review task instructions, record results, and submit a report. Switch back to Maya for follow-up.
- Switch to Eli for an independent recipient; the unrelated account has no handoff view. Demo tools also exercise changed instructions, expiry, reset and a failed save/retry.

Standard setup: `npm ci`, `npm run test:coverage`, `npm run typecheck`, `npm run build`, `npm run dev`. Tests require Node 22.18+ or Node 24 for built-in TypeScript stripping. No new project dependencies or environment variables were introduced. The current shell has Node but no npm on PATH; verification used a temporary npm CLI outside the repository for the existing lockfile install.

## What works in this slice

- Whole-task selection for a known helper, reviewed handoff and explicit original availability at request submission.
- Minimal invitation preview; intended-person acceptance/decline; no premature confirmed status.
- Separate arrival self-report, reviewed current instructions, task outcomes and report submission.
- Done, recipient-declined, unable and uncertain results; unreported tasks remain unknown. Follow-up acknowledgment does not complete tasks.
- Task-scoped handoff projection, recipient separation, exact expiry and cancellation/withdrawal, instruction/version conflicts, operation-key deduplication and retry failure feedback.
- Responsive HandsIn styling, labeled native forms, visible keyboard focus, live save/error announcements and text statuses.

`src/features/coverage/domain.ts` contains fictional model transitions, projections, fixtures, and a proposed `CoverageClient` boundary. `CoverageDemo.tsx` is the browser-only adapter and presentation. All records are synthetic and held in React memory. Refresh resets state; different tabs/devices do not synchronize. The source-change tool simulates an upstream instruction change and is not a care-plan editor.

This is **not production access control**: all fixture data is shipped to the demo browser, and persona switching is not authentication. There is no mutation API, real invitation token, persisted assignment transfer, real notification, encryption or database grant. No real personal/health data should be entered. No claim of live integration or clinical validation is made.

The scenarios have fixed times, people and coordinator-approved sample details. The first slice does not yet create arbitrary visits, select arbitrary candidates, persist drafts, deliver clarification messages, reopen expired requests or correct saved outcomes. A new attempt after the fixed deadline requires resetting the demonstration. These are next-slice work, not hidden simulated integrations. Medication, personal care and other unsupported categories cannot use the generic outcome path.

## Updated integration evidence

Fetched and inspected available branches before building:

| Branch | Tip | Implication |
| --- | --- | --- |
| Calendar/delegation | `9b9324c` | Adds primary/backup priorities. Coverage must transfer the intended primary slot without removing accepted backups indiscriminately; initial preparation's single-assignee assumption needs this refinement |
| People/roles | `19a7a87` | Preview only. Cumulative categories/overrides, temporary replacement of regular scope, overlapping grants and encryption/trusted-device requirements need shared host resolution |
| Meals/daily care | `4cfe95c` | Builds on calendar; care logging and category-grant contracts now exist in that branch, but production persistence/access are unconnected |
| Medication scanner | `3d03f47` | Contains auth/circle plumbing on a separate branch. Circle membership does not establish the temporary task/field access this feature needs; not merged or connected here |

Read `docs/PEOPLE_PREVIEW_HANDOFF.md`, `docs/MEALS_DAILY_CARE_HANDOFF.md` and `src/contracts/coordination.ts` at those refs. Existing `CoveragePort.request(taskId)` can open a coverage draft after an intentional integration; this branch does not copy calendar/task services or silently wire separate demo stores together.

## What is needed for connected use

1. Agree a host identity/access resolver with Caleb that supplies verified actor, category/task/recipient scope, resource disclosure, current expiry/revocation and the team's encryption design. Resolve temporary replacement vs independent standing permission restoration at the shared boundary, not here.
2. Agree with AJ a single atomic operation for original withdrawal, replacement acceptance, primary-slot transfer, grant issue, receipt and outbox. Current preview version checks model conflicts, not multi-process database locking. Preserve backups and existing task IDs.
3. Bind handoff instructions to the maintained care-plan source/version and use the owning calendar/care service for outcomes. The `CoverageTask` fixture projection is not a competing source of truth. Material scope/time changes require new acceptance, not just instruction acknowledgment.
4. Replace the browser adapter with authenticated server reads/writes and shared persistence. Validate runtime input and authorization on every route, storage request and subscription; keep sensitive views uncached. Test direct API/data denial, two real sessions, replay, expiry and concurrent acceptance before using real data.
5. Integrate approved contact/notification delivery separately; queued, delivered, accepted, arrived and completed remain distinct. No message was sent during this build.

The user reviewed the local demo and approved publishing this section to the shared GitHub feature branch. No team contact, merge, production deployment, paid resource or database migration is included. Integration ownership/decisions need coordination before connecting services; they do not block reviewing the working demo.

## Verification evidence

- 14 Node domain tests passed, covering minimal preview, recipient/identity projection, acceptance/arrival separation, deadline/revocation, stale competing commands, exact expiry, preparation vs execution, instruction versions, idempotency, unfinished reports, withdrawal, task subset disclosure, unsupported medication and follow-up semantics.
- Repository TypeScript check and optimized Next.js build passed; routes `/coverage` and `/coverage/demo` generated successfully.
- Headless Chrome exercised request → acceptance → arrival → instruction review → result → report with unknown work → coordinator follow-up, plus unrelated-account projection. No page errors.
- A second browser check exercised failed-save retry, decline/re-invite, changed instructions and expiry with an open page. Mobile checks used 390px width with no horizontal page overflow. Desktop/mobile screenshots were visually inspected in ignored `.coverage-test-output/`.

Data flow verified is UI → pure in-memory transition → projected UI. Client/API, database authorization, encrypted storage, cross-device synchronization and real notifications are intentionally unconnected and therefore unverified. The initial preparation files in `docs/temporary-coverage/` remain historical design material; this handoff records the current implementation and differences.
