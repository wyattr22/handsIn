# Connected care workspace — local integration

The selected backend is the encrypted People foundation. `/workspace` now uses real local Auth, PostgreSQL and PostgREST, with the same family memberships, verified-device sessions and recipient/category grants as `/people/connected`. With the foundation enabled, `/` opens this workspace. Hosted projects have not been migrated or deployed.

## Connected behavior

- Home shows recipient profiles first. An organizer can add another recipient; each starts with separate access grants and encryption keys.
- Calendar and temporary coverage read the same persisted visit record. The assigned helper can accept or decline, report arrival from 30 minutes before the start until the end, and complete with an encrypted care update. Acceptance never implies arrival. Arrival is a self-report, not location verification.
- Medication reference records, health reports, meal plans, daily-care plans and everyday tasks use one authenticated repository. Scheduled records appear in Calendar. Care outcomes append history without overwriting the organizer’s instructions.
- Family/recipient names, titles, care instructions, report contents and outcome notes are encrypted in the browser with recipient/category AES-GCM keys. Recipient IDs, category, kind, assignment, timing, status and actor/timestamps remain server-readable metadata. Encryption uses record/event-specific authenticated context.
- Server permission checks run on every read and command, including idempotency replays. No service role is used by the app. RLS filters records/events by current grants. Mutation RPCs validate administrator/assigned-helper roles, state transitions, versions and ciphertext structure. Direct writes are denied.
- Device trust requires an extant Auth session. Expiry, revocation and logout prevent subsequent data requests. The browser refreshes every ten seconds and on focus; failed access clears displayed records. Previously downloaded information cannot be recalled from another person’s device.

## Running locally

1. `npm ci` using the pinned lockfile.
2. Place official Windows binaries under ignored `.local-tools`: `auth.exe`, `postgrest/postgrest.exe`, `mailpit/mailpit.exe`. This checkout has Supabase Auth v2.197.0, PostgREST v16.5 and Mailpit v1.33.1. Auth was built from its official tag with Go1.27.4; only the Unix-specific SO_REUSEPORT listener option was omitted for Windows.
3. `npm run local:services` starts loopback-only services and writes ignored `.env.local`. The runner applies `people-local-migrations` first, then `workspace-local-migrations`, recording immutable migration hashes. Do not combine these with the old hosted medication migration.
4. `npm run build` then `npm start -- -H 127.0.0.1 -p 3000`.
5. Open `http://127.0.0.1:3000`. Verification emails stay in the local inbox at `http://127.0.0.1:58025`. Use fictional information.

Runtime data, local tools, environment files and encryption vault contents are not committed. Do not reset the local database or clear browser storage to refresh the page: the latter holds the encrypted device vault.

## Verification

`npm run test:connected` creates fictional local accounts, verifies email/device sessions, accepts an email-bound invitation, and exercises actual REST/RPC/database permissions. It checks category and recipient isolation, unrelated accounts, invalid assignment, direct-write denial, early arrival, visit transitions, unchanged source instructions, append-only outcomes, optimistic conflicts, duplicate retries, expiry, revocation and logout. The script refuses a non-loopback backend. Tests leave fictional records for inspection.

The 112 domain/integration unit tests pass, alongside strict TypeScript and the production build. Real-backend checks also cover atomic capture batches, rollback, cancellation, revision history and helper schedule conflicts. Chrome verified two accounts, recipient/category isolation, reviewed medication schedules and structured health results, revised visit acceptance, arrival, completion, decrypted history, reload persistence, and encrypted device-file export/restore. These browser checks are separate from unit tests.

## Boundaries still needing work

This is a local review candidate, not a production release. Connected capture now supports browser extraction, explicit review, structured health results and seven-day medication reminders saved atomically. Text/manual capture passed browser trials; the OCR engine passed a synthetic image check. Chrome's image/PDF file picker still needs the extension's Allow access to file URLs permission before that complete upload path can be verified. Food-rule checks, detailed meal observations and task-scoped coverage handoff remain richer in the separate demo. The app does not perform clinical screening or medication administration.

The backend schema and encrypted data are shared between authenticated clients. A helper gets granted keys through an encrypted invitation. Device access now exports a password-encrypted file and restores it to the same account, merging keys without widening server permissions. Export and same-device restore passed in Chrome; a fresh-device trial remains before release. Automatic recovery and key rotation remain unimplemented. Production rollout still needs migration review, hosted email configuration, pagination, concurrent grant-change stress testing, a backup plan and deployment verification. No hosted resources were changed.

Design reference for permission checks: https://supabase.com/docs/guides/database/postgres/row-level-security

The stock CLI database advisor could not target this native Windows stack (it assumes Docker port 54322; this stack uses 55432). Direct catalog checks verified RLS on both record tables, anonymous RPC denial and absence of authenticated INSERT/UPDATE grants; these supplement the real permission tests, not a full production security review.


Responsive Chrome check: 390px viewport, no horizontal overflow. Canonical section routes redirect to their connected sections; fictional scanner return links stay inside /demo routes. Preview screenshot: .coverage-test-output/connected-home.jpg.

