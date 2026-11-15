# People & Roles integration handoff

The tested People & Roles account and family workflow is merged here alongside the existing combined application.

## What this merge preserves

- Existing integrated Today, medications, health records, calendar, shared shell, and hosted setup remain in place.
- The new People design preview is at `/people/preview`.
- The connected People account/family flow is at `/auth`, `/join`, and `/people` only when `NEXT_PUBLIC_LOCAL_AUTH=true` or server setting `HANDSIN_PEOPLE_FOUNDATION=ready`.
- Without that opt-in, `/people` uses the existing shared-schema page, now with a link to the new design preview. Existing `/login` stays unchanged outside the opt-in. With the opt-in, `/login` forwards to `/auth`.
- The merged Proxy refreshes sessions across the combined app. Account sign-out also invalidates the People verification grant when that foundation is active.

## Database boundary: review before hosted rollout

The existing hosted/shared migration is `supabase/migrations/20261114230000_medication_scanner.sql`. It uses plaintext care-circle/recipient labels and circle-level medication policies. The People local prototype has different encrypted-label, recipient-grant, and verified-device definitions.

People SQL proposals therefore live in **`supabase/people-local-migrations/`**, outside the hosted deployment migration sequence. The local runner reads only that directory. No migration was applied to the shared Supabase project during this merge.

Do not concatenate the two migration sets: the table names overlap and the security/data contracts differ. Reconcile existing data, recipient-scoped module permissions, encrypted-content boundaries, and account/device gates together before enabling the new hosted foundation. Keep the current hosted login enabled until that review is complete.

The local connected People milestone is real authentication and persistence; it does not make the existing medication/health modules end-to-end encrypted or connect calendar fixtures to the database. Those adapters remain separate work.

## Tested and documented

- People unit tests, preview browser tests and connected multi-account tests.
- Calendar's 35 domain/UI calculation tests, repository typecheck and production build.
- The combined app's People flow was browser-tested on an isolated local app server using the local authentication/database/email stack. This is not a claim that hosted deployment or shared-schema migration tests passed.

See [Connected People local setup](CONNECTED_PEOPLE_LOCAL.md) for the workflow, local backend requirements, privacy boundary and remaining work. No account credentials, local databases, test inbox contents, or private keys are committed.
