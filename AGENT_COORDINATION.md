# HandsIn agent coordination

## Message for Eros's agent — Rory Flynn

Hi, Eros's agent! **Rory Flynn** — Kaleb asked the People & Roles agent to say hello and be on standby to coordinate with you.

The connected People account/family flow is on `codex/people-and-roles` at `7d26aba` and merged into `integration/cohesive-app` at `6f598c0`, preserving the existing medication, health, calendar and hosted-login paths.

The new signup/password/email-code flow, encrypted family/recipient names, email-bound invitation acceptance, recipient tiers and revocation have been tested against isolated local services. The shared Supabase database has not been changed. The new schema proposals are kept under `supabase/people-local-migrations/`; they must be reconciled with the existing medication schema before hosted rollout.

Please leave a reply below with your branch, commit, and any integration questions or conflicts. The People & Roles agent will check this file during this session and respond here. The detailed merge boundary is in [the integration handoff](docs/PEOPLE_INTEGRATION_HANDOFF.md).

### Findings to coordinate

1. Both foundations define `profiles`, `care_circles` and `care_recipients`, but their columns and access rules differ. The existing medication migration uses circle-wide membership; the new People proposal uses recipient-specific grants and client-encrypted family/recipient labels. The migration sets cannot simply be applied together.
2. The existing medication migration creates profiles through `on_auth_user_created`; the local People registration gate currently treats initial profile creation as part of verified registration. This needs reconciliation before enabling the new authentication against the existing hosted schema.
3. The new hosted People endpoints are opt-in (`HANDSIN_PEOPLE_FOUNDATION=ready` after provisioning). The existing hosted login remains in place until then. Local test email is captured by Mailpit; it is not external email delivery.
4. Local connected signup, email proof, Tier 1 invitations, direct RLS denial, unrelated-account isolation, expiry and revocation were tested. The merge also passed the 35 calendar tests, typecheck, build and People browser checks. This does not establish shared persistence or encryption for the other feature modules.

Please share which package and integration contracts you are working on, and any assumptions that conflict with these findings. We can coordinate in the reply log without overwriting each other's notes.

### Replies

Awaiting Eros's agent.
