# Evidence, problem and decisions

## What exists today

Inspected November 14, 2026 after `git fetch --all --prune` from the canonical repository. Original local checkout was clean on `main` at `f01be79`; it was not advanced or edited.

| Surface | Evidence | Actual readiness |
| --- | --- | --- |
| `origin/main` | `8a454dedf941bd38325fa9c147c295d09b2fca8c` | Next.js App Router landing page, React, TypeScript, CSS, package lock and planning docs |
| Live site | HTTPS GET returned 200 and landing-page copy at `https://handsin-six.vercel.app` | Landing response inspected; no authenticated feature or visual browser test performed |
| Calendar branch | `d2b304186a5ed7ab69164d26e8eba81f59ddd026` | Domain rules, proposed typed contracts, in-memory demo and tests; not merged into main |
| People/roles branch | Same `8a454de` baseline | No identity/grant implementation in available branch |
| Temporary coverage branch | Same `8a454de` baseline | No existing feature implementation |
| Other advertised feature branches | Fetched refs at `8a454de` | No additional implementation at those remote tips; unpublished work unknown |
| Assets/style | `app/page.tsx`, `app/globals.css`, `app/layout.tsx` | CSS hand illustration; no approved SVG/deck asset in tree. Teal/cream/sand/coral with Fraunces/DM Sans |
| Infrastructure | package.json: Next 16.4.6, React 19.3.1; no Supabase/Twilio/AI integration | Tailwind/shadcn are planned, not installed. Node resolves; npm not on shell PATH. No build attempted for documentation-only changes |

Read all five planning documents and current project context. In AJ's branch, inspected `src/contracts/coordination.ts`, `src/server/domain/coordination/service.ts` and `docs/CALENDAR_DELEGATION_HANDOFF.md`. Its reported 22 passing tests and browser checks are AJ's handoff evidence, not tests rerun here. `/calendar/demo` is fictional, resets on reload, and does not synchronize sessions. `/calendar` reports setup pending. Temporary coverage currently throws/reports unavailable; medication execution is delegated through a port.

## Separate requirements from hypotheses

**Explicit requirements:** request replacement, accept/decline, limited temporary access, reusable maintained handoff, outcomes and unresolved work, team return information, multiple recipients; synthetic data; US first; server-side authorization; recipient dignity; no independent clinical decisions. This session stops before full implementation. The user additionally confirmed the everyday-task first slice.

**Established project decisions:** retain repository, deployment target, brand and intended stack; current planning packet supersedes older brief. Its specific schemas and release recommendations remain proposals. Current user authorization permits this preparation despite the packet's historical documentation-only notice.

**Implementation constraints:** only the calendar branch has domain implementation. Its instruction records are small, grants are preliminary, and no shared persistence or runtime host adapter exists. There is no trustworthy patient record, invite system or care-plan API to integrate today.

**Proposals in this package:** one named invitation at a time; a one-recipient bundle of complete task occurrences; coordinator approval before sharing; separate preview/preparation/execution access; template assembly without AI; reviewable return summary. Default timing values in fixtures are examples, not a universal policy.

## People and pressures to validate

| Person | Wants / pressure | Likely mistake or conflict | Design response |
| --- | --- | --- | --- |
| Regular caregiver | Relief without another hour of briefing; certainty someone accepted | Assumes a sent text equals agreement; omits home knowledge; feels obliged to stay available | Reuse source records, review only missing/changed fields, name a backup coordinator rather than silently routing everything back |
| Substitute | Know what is expected, fit/time and whom to ask; avoid embarrassment | Accepts out of politeness; follows obsolete directions; hides uncertainty | Task scope before accepting, decline without mandatory reason, visible questions/contact, neutral unable-to-complete outcome |
| Recipient | Familiar support, choice, privacy and normal routine | Family shares intimate details unnecessarily; helper treats task list as permission to insist | Record sharing preferences and authority source, disclose only relevant details, ask before care, respect refusal |
| Other family | Reliable status and next steps | Treats silence as neglect or assumes everything was done | Attribute reports, distinguish no confirmation from known cancellation, show outstanding items with follow-up owner |

Hidden knowledge is often practical: which entrance, doorbell behavior, where bags go, supply locations, preferred name/language, what the person does independently, and who answers when the usual caregiver is unavailable. Capture it once in maintained fields, then confirm changes. Do not turn a single visit into an exhaustive assessment.

## Focused research and its limits

Sources checked November 14, 2026. These inform design; none validates HandsIn, legal authority, clinical safety or demand.

| Source | Finding relevant here | Product inference |
| --- | --- | --- |
| [AHRQ TeamSTEPPS handoff](https://www.ahrq.gov/teamstepps-program/curriculum/communication/tools/handoff.html) | Handoffs call for acknowledgment, clear responsibility, current context and an opportunity for questions | Explicit accept/decline plus a clarification path; do not assume delivery means understanding. This is adaptation from professional care, not proof for family workflows |
| [Family Caregiver Alliance, Hiring In-Home Help](https://www.caregiver.org/resource/hiring-home-help/) | Duties and recipient comfort matter when bringing help into a home; household help and personal care differ | Define actual duties and boundaries before choosing a helper; known helpers reduce introduction work but still need permission |
| [Alzheimer's Association respite guide](https://www.alz.org/getmedia/134b0e2e-9d74-45ac-91f6-b8e80dd000b3/understanding-respite-care.pdf) | Respite varies by duration, setting and type of support, including friends/family | Offer a specific visit/task bundle. Dementia-specific guidance must not be generalized to every recipient |
| [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) | Deny by default and validate permission on each request | Check recipient, task, action, current grant and server time; possession of a link is insufficient |
| [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | Database row policies support access restrictions; exposed tables require protection | Use shared access service plus database enforcement; a permitted row is not automatically an appropriate full-profile response |

Supabase's [changelog](https://supabase.com/changelog.md) was checked. Recent CLI v3, Flutter and TLS changes do not require action in this documentation-only preparation. Verify SDK/CLI conventions when implementation starts; no SDK choice is cemented here. NIA and some PDF follow-up fetches were unreliable, so no detailed conclusion depends on inaccessible text. No legal or clinical task-eligibility rules are inferred from these sources.

## Consequential alternatives

| Decision | Recommendation and tradeoff | Alternative / why later |
| --- | --- | --- |
| First slice | Known helper, everyday tasks; proves handoff without medication dependencies. User confirmed | Medication-first would test a central product promise but depends on unavailable dose/instruction services |
| Finding someone | Coordinator selects one named candidate; unresolved request can exist with no candidate | Broadcast/marketplace creates recipient privacy, selection and racing-acceptance complexity; not needed to prove relief |
| Unit of coverage | Bundle of whole task occurrences for one recipient and time window | Minute-by-minute or partial-task split needs new scheduling semantics; negotiate and reissue a narrower bundle instead |
| Information | Structured template plus short sourced notes; no generative summary | AI adds review burden and omission risk before we know template usability. Reconsider only after measured reading problems; no inferred instructions |
| Access | Verified account/contact-bound invitation and time-scoped access from people/roles | Anonymous bearer link is faster but forwarding becomes authorization; reject |
| Instructions | Current projection with version acknowledgment and historic manifest | Frozen PDF is portable but goes stale and cannot be revoked; no downloadable handoff first |
| Return | Tasks recorded individually; end summary shows done, declined, unknown, unresolved | One “visit complete” checkbox conceals unmet tasks; reject |

## Highest-impact unknowns and validation

1. **Who can approve this helper and sharing?** Review with recipient/coordinator and Caleb. Need recorded preference/authority source, with conflicts routed for human resolution. App role alone is not legal authority. Unknown authority blocks issuing access, not drafting.
2. **Can maintained instructions save work?** Ask two regular caregivers to reconstruct their last handoff and mark what is missing from the proposed template. Compare repeated preparation effort after first setup.
3. **Can a substitute decide and prepare quickly?** Test with two people unfamiliar with the synthetic household. Ask them to find the address, priority task, supplies and contact without coaching. Proposed targets: understand invitation within one minute; find each essential item within 30 seconds. Targets are hypotheses.
4. **Does recipient refusal remain meaningful?** Include a willing care recipient in a walkthrough; ask what they would withhold and whether the task wording feels respectful. No real health details needed.
5. **Who handles unanswered questions and gaps?** Agree a named coordinator and backup, response-by time and no-arrival threshold per visit. Validate whether in-app-only awareness is adequate for demo; do not imply monitored alerts.
6. **Which duties need training or authorization?** Before expanding beyond household/companionship tasks, review specific categories with appropriate care professionals and the recipient. Acceptance does not validate competence.

No interviews or usability tests were conducted in this session. Stop-and-revise signals: testers interpret pending as confirmed; a helper cannot locate essentials; recipient objects to default disclosures; recurring setup takes as long as texting; or an unresolved item has no obvious owner.
