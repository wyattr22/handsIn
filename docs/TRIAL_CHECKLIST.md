# HandsIn review and trial

Open http://127.0.0.1:3000/workspace on this computer. The app and backend are local and running; use fictional information. The current Chrome session is signed in to a fictional organizer with Great Grandma and Uncle Gui. Main has not been changed.

1. Review Home: profiles first, selected person clear, six care destinations below. Switch between people and confirm their records stay separate.
2. Open Medications and Health reports. Review the saved fictional records; try adding another through Capture, Review, Save. Explicit medication times create seven days of reminders.
3. Open Calendar in day, week and month views. Inspect Ben's completed trial visit and expand Activity history to see the revised instructions, acceptance, arrival and completion note.
4. In Temporary coverage, plan a future visit. In Daily care, add a task or meal plan and report its outcome. Reload and confirm persistence.
5. In Care circle, review recipient-specific roles. For a new helper trial, use a fictional email and the local verification inbox at http://127.0.0.1:58025. Keep the invitation link for that helper's account.
6. Review phone-width layout and keyboard navigation. Record issues as: page, recipient, role, action, expected result, actual result.
7. After we debug the review findings, decide whether to merge the candidate into main.

## Verified in this candidate

Production build, strict TypeScript and 112 unit tests passed. The real local backend passed grant isolation, expiry/revocation, live-session checks, direct-write denial, version conflicts, idempotent retry, atomic save/cancel, revision history and overlapping-visit rejection checks. Chrome passed a two-account invitation and visit flow, reviewed medication/report saves, reload, device-file export and same-device restore. Home and month calendar had no horizontal overflow at a 390px viewport. No browser console errors were observed in the final check.

## Remaining trial and release boundaries

- Image/PDF selection requires enabling Allow access to file URLs for the Chrome extension; full browser upload remains unverified. Text/manual capture works, and synthetic image OCR was checked separately.
- Device-file transfer needs a fresh-device test. Automatic lost-key recovery and key rotation are not implemented.
- Detailed food-rule checks, meal observations and task-scoped handoff remain in the separate fictional demo; connected care currently uses reviewed instructions, assignments and attributed outcome notes.
- No hosted deployment, external notifications, clinical screening, payments or provider booking is configured. Local loopback services are not reachable from another physical device.
- This is a review candidate. Production migration, security/load review and operational backups remain release work.
