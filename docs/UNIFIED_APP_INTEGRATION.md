# Unified local application integration

Historical demo-integration notes follow. For the current connected review candidate, see [FULL_APP_TRIAL_SPEC.md](FULL_APP_TRIAL_SPEC.md), [CONNECTED_WORKSPACE.md](CONNECTED_WORKSPACE.md) and [TRIAL_CHECKLIST.md](TRIAL_CHECKLIST.md). Connected capture, calendar recurrence and encrypted device-file transfer have since been added; the earlier verification list below describes the earlier demo milestone only.

This update supersedes the disconnected-module status in INTEGRATION_AUDIT.md. All six Home destinations now open working local sections. No production database changes or publication occurred.

## Shared data flow

- `CoverageWorkspaceProvider` owns a single care/coordination workspace, coverage handoffs, recipient selection, actor, clock, saved medication records, saved health reports and recipient/persona-specific drafts.
- Calendar reads that coordination state plus a read-only coverage projection and canonical medication-time projection. Meals writes to the same state. Recording a meal updates Calendar and removes the completed task from Home's open list.
- Medication review uses the shared recipients. Saving validates reviewed directions and explicit 24-hour times, then atomically produces the care guidance and seven-day calendar occurrences. As-needed records create no fixed reminders. New food instructions stay `needs_review`/`unknown`; no OCR-derived regimen or clinical food rule is invented. The list shows imported fictional medication fixtures and newly reviewed records together.
- Health reports save into the shared recipient-specific list after each result is reviewed. The report uses the current shared identity, not the scanner branch's old Dad/Mom constants. Care observations come from the existing care-domain projection.
- Care circle derives helpers and assignments from the same coordination records. Assignment management links to Calendar; temporary coverage links to its existing handoff. It does not invent a new role model or pretend an invitation was sent.
- Drafts are keyed by actor and recipient and stay in the root provider during navigation. Unscoped browser-storage restoration and silent demo fallback were removed from the scanner providers. Reload intentionally resets the fictional workspace.
- Medication/health editing and saving require the matching category and manage permission in the demo domain. A limited or unrelated persona cannot write these records. These checks are demo behavior, not server authentication.

## Integration provenance

Imported missing medication/health/People code from `origin/integration/cohesive-app@087a9be`. Preserved existing Home, AppShell extensions and coverage/calendar bridge. Imported care feature and additive coordination domain from `origin/codex/meals-and-daily-care@d7a83c1`; retained our calendar UI and composed its behavior. No blanket merge or teammate branch change.

Both migration proposals remain separate. Connected People is reachable at `/people/connected`; without backend configuration it explains setup and returns to the shared circle. `/auth`, `/join` and the original API implementations are retained. The connected auth redirect points to `/people/connected`, not the fictional `/people` workspace. Missing environment configuration no longer crashes the setup/login entry points.

Runtime dependencies and lockfile are updated and pinned to installed versions. No new UI framework was added.

## Verification

- 35 coordination tests, 38 care tests, 14 coverage tests, 7 coverage-calendar tests, 2 Home tests, 4 new medication/workspace integration tests and 9 imported People preview tests: 109 unique passing tests.
- Strict TypeScript and optimized production build.
- Chrome: reviewed a synthetic medication, entered 13:00 explicitly, saved it, saw its exact schedule in Calendar and its unconfirmed food guidance in Meals.
- Chrome: recorded a fictional breakfast and verified it disappeared from Home's open task list.
- Chrome: reviewed six synthetic lab results, saved the report under Alex, switched to June and verified June's report count remained zero.
- Chrome: unrelated persona was denied Health and Daily care; shared recipient identity appeared in Care circle.
- Mobile daily-care view tested at 390px without horizontal overflow.
- OCR upload/network downloads, clinical screening, live email delivery and cross-device synchronization were not verified. Synthetic sample/manual paths were used for browser testing.

## Connected backend update

The user selected the encrypted People foundation. An isolated local backend is now running, with an authenticated encrypted record repository and recipient-first `/workspace`. See [CONNECTED_WORKSPACE.md](CONNECTED_WORKSPACE.md) for the actual connected feature scope, local setup, tests and remaining parity gaps. The demo architecture above still describes the fictional in-memory workflows; it must not be confused with connected production behavior. Conflicting hosted medication migrations have not been applied.

Reference used for the session boundary review: https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs
