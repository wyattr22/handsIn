# Workflow and minimum sufficient handoff

All behavior below is proposed. No working authorization or coverage service is included.

## Primary journey

1. **Ask for coverage.** From an existing visit/task, regular caregiver chooses whole tasks and states whether they can still attend if nobody accepts. Recipient and timezone are explicit. A named coordinator owns finding coverage; the unavailable caregiver is not silently left as confirmed cover.
2. **Review and approve.** Coordinator checks recipient preferences/authority, candidate fit, time, instructions, contact and information to share. Same person may be requester and coordinator if authorized. Missing essential fields block invitation, not draft saving. No candidate yet creates an open need visible to coordinators.
3. **Invite one person.** A named, verified account/contact receives a minimal preview after sign-in: permitted preferred name, date/time/timezone, approximate area, task types/duration, essential capability requirements and response deadline. Preview scope is approved separately; no home access codes, full chart or unrelated names. If essential sensitive information is necessary to decide, request coordinator-approved disclosure before acceptance rather than surprising the helper afterward.
4. **Accept or decline.** Helper can ask questions first. Acceptance binds the exact bundle, versions and time. Server atomically commits assignment transfer, limited grant, acceptance audit and outbox; UI says secured only after success. Decline requires no explanation. There is no automatic acceptance.
5. **Prepare, then arrive.** Accepted helper reads the scoped current handoff during its preparation interval. “I'm here” is a self-report separate from acceptance and task execution, not location verification. A missing arrival record is “arrival not confirmed.”
6. **Do and report.** Show live task status and source-reviewed instructions. Record done, recipient declined, unable, or uncertain; no bulk completion. Record task results through AJ's service, and medication results only through the later medication service. Questions route to the named contact; the app does not promise a monitored response.
7. **Return the handoff.** Review what is recorded and still unresolved; add an optional concise observation; submit a visit report. Report submission never marks every task complete. Coordinator sees follow-up items and explicitly acknowledges/takes or delegates them. An acknowledgment is not resolution. Helper access expires at the approved time even if follow-up remains open.

## Responsibility and state model

Use a small coverage lifecycle plus existing assignment/task states, not a new workflow engine. Preserve historical assignments while displaying effective current coverage accurately.

| Coverage state | Allowed next states | Responsibility and meaning |
| --- | --- | --- |
| `draft` | `seeking`, `canceled` | Requester drafts; no disclosure to helper. Coordinator review needed |
| `seeking` | `confirmed`, `canceled`, `closed` | Named coordinator owns finding help. Invitation may be absent/pending/declined/expired; none implies secured coverage |
| `confirmed` | `seeking`, `closed`, `canceled` | Accepted helper responsible for named tasks during interval; coordinator retains backup/follow-up role. Arrival recorded separately |
| `closed` | terminal | Time ended or report submitted; reason recorded. Tasks may remain unresolved. A new coverage attempt references this one |
| `canceled` | terminal | Intent withdrawn; tasks are not thereby canceled. Review remaining coverage; revoke dependent access |

Invitation state is `pending → accepted | declined | expired | revoked`; replacement of a candidate revokes the old pending invitation. Grant status is derived from start/end/revocation and allowed actions, not copied from the coverage label. `arrivedAt` and `reportSubmittedAt` are facts, not proof all work happened. Coverage time may end without either.

**Proposed refinement to the planning packet:** its single `requested → accepted → active → completed/expired/revoked` chain combines access and work. Keeping these separate avoids “expired” looking like “not done” and “completed” hiding outstanding tasks. This is a proposal, not a silent change to shared architecture.

**Original responsibility rule:** if original helper explicitly remains available, retain their effective accepted assignment until atomic replacement. If they say they cannot attend, mark affected work uncovered immediately; keep the previous assignment as history, not effective cover. The coordinator owns follow-up, not an implied promise to personally provide care. AJ needs an agreed withdrawal/unavailability contract (see integration document).

An unsaved radio-button change is not a persisted withdrawal. When the requester saves their explicit inability to attend, record that fact through the agreed calendar operation immediately, even if the invitation still needs review. Confirm the effect clearly: “Your availability update was saved; these tasks need coverage.” A saved draft alone must not silently alter assignments. This requires a separate explicit withdrawal action or an atomic, clearly labeled request submission; the wireframe should be tested for that distinction.

## Edge-case decisions for first release

| Situation | Handling |
| --- | --- |
| Known replacement | Select one approved intended helper; prefill maintained handoff |
| Nobody found | Keep `seeking` with named coordinator and response-by time; no success badge. Candidate search/marketplace deferred |
| Existing family member / new friend | Both accept; existing broader grants remain independent. New friend verifies identity with people/roles before preview/acceptance |
| Partial availability | Helper chooses “I can cover part” as a request for clarification, not acceptance. Coordinator reissues a whole-task subset/time interval; remaining tasks stay uncovered. Splitting an indivisible task deferred |
| Ignored / declined / expired invite | End invitation, retain coverage need, notify coordinator in-app. Response deadline cannot exceed visit start; late rescue needs a new reviewed request |
| Canceled invite | Revoke token/preview permission; no effect on underlying task outcome |
| Two acceptance attempts | Same operation retries replay receipt; different contenders compete under a lock/version check; one wins, loser sees “This request changed.” No partial bundle grant |
| Original becomes available | Explicit coordinator review and reassignment; never silently displace accepted substitute. If accepted helper still owns it, show that clearly |
| Replacement cancels | Immediately reopen unfinished work, revoke dependent grant and notify coordinator; do not restore unavailable original by default. New invitation creates a new attempt |
| No arrival record | Configured check-in threshold raises “Arrival not confirmed”; contact helper/recipient through chosen family process. No automatic no-show accusation, emergency dispatch or clinical inference |
| Confirmed cannot attend | Record reported cancellation and reopen affected work; distinguish from silence |
| Instructions change | Affected task action pauses pending current review/acknowledgment; show changed field, source and time. Material duty/time change requires renewed acceptance; unaffected tasks can continue |
| Already done elsewhere | Show effective saved result and actor/time; reject stale duplicate outcome. Review reduced bundle before acceptance; do not accept a silently changed scope |
| Recipient declines | Record respectful declined outcome, no pressure or retry demand. Coordinator gets follow-up if needed; no automatic reassignment to override refusal |
| Helper uncertain/unable | Neutral outcome plus short reason and “Contact coordinator.” Leave work unresolved; no invented procedure or clinical advice |
| Network failure | “Not confirmed saved—check status before trying again.” Retry same operation ID; reconcile authoritative state. No care action repeated just because recording failed |
| Ends with outstanding work | Return summary names unresolved task and follow-up owner. Auto-close visit interval never auto-completes task |
| Access expires in open tab | Server rejects next read/write; client hides sensitive content at expiry and revalidates on focus/reconnect. Unsaved report not silently submitted after expiry |
| Link forwarded | Wrong verified account cannot redeem; generic unavailable screen, no recipient detail. Possession of link does not grant access |
| Helper has two recipients | Separate requests/grants/routes and independent expiry; show recipient identity on every action, clear state on switching; no merged instructions |

First release includes the failure semantics above even where UI is simple. Deferred: broadcast offers, helper matching, paid booking, open-ended recurrence, attachments/photos upload, offline care packets, AI, automated SMS/voice escalation, medication execution, clinical/personal-care task expansion and custom workflow rules.

## Handoff fields, sources and freshness

The coordinator reviews an assembled preview, not a blank form. “Required” means needed for invitation or execution as specified; unknown and not applicable remain distinct. Every sourced value carries source record/version, reviewer and reviewedAt/effectiveAt when available. Review age is shown, but no universal number of days makes instructions safe.

| Information | Required / when | Proposed owner and maintainer | Visibility / editing | Missing, stale or conflicting |
| --- | --- | --- | --- | --- |
| Recipient ID, preferred name, pronunciation | ID/name at draft; pronunciation optional | People/roles; authorized profile editor with recipient input | Minimal approved name in preview; clear identity throughout; helper read only | Missing identity blocks issue; never infer person from task title |
| Sharing preferences and authority source | Before issue | People/roles; recipient/authorized coordinator | Coordinator sees authority details; helper gets relevant preferences only | Unresolved conflict blocks issue; family relation alone insufficient |
| Time, timezone, tasks, due windows, priority, duration | Before issue | Calendar/delegation; scheduler | Preview and handoff; helper cannot reschedule | Invalid/missing scope blocks issue; changed scope needs reacceptance |
| Approximate area / exact location and arrival | Area before accept; exact address/instructions before visit | Calendar visit references maintained care-plan location | Preview area only; accepted scoped preparation sees exact location | No reliable arrival details: ask coordinator, do not guess. Security codes omitted in first slice |
| Task steps, source, limitations and relevant precautions | Before performing task; prerequisites reviewed before issue | Care-plan editor; authorized maintainer, professional source where applicable | Preview fit requirements; scoped current steps during preparation/visit; helper read only | Missing/contradictory essential step blocks affected task/invite. No AI repair; unrelated care may proceed |
| Supply locations | Required when task needs supplies | Care plan; regular helper/authorized editor | Accepted helper reads; may suggest correction | Missing essential supply location resolved before issue; observations don't overwrite source |
| Routine, language, communication/accessibility preferences | Relevant fields required; others optional | Care plan/people, ownership to agree; recipient input | Only visit-relevant fields; no global profile download | Explicitly “not recorded”; clarify if essential to safe communication |
| Contact and backup, how to ask | Primary required before issue; backup proposed required if primary unavailable | People/contact registry; coordinator selects for visit | Approved contact route during preview; phone/details only as permitted | No available contact blocks issue; no assumed response guarantee |
| Recent context and completion status | Live task status required; short relevant observation optional | Calendar outcomes and care log | Only named-task history and specifically approved contextual notes | Fetch failure means “status unavailable,” never “not done.” Contradictory notes flag review |
| Changed instructions since acceptance | Required when changed | Derived from versioned care-plan references and acknowledgment manifest | Helper sees relevant diffs; cannot dismiss essential changes as done | Current version unavailable blocks affected outcome; retain old version in authorized audit |
| Return observations/outstanding tasks | Individual result or unknown for each task; note optional | Task outcomes in calendar; observations in care log; coverage stores report references | Helper writes within grant; team reads under existing permission | No report is unknown. Corrections are attributed append-only events, not overwritten history |
| Photos/reference documents | Deferred first release | Future private storage/care-plan ownership | Explicit resource allowlist, checked fetch only | Text directions must work without photo. No whole-chart attachment as shortcut |

Maintenance effort is explicit: first setup is real work. On later visits show only gaps, changed records and review dates, with links to the source editor. Visit-only notes have an expiry; promoting them to a maintained instruction requires a deliberate source edit. The handoff's reference manifest is an audit artifact, never a competing editable care plan.

## Access timeline

- **Before sign-in:** generic invitation, no recipient data.
- **Signed-in intended invitee:** approved minimal preview until response deadline; invitation-review permission is separate from care execution permission.
- **Accepted preparation interval:** current scoped handoff, necessary address/contact, questions and acknowledgments; no task outcome mutation until execution window starts.
- **Visit window:** only named tasks and approved observation/report actions. Allowed resources/action types come from Caleb's shared grant service.
- **After report submission or expiry:** revoke temporary access; helper may see a non-sensitive receipt (“Report received”) but no handoff/history. Early finish is explicit. Existing independent family access is not revoked by closing this temporary grant.
- **Late correction:** ask coordinator through an existing approved contact; coordinator records an attributed late report with received time. Reopening sensitive helper access requires a new explicit grant, not a hidden grace period.

Preparation start and execution end are approved per request. Suggested demo: handoff opens after acceptance up to 24 hours before the visit; execution ends at visit end with reporting expected before then. These defaults need user testing. No hidden post-visit write window; UI shows the exact expiry. Time is enforced by server, with UTC instants and recipient IANA timezone.
