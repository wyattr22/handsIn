# HandsIn integration audit and recipient-first Home

Audit date: November 14, 2026 (America/Los_Angeles). Source snapshot: `origin/integration/cohesive-app@087a9be`. Work stays local on `codex/temporary-coverage`; pre-existing calendar/coverage changes preserved. Nothing pushed, merged, deployed, or migrated.

## What changed here

The root Home now leads with Alex and June Morgan's shared fictional profiles, an explicit selected state, a derived next-step card, and six care sections. `/demo` retains the same Home. The old marketing page is preserved at `/about`. Calendar and Coverage are functional local demos; the four remaining sections explicitly say they are not connected in this preview. No broken links or fake completion totals were added.

`DemoWorkspace` owns actor, selected recipient, clock, coverage records and native calendar records across client navigation. `demo/people.ts` owns demo IDs and initials. `home-summary.ts` reads `viewCoverage`; `calendar-connection.ts` projects those same coverage records into the calendar. Home stores no duplicate invitation, arrival, or outcome status. Invitation, accepted plan, self-reported arrival, closed access, and unresolved outcomes remain distinct.

Profiles remain the existing Morgan fixtures rather than inventing alternate IDs for Great Grandma/Uncle Gui. These examples are public fictional data, not authenticated profiles. Refresh resets the local state. This does not connect the production modules or grant real access.

## Branch and component map

| Branch / head | Implementation | Integration state / decision |
| --- | --- | --- |
| main `8a454de` | Starter and planning | Not the combined application |
| integration/cohesive-app `087a9be` | AppShell, Today, medication scanner, health, calendar, People | Combined routes; not unified persistence or recipient selection |
| codex/calendar-and-delegation `9b9324c` | `src/contracts/coordination.ts`, coordination service, CalendarDemo | Included upstream and selectively in this checkout; synthetic state; no live calendar sync |
| codex/temporary-coverage `b761927` | Coverage domain, demo, preparation docs | Published baseline; local uncommitted calendar bridge and new Home extend it; not in upstream integration |
| codex/people-and-roles `7d26aba` | ConnectedAuth, ConnectedPeople, vault, auth/family API | Merged into integration at `6f598c0`; local connected auth/persistence documented and opt-in; hosted compatibility unresolved |
| feature/medication-scanner `3d03f47` | MedicationFlowProvider, OCR/review/schedule routes | In integration; draft and schedule UI are not a canonical confirmed-occurrence API |
| codex/health-records `d072b52` | Health flow, parse-report, review/report routes | In integration; reviewed draft flow, not proof of connected longitudinal records |
| codex/meals-and-daily-care `d7a83c1` | care contracts/service, CareToday, separate DemoWorkspace, calendar projections | Not in integration; extends coordination contracts including `skipped`, medication references, category permissions; cannot replace shared calendar files blindly |
| codex/medication-support `8a454de` | Baseline | Scanner branch owns implemented work |
| codex/alerts-and-nfc `8a454de` | Baseline | No implemented notification delivery verified |
| codex/paid-help-and-costs `8a454de` | Baseline | Outside this Home integration |

This is a source audit, not a rerun of teammates' backend test suites. Claims about their isolated local testing come from their handoff documents.

## Findings, ordered by integration impact

1. **Conflicting security foundations.** `docs/PEOPLE_INTEGRATION_HANDOFF.md` explicitly distinguishes the hosted medication migration's plaintext labels/circle-wide policies from People's encrypted labels/recipient grants/verified device foundation. Both define overlapping tables. Keep `supabase/people-local-migrations` separate until a single migration and data-conversion plan is tested against existing records. Do not enable the hosted People foundation just to make navigation appear connected.
2. **Recipient selection is not shared upstream.** Today, medication and health index routes each choose `recipients[0]`. AppShell's Switch link navigates to People instead of selecting a shared recipient. Implement a host-owned selection validated against authorized recipients, with explicit IDs passed into every module. Never silently fall back to another person's records after revocation.
3. **Draft storage lacks account/recipient scoping.** MedicationFlowProvider restores `handsin-medication-draft-v1` from sessionStorage and falls back to demo recipients when no real recipients are returned. Reconcile draft ownership, session changes, recipient changes and explicit demo mode before real connected use. Missing access, no recipients, and service errors must be different states; none should silently become a demo.
4. **Misleading zero totals upstream.** Medication and health index statistics are hard-coded zeros rather than loaded counts. Replace with actual authorized data, a loading/error state, or an explicit unavailable label. This Home does not repeat those totals.
5. **Two workspace owners.** Meals has its own DemoWorkspace and newer coordination contracts; coverage has another. Consolidate at the application boundary and compose projections without replacing either feature's records. Preserve medication-owner-only mutation rules and additive task statuses.
6. **Medication occurrence adapter missing.** Meals requires confirmed exact-product occurrence IDs and versions. Scanner drafts and local schedule strings do not satisfy this. Block the adapter until medication ownership supplies those records; do not infer doses from OCR.
7. **Separate auth clients.** Integration contains `lib/supabase/*` and `src/lib/supabase/*` with different foundation paths. Resolve through one host/session boundary after schema reconciliation, not cosmetic import renaming.
8. **Runtime and CSS drift.** Original shell used small labels, beige surfaces and card shadows; local Home now uses white surfaces, readable body copy and restrained borders. Existing Calendar/Coverage retain feature CSS. Avoid a global feature rewrite until each owner reviews the shared tokens.

## Shared architecture contract

- Host resolves verified identity and active membership/grants on every request, mutation and retry. UI selection never authorizes access.
- Host supplies an authorized recipient collection and explicit current recipient ID. Retain selection only while authorized. Clear recipient-specific drafts/results on changes; namespace any approved draft cache by account, recipient and schema version.
- Shared shell owns navigation, recipient identity and avatar presentation. Feature pages consume these; they must not select the first recipient independently.
- Feature owners retain canonical records: medication owns confirmed occurrences and administration; care owns plans/outcomes; coverage owns invitation/visit handoff commands; calendar composes read models. Use existing shared task/visit IDs in a real adapter rather than demo-prefixed IDs.
- Pending invitations expose only necessary preview fields. Access expiry/revocation removes details; arrival remains explicitly self-reported. A submitted report does not imply every task was completed.
- Explicit module availability gates links. Signed out, loading, error, no recipient, denied access and ready are separate host states. The synchronous fictional Home does not pretend to test server loading/error or real onboarding.
- External calendar synchronization and notification delivery remain separate adapters; no such connection was added.

## Design references reviewed in Chrome

- [Apple](https://www.apple.com/): strong heading hierarchy, whitespace and a small number of clear actions. Applied those principles to profiles and the next-step card; did not copy promotional animation, oversized imagery or assets.
- [Google Help](https://support.google.com/): predictable labeled destinations and a focused starting point. Applied to the care sections.
- [Microsoft Support](https://support.microsoft.com/en-us/): grouped tasks and plain-language guidance. Applied to the three-step care guidance.

Keep HandsIn's Fraunces headings, DM Sans text, dark teal and restrained warm accent. Use visible focus outlines, native controls and adequate touch targets. Profiles are always visible; demo settings use a disclosure rather than a modal.

## Verification and next integration sequence

Local strict TypeScript, optimized Next build, 35 calendar tests, 14 coverage tests, 7 calendar-coverage tests and 2 new Home projection tests pass (58 unique tests). Home tests cover unrelated/missing/cross-recipient access, pending previews, acceptance versus arrival, exact expiry, receipt and unresolved report. These are synthetic domain checks, not backend authorization verification.

Chrome verification covers recipient switching and continuity across Home → Calendar → Coverage; coverage invitation/acceptance returning to Home; desktop and mobile review. See follow-up verification notes for final results.

Next: reconcile the People/hosted schema contract; supply recipient-scoped host state and draft adapters; integrate meals' additive coordination changes with existing tests; implement medication occurrence and health-record repositories; then enable connected module links. Those are remaining cross-feature integration work, not completed functionality in this change.

### Final browser verification

Verified in Chrome at 390×844 and 1280×1000: no horizontal overflow, readable profile selection and next-step card. June remained selected from Home into Calendar and Coverage. Created a fictional Alex invitation, switched to Ben, accepted, and returned Home: Home showed “Confirmed · arrival not reported.” Browser error log was empty. Desktop and mobile screenshots are under `.coverage-test-output/home-desktop.jpg` and `home-mobile.jpg`. Local preview runs at http://127.0.0.1:3013/.

Story boundary: UI → shared in-memory workspace → domain transition → Home/Calendar projection. There is deliberately no API/database boundary in this checkout's preview. Real multi-account isolation, backend persistence, external sync, keyboard-only end-to-end testing, and real empty-account onboarding were not verified in this pass. Focus styles and native keyboard-operable controls are implemented; this is not an accessibility certification.

Coordination: upstream `AGENT_COORDINATION.md` now contains the requested phrase **Rory Flynn**, attributed there to Kaleb's People & Roles agent. No reply was published during this local-only change.
