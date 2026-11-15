# HandsIn teammate / AI handoff

## Start here

Repository: https://github.com/wyattr22/handsIn

Branch: `codex/full-app-trial`. This is the complete review candidate, including the committed integration baseline `087a9be`, care/coverage additions, connected encrypted records, and scanner deployment preparation. Main must remain unchanged until review and debugging are finished. This branch imports and adapts integration files; it is not a merge commit preserving integration ancestry. Resolve future integration merges intentionally.

User's next goal: deploy an HTTPS preview with working medication/photo/PDF health scanners and shared care flows. The current user joined the Supabase organization but still cannot see its project through the connected account. The teammate should use their own authorized organization/project access; no credentials from the previous computer are needed or included.

## Fresh checkout, any development computer

Use Node.js 24 and npm, Git, and your own GitHub access. Commands work in a normal terminal (on Windows use `npm.cmd` if PowerShell blocks npm.ps1).

```sh
git clone --branch codex/full-app-trial https://github.com/wyattr22/handsIn.git
cd handsIn
npm ci
npm run typecheck
npm run test:coverage
npm run test:calendar
npm run test:workspace
npm run test:people
npm run build
npm run dev
```

Without backend configuration, `/demo` is the fictional in-memory application. Connected flows require the backend below. `npm run build`/`dev` automatically prepare scanner workers from locked packages. Do not invoke `next build` directly in a fresh checkout without first running `node scripts/prepare-scanners.mjs`.

## Shared preview backend — recommended continuation

1. Confirm the intended Supabase organization, project, and cost. Prefer a fresh dedicated preview project. Inspect tables/migrations before changing anything. Existing project names alone do not establish schema compatibility.
2. Read `CONNECTED_WORKSPACE.md` and the SQL under `supabase/people-local-migrations` and `supabase/workspace-local-migrations`. These are the chosen encrypted foundation, applied in that order, filename-sorted within each directory.
3. Run `node scripts/prepare-backend-handoff.mjs`. It creates ignored `.backend-handoff/review-only.sql` and a SHA-256 manifest. This is an inspectable transaction bundle, not a database deployment command. It deliberately excludes the incompatible `supabase/migrations/20261114230000_medication_scanner.sql`. Never run default `supabase db push` from this checkout against a shared project: that default directory contains the other schema.
4. For a fresh preview, provision the reviewed foundation through your normal migration tool and preserve migration history. For an existing database, reconcile conflicts first; do not drop teammate tables or apply the bundle blindly. Do not copy native-runner Auth bootstrap SQL: hosted Supabase supplies `auth.users`, `auth.sessions`, `auth.uid()` and `auth.jwt()`.
5. Configure email/password Auth with email confirmation enabled, minimum password length 12, six-digit email OTPs, and confirmation + magic-link templates showing `{{ .Token }}`. New-device verification uses email OTP. Configure SMTP for intended test recipients, site URL and allowed redirects for the preview. Do not disable verification to get through signup.
6. Create an ignored `.env.local` on your computer with the project's public URL/key and settings below. Configure the equivalent **Preview** variables in Vercel. No service-role key is used by the app.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
NEXT_PUBLIC_LOCAL_AUTH=false
HANDSIN_PEOPLE_FOUNDATION=ready
APP_ORIGIN=http://localhost:3000
```

Set `APP_ORIGIN` to the actual HTTPS preview origin when deployed. Only enable the foundation flag after its schema and email verification are provisioned. Public Next.js variables require rebuilding after changes.

7. Deploy this branch to a Vercel preview using `npm run build`, with your own project/team access. Inspect deployment logs; do not promote to production or merge main yet. Existing Vercel/Supabase connector authorizations belong to the person using them and are not carried by Git.
8. Create fresh fictional organizer/helper accounts. Local accounts and data from the previous computer are not part of this checkout. Each device has its own encrypted key vault; a Git clone does not restore care data or vault keys. Existing users need their invitation or encrypted device-file transfer, not a copied password or database snapshot.

## What is included

- Recipient-first white/neutral Home with Great Grandma / Uncle Gui style profile selection and clear module navigation.
- Connected People/auth/email proof/device trust/invitations and recipient/category permissions.
- One encrypted record API for medication, reports, visits, tasks, meals and care plans; fresh server authorization, version checks, transactional batches and attributed history.
- Day/week/month calendar, assigned-helper acceptance/decline, separate arrival check-in and completion update; revised visit history and overlap rejection.
- Medication image/text parsing, explicit review, seven-day reminders; health image/PDF/text extraction, editable reviewed results. Mobile `capture="environment"` photo input is included; this is photo capture, not continuous live video.
- Scanner worker/core and PDF fonts/CMaps/WASM served by the app. English OCR language data still downloads from the library's versioned CDN on first use.
- Password-encrypted device-file export/import. Import does not widen backend grants.
- Original richer fictional demo retained under `/demo`.

## Verification and remaining work

Previous local candidate: production build, TypeScript, 112 unit tests and real native-backend permission/transaction checks passed. Chrome verified two-account invitation, revised visit acceptance/arrival/completion, saved reviewed medication/report content, reload persistence, backup export/same-device restore and mobile layout. Scanner preparation subsequently passed production build and seven workspace/capture tests; later PDF asset path additions passed TypeScript.

Still required: hosted schema/Auth/RLS verification, actual phone photo and saved image/PDF end-to-end trials, fresh-device restore, and full hosted two-account checks. See `SCANNER_PREVIEW_RELEASE.md` and `TRIAL_CHECKLIST.md`. Browser file automation on the prior computer was blocked by extension file-access permission; do not claim uploaded images/PDFs passed browser testing.

The native `npm run local:services` runner is **Windows-specific**, requires ignored external binaries, and is not the portable setup path above. `npm run test:connected` targets that native loopback stack and must not be redirected to production. Teammate can run all unit tests and the frontend without that runner; shared connected testing uses the provisioned preview backend. The Docker alternative has not been implemented/tested in this handoff.

Food-rule checks, detailed meal observations and task-scoped coverage handoffs remain richer in the separate demo. Notifications, clinical screening, payments/provider booking, automatic lost-key recovery/rotation, load/security review and production operations remain unfinished. Do not replace these gaps with fake successful UI states.

## Suggested prompt for your AI

> Read AGENTS.md and docs/TEAMMATE_START_HERE.md on codex/full-app-trial. Continue the hosted scanner preview using my authorized Supabase and Vercel access. Inspect the existing project before migrations; use the encrypted People/workspace foundation, not the legacy medication schema. Preserve the profile-first white/simple UI and required review before saving extracted information. Verify photo and PDF extraction through persisted records/calendar using two accounts, then report verified results and gaps. Keep main unchanged until our review/debugging is complete. Never publish local credentials, runtime data or device vaults.
