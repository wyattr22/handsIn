# Visual calendar redesign

This revision responds to the user's request for a recognizable, simpler calendar instead of a task-card dashboard. It changes only the calendar feature branch; no production deployment or remote database migration is authorized by this document.

## Interface

- Month is the default. Dates are selectable; crowded cells show two entries plus a working more control. Mobile uses date/count cells and a readable selected-day schedule below.
- Day and Week are hourly grids with real event positioning, separate all-day rows and overlapping-event lanes. Day headings open that date. A simple list alternative is available.
- Year shows twelve selectable mini-months. Month headings open Month; dates open Day. Selected date survives view switches; Today and period arrows match the active view.
- Event details contain appointment, follow-up, linked care windows, instructions, caregiver roles and history. Advanced filters and synthetic-persona controls are secondary. No new design framework or dependencies were added.
- Date grids have keyboard navigation; dialogs trap focus and support Escape/close/return focus. Mobile Week scrolls inside its own container.

## Backward-compatible proposed contract additions

These extend the existing W03 proposal. They are not an implemented Supabase schema or an assertion of team-wide approval.

| Record/command | Addition | Meaning |
| --- | --- | --- |
| Assignment/requestAssignment | optional `priority` | Omitted/0 primary; 1 secondary; 2–5 additional ordered backups |
| Visit | optional `allDay`, `followUpOf` | Date-span presentation and a same-recipient earlier-appointment reference |
| Task/createTask/editTask | optional `allDay` | Preserved across recurrence/edits |
| editVisit | optional `rescheduleLinkedTasks` | Explicit coordinator acknowledgment for atomic changes to linked unresolved care windows |

An accepted backup reserves no primary responsibility, grants no access, receives no task-due reminder, and cannot complete a task as its primary caregiver. Promotion is a new priority-0 request. Existing primary coverage stays until the replacement accepts. Role requests remain versioned, attributed and idempotent. Other pending roles and their notification eligibility survive new requests.

Actual booking/coverage permission remains governed by W01/W06, not by a role label. Stale grants and prescription rules remain unchanged. W07 must dispatch outbox records only after rechecking task, assignment, grant and contact preferences.

Before shared persistence, map the optional additions to reviewed migrations with recipient/circle foreign keys, allowed-priority constraints, one effective accepted assignment per task/priority, and same-recipient follow-up references. Apply no migration from this branch without the team's review/dry-run process.

## Event editing and creation

The synthetic UI assembles a new appointment, its linked care task and requested primary/secondary caregivers in one local atomic transition sequence; any failed step leaves the original state intact. The production adapter must provide an equivalent **single server/database transaction**, not multiple unrelated client writes. Recurring task assignments apply to each generated occurrence.

Editing appointment times with unresolved linked care requires confirmation. Care windows move by the appointment's start/end deltas; current instructions and scope are checked; old active assignments are canceled and reminders invalidated. History is retained. Completed tasks are untouched. Editing a title/location alone does not reschedule accepted care.

All-day end dates are inclusive in the form and exclusive in the stored interval. Timed events use the displayed calendar timezone; all-day dates preserve their recipient-local meaning. A midnight end does not create an extra next-day event. Historical timezone offsets outside the original converter's supported contemporary range are not newly supported.

Linked care tasks are grouped under their appointment rather than duplicated as unrelated tiles. Their actual care windows remain visible in event details, including pickup time before an appointment. Follow-ups remain informational scheduling, not treatment advice.

## Integration status

The same `/calendar/demo` URL runs the redesign. `/calendar` remains the unavailable-production/setup page. Shared Supabase identity, persistence, live reminders and temporary grants are still absent on the reviewed branch baseline. No secrets, real health data, new environment variables or new runtime dependencies were introduced.

Use `npm run test:calendar`, `npm run typecheck`, and `npm run build`. Keep the existing domain tests plus date-boundary, overlap, backup-role and atomic-rescheduling tests. See `CALENDAR_DELEGATION_HANDOFF.md` for production integration responsibilities.

## Verification for this revision

- 35 domain/calendar tests passed; TypeScript check and optimized Next.js build passed; `git diff --check` passed.
- Browser-tested all four view controls, Year-to-Month navigation, Today, event creation, separate primary/secondary acceptance, follow-up creation, all-day weekly recurrence, and explicit appointment/linked-care rescheduling.
- Verified seven time columns, contained Week scrolling at 390px, a 720px compact layout, mobile tap-to-day schedule, arrow-key date navigation, dialog focus wrapping, and Escape.
- Desktop and mobile screenshots were captured and inspected in the conversation. The app was left open locally at `/calendar/demo`.
- The compact layout was checked at an equivalent half-width viewport; actual browser 200% zoom remains a manual check because the in-app zoom shortcut did not change the reported zoom. No claim of completed older-adult usability research or production integration is made.
