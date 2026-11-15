# EROS: one clear care handoff

Branch: `codex/EROS-demo`. Entry point: `/demo/eros`.

This is an automated, interactive walkthrough of the existing **fictional in-memory calendar**, not a connected backend demonstration. The same CalendarDemo, CalendarDialog, CaregiverPanel, AppShell, domain validation, recipient colors and approved 1A logo are used. No feature screenshots are animated and no substitute product interface is drawn.

## Baseline and event boundary

Fetched origin on November 15, 2026. `origin/main` and `origin/codex/full-app-trial` both resolved to `e44fd96` (approved logo, 11:00 AM Pacific); the EROS branch starts there. Existing pitch and full-app-trial checkouts were preserved. No merge to main, changes to Wyatt’s demo, remote migrations or production promotion are part of this work.

Read `PROJECT_CONTEXT.md`, root agent instructions, integration/trial/backend handoffs, current calendar/care/coverage code, and the pitch packet at `origin/codex/pitch-collaboration` (`855c1ab`). The original participant briefing pages 7–9 and 14–15 were visually inspected, along with workshop page 15; workshop text and attendee notes were read. Searching newer repository documentation found the approved logo update but no newer locked demo story.

The [official participant guide](https://cpvc-ai-hackathon-guide.vercel.app/#sunday) was opened in Chrome at approximately 11:22 AM Pacific, November 15. It still states **noon submission freeze, four minutes including live product demonstration, three minutes Q&A**, and that Discord overrides the guide. A targeted search of connected Gmail for that day's organizer/hackathon updates returned no messages. Discord updates were not accessed. No extension of the deadline is verified. Exact submitted deployment/SHA and submission status remain unknown.

This separate branch is a candidate, not an assertion of judging eligibility. Only demonstrate it as the submitted product if the team verifies it matches the noon submission and organizer rules. Do not replace the submitted deployment after freeze. A recording remains fallback, never a substitute for the required live product demonstration.

## Why this story

**Problem:** Sarah has asked Ben to spend time with June. A request alone does not establish who will actually help, and a completed visit without context leaves the next helper guessing.

**Visible change:** June's existing “An afternoon together” task goes from Waiting for response → Ben’s Accepted responsibility → Care resolved, with one attributed outcome in Activity history.

**Why it matters:** the family has an explicit commitment, the loved one's preferences, and a record of what happened in one place. The brief compresses the passage of an afternoon into a demonstration; it does not suggest a visit lasts 25 seconds.

The short calendar flow is more legible than creating a temporary coverage invitation, switching personas and simulating expiry. Medication capture requires source review and more explanation than fits here. Neither is needed to prove this handoff. The existing June task and instructions already support a complete story without fabricated AI or clinical advice.

| Rubric | What this slice supports | Presenter must supply separately |
| --- | --- | --- |
| Execution & design, 25 | Actual shared UI, real local domain transitions, clear status and attributed history | Submitted deployment and connected behavior if claimed |
| Real problem/user, 25 | A specific family coordination problem | Genuine interviews, use and evidence; synthetic records are not validation |
| Path to customers, 20 | A concrete reason a family might switch from messages | Payer, tested or explicitly hypothetical price, named acquisition route |
| Pitch & demo, 15 | One coherent, readable 25-second story with a clear outcome | Opening, business argument and honest Q&A within four minutes |
| Creative AI, 15 | No AI claim in this flow | Any actual demonstrated AI contribution, accurately named; coding tools are separate |

## Timed storyboard and optional narration

Playback has a 25-second active-time target. Preparation occurs before Play. Each mutation is issued once and its rendered state is checked; a readiness failure stops with recovery instructions. Browser scheduling may add a small amount to actual duration; the completed timer reports the measured active time. Pauses are excluded.

| Time | App action / visible result | Optional narration |
| --- | --- | --- |
| 0–3s | June selected; Ben's view; highlight pending task | “Sarah needs someone to spend the afternoon with June.” |
| 3–7s | Open the real task, pending primary request visible | “Ben opens the request and sees what needs doing.” |
| 7–10s | Accept; Ben is the accepted primary caregiver | “He accepts, so responsibility is clear.” |
| 10–14s | Highlight June's current care instructions | “Her preferences stay with the task.” |
| 14–19s | Open outcome form; enter a fictional garden-visit update | “After the visit, he records what happened.” |
| 19–22s | Save through existing domain action; Care resolved | “The task is resolved.” |
| 22–25s | Expand actual history with Ben's note | “Who helped, and what happened, in one clear record.” |

Narration is optional; there is no audio track. The header identifies June and Ben throughout, including when the task dialog scrolls. The footer labels the local-only boundary throughout.

## Runbook

1. In this checkout, install pinned dependencies with `npm ci`, then `npm run build` and `npm start -- -H 127.0.0.1 -p 3026`. Open `http://127.0.0.1:3026/demo/eros`. Use a production build for capture so development controls are absent. No `.env.local` or backend setup is required for this route.
2. Wait for **Play · 25 sec**. Images are fetched/decoded and fonts awaited with an eight-second preparation bound. The fresh nested provider resets only this walkthrough; it does not clear browser storage or touch the ordinary app's workspace.
3. Click **Play**. Leave the tab visible. The page follows the actual calendar controls and highlights the next relevant area. No audio is required.
4. **Pause / Resume** preserves the active clock. Escape pauses during playback; Tab and Enter operate native controls. Hiding the tab pauses automatically.
5. **Restart** immediately stops the old run and returns to fresh preparation, even halfway through. Press Play for the new run.
6. **Take over** stops automation and preserves the current fictional task. Interacting with the app also relinquishes automation. Manually use Accept, Record outcome, Note and Save outcome as appropriate. Restart is required to resume an automated sequence after takeover.
7. **Exit** returns to `/demo`. Navigating away unmounts the player, cancels animation frames and preparation, and discards its private workspace. Reload also resets it.
8. For a failed readiness check, use Restart once, or take over. After roughly 15 seconds of trouble, switch to fallback and continue the pitch.

Recovery line: **“The live walkthrough isn't responding. These screenshots show our fictional local care-handoff preview: Ben accepts June's task and records what happened.”** Only call any capture “our submitted build” if that provenance has actually been established.

Recommended projector viewport: 1440×900 or larger, browser zoom 100%. Phone-width layout is supported, though the room presentation should use desktop. Keep the browser focused and avoid opening other tabs during playback. CSS respects `prefers-reduced-motion`; scroll positioning is instant rather than animated in both modes.

## Architecture and boundaries

`ErosDemo` mounts a nested `CoverageWorkspaceProvider` keyed by restart generation. It uses existing fixtures and a fixed fictional clock, November 15 at 3:45 PM Pacific, within June's care window. No authentication, emails, invitations, payments, database writes or notification delivery occur. The domain's outbox entries remain in memory and have no delivery adapter in this route.

The optional typed `CalendarWalkthrough` ref exposes screen state and the same action handlers used by the UI. It is supplied only by `/demo/eros`, never installed globally. The small `Timeline` controller uses monotonic elapsed time, one command per step, render-readiness predicates, a two-second action timeout and a 30-second interruption limit. It does not discover buttons by visible text or repeatedly click until something appears. Data attributes are used only to position a visual highlight and open the existing history disclosure.

The ordinary calendar retains its original modal focus trap. The opt-in walkthrough dialog is nonmodal so the persistent playback toolbar remains keyboard-accessible. Normal app data, services and navigation destinations are unchanged. Outcome forms clear previous success messages and notes when opened.

This preview does **not** prove authentication, persistence on reload, multiple users/devices, synchronization, alerts, task-access security on a server, clinical outcomes, or customer adoption. No model call is shown. Existing OCR/rule-based capture is a different workflow and must not be called generative AI. No compliance claim is made.

## Verification and fallback

- Strict TypeScript and optimized Next.js production build passed.
- Existing calendar/care/coverage-calendar suite: 80 passed.
- `node scripts/test-eros-demo.cjs`: 5 passed, covering readiness, duration, pause boundaries, exactly-once actions, stop/restart, failure recovery, and actual June acceptance/outcome rules.
- Initial desktop browser run measured 26.0 seconds and showed exactly one acceptance and one outcome attributed to Ben.
- Production UI review at 1440×900 and 390×844: pending → accepted → completed history, persistent recipient label, readable controls, and no horizontal overflow on phone width.
- Final local production rehearsal: **25.5 seconds**, completed with one acceptance and one outcome. Browser warning/error log was empty.
- Pause held the exact displayed progress value (`17229.9ms`) across an extended pause. Enter resumed/started; Escape paused. Mid-run Restart restored Waiting for response and removed the prior acceptance. Multiple fresh runs did not accumulate outcomes.
- Manual takeover edited and saved an outcome through the actual form. Exit returned to the ordinary demo with its original Alex selection, confirming provider isolation.
- Reduced-motion rules were present in the loaded browser CSS (no animation, transition or smooth scrolling). The OS preference was false; it was not changed/emulated. Automatic hidden-tab pause is implemented and source-reviewed; the browser automation surface did not produce a reliable hidden-tab condition for live verification.
- The branch's hosted preview is not verified: Vercel deployment lookup returned **403**, because the connected account lacks access to scope `wyattr22` (`team_RNL6dmJxcDWAb0atJKyWQ3O2`). This is an access limitation, not evidence of a failed application build. No production deployment was replaced.

Screenshot fallbacks live in `docs/demo/eros/`. They are captures of the local production build using fictional data, not customer evidence or proof of a submitted deployment.

- [Accepted responsibility and current instructions](eros/desktop-accepted.jpg)
- [Resolved task with attributed outcome](eros/desktop-outcome.jpg)
- [Phone-width completed outcome](eros/mobile-outcome.jpg)

The desktop captures are 1440×900; the mobile capture is 390×844. Use them in that order as static fallback evidence, explicitly labeled as screenshots of this local preview.

No video has been produced. The available browser-control surface exposes screenshots but no video-recording capability. Precise manual capture procedure:

1. Open the production route at the desktop viewport above; Restart and wait for Play. Close development tools and unrelated overlays.
2. In your screen recorder, select only the browser content region, excluding tabs, desktop and notifications. Disable microphone/system audio. Prefer MP4/H.264 if offered; otherwise retain and report the actual format.
3. Start recording, press Play, and stop immediately when the completion state appears. Trim only setup/end dead time, preserving the full sequence and its boundary labels; target 25–27 seconds, never over 30.
4. Play the exported file from beginning to end. Check the recipient, acceptance, instructions, note, resolved status and history are legible; verify the file's actual duration. Label it **Recorded fallback — fictional in-memory preview**.
5. Store the final checked video outside Git or as an appropriate release asset. Do not commit intermediate recordings. A local capture is not evidence that the hosted/submitted build works.
