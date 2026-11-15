# People and roles: local review preview

November 14, 2026. User-approved preview for `codex/people-and-roles`. No database changes are included or applied.

## Open

Run `npm run dev` and open `/people/preview`.

The workspace has only Home and People & roles. The homepage shows the circle, the viewer's responsibilities, and other permitted responsibilities. The People page provides the selected roster/detail-panel layout. Calendar, Scanner, Recipes, and Contributions were removed from this preview at the user's request.

## Interactive review

- Start as Sarah (owner); select People & roles and choose a person.
- Open Access to review the cumulative tiers: 1 medication/scheduling, 2 adds meals/daily care, 3 adds health reports.
- Configure regular access or prepare a fictional email-bound invitation. Advanced configuration overrides individual categories. No email or usable invitation is sent.
- Change View as to James; accept or decline lunch on Home, then record completion. An assignment is pending until the intended helper accepts it. Selecting a responsibility in the summary scrolls to its details on Home.
- Change View as to Maya; health-report tasks are filtered out. Accept the medication check-in and record a fictional outcome.
- Change View as to Margaret; medication outcomes are labeled self-reported. No prescription/schedule is created or edited.
- Propose a subgroup as James, then approve it as Sarah or Lena. Unapproved groups do not grant access.
- End vacation access as an admin. James returns to his regular tier; Maya loses family access and retains her profile.
- Overlapping approved temporary grants replace regular access and combine using the strongest category permission. Recipient scopes remain separate.
- Switch the recipient to Robert to inspect different recipient access.

## Honest boundaries

All people and records are fictional. State lives in React memory and resets on refresh. It is not saved to browser storage or Supabase. Persona switching demonstrates UI projections; it is not authentication or production security.

Encrypted local storage, end-to-end encrypted synchronization, trusted-device verification, real invitations, and notification delivery are not connected. Other feature modules are outside this preview's scope.

Earlier authentication/API/schema drafts predate the agreed three-tier and end-to-end encryption requirements. They are preserved locally outside the checkout and are not part of this branch's preview commit. No authentication routes, backend API, or database migrations are shipped with this preview. It requires no environment variables.

## Validation

`npm run test:people` tests cumulative tiers, custom exceptions, temporary replacement/overlap, exact expiry, regular-tier restoration, pending approval, recipient isolation, task projection, and intended-helper acceptance.

With the local server running on port 3000, `npm run test:people:browser` uses a fresh headless Chrome session to exercise the UI, mobile layout, and dialog dismissal. Install Google Chrome or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chromium executable. Desktop/mobile screenshots go to ignored `.people-test-output/` by default; optionally set `PEOPLE_SCREENSHOT_DIR` to an absolute output directory. These are preview tests, not evidence of database/RLS or encrypted-sharing security.

Run `npm run typecheck`, `npm run build`, and `git diff --check` before proposing any later commit. Integrate production access and persistence only after the encryption architecture and shared contracts are reviewed.
