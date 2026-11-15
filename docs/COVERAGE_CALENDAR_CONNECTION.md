# Coverage, calendar and shared demo shell

## Current result

November 14, 2026: temporary coverage is connected to the calendar **within one fictional browser session**. Open `/demo` for the shared Today screen, `/coverage/demo` for the handoff, or `/calendar/demo` for the calendar. Navigate using the app links so the shared React provider remains mounted. Reloading or opening another browser session resets the demo; no cross-device/backend synchronization is claimed.

The calendar shows the helper, recipient, acceptance state and arrival-report time. The intended helper can accept/decline coverage or press **I'm here with Alex** directly inside the calendar event. This runs the same coverage command as the handoff. Arrival is self-reported, does not verify ongoing presence and never marks tasks done. Expiry, cancellation, withdrawal and report submission have distinct labels.

## Integration branch analysis and adaptation

Inspected `origin/integration/cohesive-app` at `00414f5fa676667df9ddd37e6cf3f08f27c13297`, including its homepage, `components/app/AppShell.tsx`, `app/app-shell.css`, `lib/care/recipients.ts`, calendar routes, people page, dependencies and calendar fixtures.

- The integration shell supplies a wordmark, initials avatars, recipient bar, Today cards and bottom navigation. It has no photographic avatar package in the inspected tree. Those shell files are reused here with optional navigation, selected-recipient callback and wide-calendar props. Defaults remain compatible with the integration branch's existing consumers.
- The calendar's established fictional identities are Alex and June Morgan, Sarah/Ben/Maya Morgan, guest and unrelated accounts. They are now centralized in `src/features/coordination/demo/people.ts` and consumed by both coverage and calendar fixtures. Coverage's older Nora/Casey examples are retired from runtime, not mapped onto real users.
- `/demo` follows the integration homepage's visual structure and exposes only routes actually available in this feature checkout. The existing root landing page and production route conventions are preserved. It is a local demonstration homepage, not a replacement for the integration branch's authenticated `/` page.
- The integration recipient adapter reads signed-in Supabase circle memberships and recipient records. It is **not** a temporary-helper permission resolver. This feature does not import its credentials, proxy, database schema, scanner or unrelated dependencies. Live identity, encryption and grants still require deliberate host integration.

The calendar source was imported selectively from `origin/codex/calendar-and-delegation` at `9b9324c`, retaining native calendar editing, primary/backup behavior and its test suite. No branch merge, push, database migration or deployment was performed for this iteration. No changes were made on another teammate's branch.

## One source per demo action

`DemoWorkspace.tsx` holds the coverage store, native calendar store, viewer, selected recipient and controlled demo clock across Next.js client navigation. `calendar-connection.ts` creates a **read-only projection** of coverage visits/tasks for the calendar; it is recomputed, never saved as another mutable set of coverage tasks.

Coverage visit IDs use `coverage-visit:<coverageId>` and task IDs use `coverage-task:<taskId>`. They cannot be edited through native calendar commands. The dedicated attendance panel delegates acceptance and arrival to `applyCoverage`; its handoff link opens the same selected record. Native appointment/task records continue through AJ's existing domain service, without replacing primary/backup records or assigning new permissions.

The projection only materializes records allowed by `viewCoverage`: an intended pending helper gets the minimal invitation projection; home details open after acceptance; unrelated accounts get no coverage event. Coordinator views retain the report/history after helper expiry. Existing native family access can still expose separately authorized native calendar items—temporary coverage does not revoke those independent records. All fixture data is shipped to the browser, so these projections are UX/domain demonstrations, **not production security**.

## Review walkthrough

1. Open `/demo` as Sarah; confirm Alex Morgan and avatar AM. Open Coverage.
2. Review the handoff, check fictional sharing approval and request Ben.
3. Switch View as to Ben; use Calendar navigation. Open Alex's care visit.
4. Accept coverage. The calendar says **Ben with Alex · confirmed, arrival not reported**.
5. Close the dialog; open Demo tools and **Start selected coverage visit**. Reopen the visit and select **I'm here with Alex**.
6. The event, day schedule and desktop calendar tile show **Ben with Alex · arrival reported [time]**. Open the handoff: arrival is already recorded. Today shows the same status.
7. Switch recipient to June: her date/event and handoff stay separate. Switch to the unrelated account: no coverage record is exposed.
8. Record task outcomes/report in Coverage, or test expiry/withdrawal. Return to Calendar to inspect the updated status. Report submission is not completion of every task.

## Verification

- `npm run test:calendar`: existing 35 calendar/domain tests plus 7 new connection tests.
- `npm run test:coverage`: existing 14 coverage tests plus the same 7 connection tests (56 unique tests across the suites).
- Strict TypeScript, optimized Next.js build and whitespace checks.
- Headless Chrome: Today → Coverage request → Calendar acceptance/check-in → Handoff → Today, coordinator view and recipient switching; no page errors. 390px layout checked for horizontal page overflow. Screenshots in ignored `.coverage-test-output/` were inspected.

The initial browser script used the wrong accessible name for the existing Close dialog button; correcting the test selector allowed the walkthrough to pass. No product behavior was bypassed.

## Next integration boundary

When this is integrated into the cohesive app, mount one shared demo provider rather than two independent copies. Reuse its `AppShell` with the optional extensions here, and add a coverage entry to the team's final navigation. The production homepage must continue resolving authenticated recipients; do not substitute demo IDs.

For real shared use, replace the read-only synthetic mapping with canonical visit/task IDs and host-authorized coverage/arrival services. Persist arrival actor, recipient, visit, reported/received time and audit history; enforce intended helper, current assignment/grant and visit window on the server. Connect client refetch/realtime across authenticated sessions. Adopt the agreed issuer/category/temporary-grant and encryption rules before handling real data. No API/database/realtime or encrypted-sharing tests have been claimed by this session.
