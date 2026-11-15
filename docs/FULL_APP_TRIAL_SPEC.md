# HandsIn integrated app trial

## Baseline and release boundary

Fetched `origin/integration/cohesive-app` on November 14, 2026: `087a9be`. The committed integration contains People/auth/invitations, calendar/delegation, medication capture/review and health-report capture/review. Our existing care and temporary-coverage additions remain included. Planning documents also describe SMS, NFC, paid care and external providers; those proposals are not implemented integrations and do not become enabled services merely because their plans are committed.

Work branch: `codex/full-app-trial`. Keep `main` unchanged until the user has reviewed, trialed and debugged the candidate.

## Product and design

The first screen answers “Who are we caring for, what needs attention, and what should I do next?” Recipient cards lead; the selected person's care modules and next actions follow. Helpers always see the recipient and their own responsibility. Acceptance, arrival, care reporting and completion are separate states.

Use an Apple-inspired system of clear hierarchy, restrained color, generous spacing, consistent navigation and progressive disclosure. White surfaces, cool neutral background, system sans-serif, charcoal text, subtle separators, rounded controls and one quiet blue accent. No glass effects, oversized decoration, surprise popouts or promotional animation. Touch controls have at least 44px targets. Keyboard focus and plain-language loading, empty, error and saved states are required. Keep familiar content order on mobile.

Reference: https://developer.apple.com/design/human-interface-guidelines/layout/

## One architecture

- The encrypted People foundation is the only connected identity/access foundation. No legacy medication database is applied.
- The connected workspace uses recipient/category keys and the authenticated record API. Source instructions and appended outcomes have distinct encrypted payloads.
- All enabled screens use current recipient identity and server-checked grants. Fictional preview routes remain visibly separate; no connected action silently writes only to demo memory.
- Reuse committed label/report parsers and browser extraction libraries; add a connected review/save adapter. Extracted values are drafts and cannot become saved reviewed instructions automatically.
- Canonical URLs resolve to connected sections; navigation, recipient selection and deep links preserve context.
- Calendar is a projection of scheduled records, with the same IDs used by coverage and care actions. Shared writes refresh authorized views and survive reload.

## Trial acceptance map

| Area | Review requirement |
| --- | --- |
| Home | Multiple recipient profiles, clear selection, next visit, pending tasks, consistent module navigation |
| People | Sign-in and verification, create recipient, invite intended email, accept, inspect permissions, revoke |
| Calendar | Day/week/month navigation, scheduled records, helper and recipient, acceptance/arrival/completion, visible gaps |
| Medication | Image/manual capture, explicit field review, strength separate from directions, reviewed schedules, shared saved records |
| Health | PDF/image/text capture, review/edit results and units against source, shared report, no invented diagnosis |
| Care | Meal and daily-care instructions, assigned tasks, attributed outcome notes, preserved history |
| Coverage | Assign known helper, accept/decline, check in, read instructions, leave completion report; expiring recipient access managed by People |
| Access | Category/recipient separation, revocation/expiry, unrelated accounts denied, no anonymous writes |
| Trial readiness | Build/typecheck/tests pass, browser happy-path and reload checks, phone-width layout, written trial script and explicit limitations |

## Trial sequence

1. Create or sign in to a fictional organizer account and create Great Grandma and Uncle Gui.
2. Invite a fictional helper with recipient-specific access; confirm no access to the other person.
3. Add reviewed medication and health records through the connected capture flows, reload, and verify they remain.
4. Create a visit and a meal/daily-care task, inspect the calendar, accept as the helper, and report arrival.
5. Record what happened, complete the visit, and inspect the organizer's activity history.
6. Revoke or expire the helper's access and verify subsequent reads/writes fail.
7. Review desktop and phone layouts, collect issues, debug, then decide whether to merge to main.

Use fictional information for this local trial. External notification delivery, clinical screening, actual payments, provider booking and hosted deployment are separate unconfigured capabilities, not successful trial steps.

## Candidate delivered

The connected implementation and trial results are recorded in [TRIAL_CHECKLIST.md](TRIAL_CHECKLIST.md) and [CONNECTED_WORKSPACE.md](CONNECTED_WORKSPACE.md). All paths committed in the integration baseline are present in this checkout. People provides identity, invitations and encryption; the connected workspace adapts the committed medication/report parsers to the shared encrypted record API; Calendar, coverage and care project those same records. The original rich fictional workflows remain under `/demo` rather than silently serving as connected data.

The visual implementation uses profile-first Home, quiet white cards, a restrained blue accent, inline editors and responsive navigation. Two-account visit completion, structured capture saves and backup restore passed locally. Main remains unchanged pending user review and debugging.
