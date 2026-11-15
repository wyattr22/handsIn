# Calendar and delegation — W03 implementation handoff

## Status

Implemented on `codex/calendar-and-delegation`, based on `8a454de`. The user separately authorized this module after publication of the documentation-only planning packet. No other work package is assigned by this implementation.

**Partially integrated.** This branch provides domain logic, proposed typed contracts, interactive Day/Week/Month/Year calendar views, event editing, primary/backup delegation, and a fictional workflow demo. It does not provide production authentication, shared database persistence, SMS delivery, temporary-grant creation, or medication administration. No real care records should be entered. Main and its landing page are unchanged.

- `/calendar`: production setup/availability page; exposes no recipient data.
- `/calendar/demo`: explicit fictional, in-memory demo. Persona switching is not authentication. Reloading clears changes; sessions do not synchronize.

## Implemented behavior

- Appointment/visit creation, editing and cancellation; separate linked task windows and transport tasks.
- Multiple recipients; hourly Day/Week grids; selectable Month dates; twelve-month Year overview; date navigation and optional filters.
- All-day items, overlapping-event lanes, multi-day rendering, selected-day schedules, and a simple list alternative.
- Primary, secondary, and ordered additional-backup requests. Backups do not count as primary coverage or automatically take over.
- Linked follow-up appointments and explicit rescheduling of unresolved linked care tasks with renewed acceptance.
- Task creation, daily/weekly recurrence (1–30 occurrences), one/this-and-future edits and cancellation.
- Requests, intended-helper acceptance/decline, cancellation, replacement without prematurely removing accepted coverage.
- Overlap/unavailability checks on acceptance, capability-unknown warnings, privacy-safe conflict messages.
- Task outcomes, unresolved inability-to-complete, recipient refusal, history, and instruction-version acknowledgment.
- Version checks, idempotency receipts, atomic pure transitions, notification-outbox invalidation and dispatch eligibility checks.
- Medication actions cannot use generic task outcomes. Temporary coverage explicitly reports unavailable.
- Keyboard-trapped dialogs, Escape/close/focus return, labeled forms, mobile layouts, error recovery.

## Files and boundaries

- `src/contracts/coordination.ts`: **proposed W03 contract**, not a claim that the team has ratified a global schema.
- `src/server/domain/coordination/`: pure rules, access projection, time conversion and transaction entry point; no credentials or framework dependencies.
- `src/features/coordination/`: demo presentation and synthetic fixtures, scoped CSS.
- `app/calendar/`: routes; no unauthenticated mutation API has been created.
- `tests/coordination.test.cjs`: domain checks, compiled with strict TypeScript before execution.

The demo imports pure domain functions only to exercise fictional records. Production must execute mutations server-side. Do not expose raw state, grants, audit records, or caller-selected actor identity as a production API.

## Contracts to agree before production integration

1. **People/access (W01):** supply verified actor identity and current recipient/circle grants from trusted auth. A user cannot provide their own `actorId`, capabilities or grants. Map IDs to the team's UUID records. The fixtures use obvious demo IDs only.
2. **Database foundation (W00):** implement `CoordinationRepository.transaction` using database transactions/locking, consistent scope foreign keys, RLS and restricted document projections. State and outbox must commit together; unique actor/idempotency keys and occurrence identities must survive retries and concurrent workers. An in-process callback alone is not a cross-process transaction.
3. **Read/API layer:** implement `CoordinationClient`, runtime-validate requests and responses, invoke the domain service with trusted server time, and project only permitted data. Add server-authorized change notices and refetch; realtime must not be the source of truth. Recheck access at request time and clear cached UI on expiry/logout/recipient switch.
4. **Care plan (W02):** map instruction IDs/current versions. Task completion checks the current version. Task edits require explicit review of a current linked instruction and withdraw affected assignments for renewed acceptance.
5. **Medication (W05):** map `medicationOccurrenceId`; use its dedicated outcome service through `MedicationPort`. Generic task completion rejects these records. No medication scheduling logic is implemented here.
6. **Temporary coverage (W06):** wire `CoveragePort` to request/accept/grant services. The current demo action creates neither a grant nor a successful coverage request. A replacement request for an existing authorized helper is distinct from a temporary handoff.
7. **Reminders (W07):** consume transactional outbox events, use persistent unique deduplication, validate current assignment/task/grant/contact preferences immediately before dispatch, then record delivery/acknowledgment independently. `shouldDispatch` covers task/grant eligibility only; it does not implement contact consent, sending, retries, sender callbacks, or emergency escalation. No phone data or credentials are required by this branch.

Gap events target current authorized coordinators; assignment responses target the requester and coordinators; task changes target coordinators and affected helpers. W01/W07 must map these grants and identifiers to contact preferences and chosen backup/escalation policies before enabling alerts. Event payloads contain IDs, not health descriptions for SMS previews. No background dispatcher is installed.

No database migrations are included because the shared identity/recipient schema is absent. Creating a second incompatible foundation here would impede the other branches. Production integration and database/RLS tests remain blocked on W00/W01 contracts and a test Supabase project, not on a request for permission to continue this module.

## Time and recurring edits

Store instants with UTC/offset and recipient IANA timezone. Date inputs resolve in recipient-local time; daily/weekly occurrences preserve that wall time across DST. Ambiguous/nonexistent local times fail with a review error instead of choosing a hidden offset. Contemporary offsets in 15-minute increments are supported; historical timezone conversion is not a feature.

Recurrence is bounded and materialized immediately; there is no infinite background expansion. Editing one occurrence retains its series identity. Editing this-and-future unresolved occurrences preserves relative calendar spacing using the selected new local start/end; completed/refused/canceled history is not rewritten. Atomic failure leaves the original series unchanged, including on DST errors. Changing a visit time with unresolved linked care requires explicit rescheduleLinkedTasks confirmation. The transaction preserves before/after offsets, revalidates current instructions and scopes, retires old reminders and assignments, and asks caregivers to accept again. Any failure rejects the whole operation.

## Verify locally

Node.js 22+ and npm, per the root README:

```sh
npm ci
npm run test:calendar
npm run typecheck
npm run build
npm run dev
```

No new runtime dependencies or environment variables were introduced. The test runner uses installed TypeScript and Node's built-in test runner; generated output lives in ignored `.calendar-test-build/`.

Verified November 14, 2026: all 22 domain tests passed, repository typecheck passed, and optimized Next.js build passed. A headless Chromium check exercised the setup page, task creation, assignment request, demo-persona acceptance, completion/history, unrelated-persona isolation, 390px mobile layout, contained seven-day scrolling, dialog focus cycling and Escape. No page errors were observed; desktop/mobile screenshots were visually inspected. The browser check used temporary Playwright tooling outside this repository and did not add package dependencies. These are demo/UI and domain results, not production integration results. Next.js also generated the root `AGENTS.md` while running development mode.

Manual fictional workflow:

1. Open `/calendar`; confirm setup is pending and no recipient data is shown.
2. Open `/calendar/demo`; choose Add event and select appointment, follow-up, visit or care task.
3. Request Ben as primary, observe pending coverage, use Demo tools to switch to Ben, open the event and accept.
4. Record completion or inability; switch back and inspect status/history.
5. Request Sarah as a replacement; existing coverage persists until Sarah accepts.
6. Try Day/Week/Month/Year, optional recipient/coverage filters, backups, recurring edits/cancellation, and mobile/keyboard dialogs.
7. Switch to Unrelated account; no recipient records should appear.

These steps do not prove shared persistence or authentication. The required two-authenticated-session demonstration, direct server API/RLS tests, real reminder delivery and expiry invalidation in a connected client must be run after the adapters are integrated. Do not describe the synthetic demonstration as passing those checks. See `CALENDAR_REDESIGN.md` for the current visual redesign, contract additions and 35-test verification; the earlier 22-test result above records the initial implementation.

## Remaining boundaries

No external calendar sync, live guest invitations, paid help, payments, wearable integration, clinical interpretation, prescription modification, or production deployment is part of this branch. No compliance certification is asserted. Retain the original planning packet for full product context.
