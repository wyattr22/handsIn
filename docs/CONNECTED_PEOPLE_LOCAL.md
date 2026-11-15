# Connected People and Access: local milestone

Implemented and verified locally on November 14, 2026; approved for publication to the People branch and integration branch. No hosted schema, Auth settings, or Vercel configuration was changed.

## Open and try

- Application: http://127.0.0.1:3000/auth
- Local email inbox: http://127.0.0.1:58025
- Separate fictional design preview: http://127.0.0.1:3000/people/preview

Create an account using a fictional email such as `sarah@example.test` and your own test password (at least 12 characters). Open the local inbox, copy the six-digit confirmation code, and verify. All email is captured locally; none is delivered to the address's actual owner.

Create a family and recipient. Open People & roles, invite a second fictional email with Tier 1, and copy the invitation link. In a separate browser profile/private window, create the second account, verify it using the inbox, and open the invitation link. After acceptance the helper sees only the assigned recipient and categories. Revocation takes effect on subsequent API/database requests; the open client refreshes every ten seconds and on window focus.

## Running services

This Windows computer has no Docker. The isolated test stack uses native PostgreSQL, Supabase Auth (GoTrue), PostgREST, and Mailpit. It is a real persistent local database and authentication service, not an in-memory substitute for Supabase.

The local binaries are in `../tools/local-services/` relative to this checkout. GoTrue was built from official Supabase Auth tag `v2.197.0`, commit `4eee58f296d9698a1c2c0ae14d7a0b379c7622d3`, with one Windows-only adjustment: omit the Unix `SO_REUSEPORT` listen option. Authentication logic is unchanged. The Go 1.27.4 archive checksum was verified. PostgREST 16.5 and Mailpit 1.33.1 came from their official GitHub releases. PostgreSQL is supplied by `embedded-postgres`.

Start the local backend, then the application, in separate terminals:

```powershell
node scripts/local-services.mjs
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

The backend is already running for this review. Every service binds to loopback only. Ports: gateway 54321, PostgreSQL 55432, Auth 59999, PostgREST 53000, Mailpit inbox 58025 and SMTP 51025.

Generated credentials, logs, PostgreSQL files, email database, and migration hashes are ignored under `.local-services/`. The existing hosted `.env.local` was preserved in `.local-services/hosted-env-backup`; the active `.env.local` now targets the local gateway and contains only the local public key and local-mode flag.

`node scripts/apply-local.mjs` applies pending proposal migrations from `supabase/people-local-migrations/` only to the fixed loopback PostgreSQL port. It has no remote option. Applied migration hashes are checked and changed files are rejected. No reset is required to restart. These proposals intentionally live outside the shared `supabase/migrations/` deployment sequence.

## Implemented

- Real email/password registration, hashed credentials managed by Supabase Auth, confirmation codes, sign-in/sign-out and server-managed sessions.
- Password plus emailed code on new devices; trusted devices expire after thirty days. Joining requires a recent email proof even on a trusted device. This is an app-enforced verification gate, not a claim of built-in Supabase AAL2 MFA.
- Verified-session checks in APIs and database policies; unverified password sessions cannot enter the family store.
- Family ownership and member/admin invitations, separate from per-recipient tiers.
- Cumulative tiers and per-category exceptions; issuers cannot delegate categories/expiry beyond their current grant.
- Random, single-use, email-bound invitations; only a SHA-256 lookup hash reaches the API. The secret stays in the URL fragment/browser. Invitation links are copied for manual sharing; email delivery of invitation links is not connected.
- Persistence across reload and separate browser sessions. The live workspace contains no synthetic care tasks masquerading as saved records.
- Revocation, time-based expiry and profile retention, with current grant checks instead of stale JWT role claims.
- No direct client writes to memberships/grants; constrained transactional RPCs and RLS enforce access.

## Encryption boundary

Family names and recipient labels are AES-GCM ciphertext in Postgres. Random per-family/per-recipient/category keys are created in the browser. Invitation key packages are encrypted to their random fragment secret. Tier 1 packages contain medication and task keys, not health-report/meal keys.

The device vault is AES-GCM encrypted using a PBKDF2-derived password key (310,000 SHA-256 iterations and a random salt). No account password or plaintext family key is saved in browser storage. An unlocked nonextractable CryptoKey is held in IndexedDB for the active app session; sign-out removes it. Encryption keys are pruned when a refresh confirms the corresponding family/recipient access is gone. This does not recall information already copied by a previously authorized user.

Identity and access metadata (account email/display name, membership IDs, roles, tiers, invitation email, timestamps) remains server-readable. Health documents, medication content and tasks are not stored in this first connected milestone. Do not describe this as a completed or audited end-to-end encrypted care platform. Password reset/key recovery and moving an existing vault to a new phone require a separate recovery/rekey design.

## Not connected yet

Family-password joining, password recovery, full vacation/subgroup permission replacement, responsibility/task persistence, real health modules, automatic invitation delivery, and device-key recovery are subsequent work. The approved visual preview retains its fictional interaction examples independently.

The shared hosted database has a teammate's migration `20261114230000` that is not this local foundation. Before hosted rollout, reconcile table definitions, module contracts, and migration ownership with that work. Do not apply these local proposals to the hosted database. Connected People authentication is disabled by default outside local mode; only set server variable `HANDSIN_PEOPLE_FOUNDATION=ready` after the corresponding schema and verification functions have been reviewed and provisioned. This prevents an unconfigured deployment from creating accounts into an incompatible schema.

## Verification

```powershell
node scripts/check-connected-people.mjs
npm.cmd run test:people
npm.cmd run test:people:browser
npm.cmd run typecheck
npm.cmd run build
git diff --check
```

The connected test refuses any target other than the local gateway. It creates distinct fictional accounts through the real UI, reads their captured email codes, creates and reloads encrypted records, accepts a bound invitation, rejects a different email and repeated acceptance, checks an unrelated authenticated account, performs direct REST/RLS and escalation tests, checks expiry inside a rolled-back local transaction, verifies the helper's vault lacks health keys, and revokes access with the helper's existing JWT. It also exercises logout and new-device verification.
