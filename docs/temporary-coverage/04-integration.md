# Proposed contracts and build preparation

These are reviewable interface sketches, not adopted shared contracts or executable scaffolding. No copy of AJ's implementation is vendored and no independent authorization system is created.

## Ownership and references

| Coverage owns | References owned elsewhere |
| --- | --- |
| Coverage intent, selected task IDs and expected versions, original assignment references, request/approval history, coordinator reference | AJ: task occurrences, assignments, visits, timing, outcomes and gaps |
| Invitation lifecycle reference and coverage response; handoff manifest/acknowledgments; arrival self-report; report reference list; follow-up acknowledgment | Caleb: verified identity, recipient membership/preferences/authority, candidate identity binding, grant issuance/revocation, contact disclosure |
| Coverage audit events and outbox event IDs | Care plan: versioned instructions, routines, precautions, supply locations; care log: observations |
| No authoritative duplicate task results, prescriptions or profiles | Medication: current instructions, occurrence IDs and dedicated outcome service; reminders: delivery and escalation |

Invitation tokens and grants should be managed by people/roles, with coverage linking their opaque IDs. Which module stores the invitation row is a contract decision; token generation, redemption and identity binding must have one owner. Shared circle/recipient IDs are mandatory on every reference; validate that all bundle tasks belong to one recipient/circle.

Proposed later paths fit existing App Router structure: `app/coverage/[id]/page.tsx`, `app/coverage/invitations/[id]/page.tsx`, `src/features/coverage/`, `src/server/domain/coverage/`, `src/contracts/coverage.ts`. Agree route names with the team; do not change root navigation/global styles here. A future `/coverage/demo` must state fictional, in-memory and not authentication. Production routes fail closed until real adapters exist.

## Minimum operations to agree

Every mutation includes a stable operation ID and expected version; the server derives actor, circle permissions and time. Runtime validation is mandatory even if TypeScript compiles. Fields below describe payload intent, not a caller-authorized grant.

```ts
type TaskRef = { taskId: string; expectedVersion: number };
type CoverageDraftInput = {
  recipientId: string;
  visitId?: string;
  tasks: TaskRef[];
  originalAssignmentIds: string[];
  originalCanStillAttend: boolean;
  coordinatorId: string;
  intendedHelperRef?: string; // opaque identity/contact ref from people module
  respondBy: string;          // UTC instant, no later than visit start
  prepareFrom: string;
  executeFrom: string;
  accessUntil: string;
  timezone: string;           // recipient IANA name
};
type MutationEnvelope<T> = {
  expectedVersion: number;
  operationId: string;
  payload: T;
};
```

| Operation | Request → response | Essential rule |
| --- | --- | --- |
| `createCoverageDraft` | Draft input → coverage ID/version, gaps | Authorize requester for each task; validate bounds and whole-task scope |
| `approveAndInvite` | Coverage version, approved source manifest, candidate identity ref → invite ID/state | Recheck issuer delegation authority, recipient preference/authority record, freshness and approved preview fields; only one pending invite |
| `getInvitationPreview` | Invite ID → minimal approved preview + current versions | Intended verified account/contact only; token is not sufficient |
| `respondCoverage` | Invite ID/version, accept/decline, reviewed manifest version → confirmed/grant reference or declined | Acceptance locks and validates coverage, tasks, original assignments, invitation and authority; no generic perform permission required beforehand |
| `getHandoff` | Coverage ID → current allowed fields/tasks/versions, serverNow, accessUntil | Shared access service checks current grant/action/resource; never return full raw profile |
| `acknowledgeHandoffChange` | Coverage/task ID and current instruction version → acknowledgment | Recheck source version; acknowledgment does not confer capability or mutate instructions |
| `reportArrival` | Coverage version, optional observedAt → recorded event | Self-report, not proof of presence; trusted receivedAt separate |
| `recordTaskResult` | Existing task command + instruction version + operation ID → saved result ID/version | Route through AJ; medication routes only through medication module. Need an agreed uncertain-report path |
| `submitCoverageReport` | Coverage version, observation draft, current result references → report ID + unresolved list | Recompute unresolved state server-side; save report and close dependent access transactionally |
| `cancelOrWithdrawCoverage` | Coverage version, reason → state and affected gaps | Coordinator or intended accepted helper within authorized scope; revoke dependent invite/grant and reopen unfinished work |
| `acknowledgeReturn` | Report/version, follow-up owner/disposition → audit event | Team permission required; acknowledgment alone doesn't mark tasks resolved |

Validation: reject empty/duplicate task lists, cross-recipient references, invalid intervals, unknown timezone, expired response deadlines, tasks outside execution window, changed/canceled tasks, disallowed categories, unreviewed required sources, unknown candidate/issuer authority and unbounded free text. Proposed cap: 20 task occurrences per request and 1,000-character observation; tune in usability tests. IDs will use the team's UUID convention; fixture IDs are deliberately obvious demo strings.

Errors: `UNAUTHENTICATED`, `FORBIDDEN`, `EXPIRED_GRANT`, `INVITATION_UNAVAILABLE`, `VALIDATION_FAILED`, `VERSION_CONFLICT`, `ALREADY_RECORDED`, `INSTRUCTIONS_CHANGED`, `DEPENDENCY_UNAVAILABLE`. Generic unavailable responses for unauthorized IDs avoid existence leakage; authorized helpers can receive useful expiry/conflict detail. Do not log token contents or health text in routine errors.

## Concrete integration review with AJ

At `d2b3041`, `CoveragePort.request(taskId): Promise<void>` is an appropriate entry hook. Bind it to open/create a draft for that task; do not report successful invitation just because navigation succeeded. Extending it to visit/task bundles is a proposal.

| Current behavior | Required agreement for temporary coverage |
| --- | --- |
| `respondAssignment` requires `perform` permission before the helper accepts | New helper has preview/invite-response permission only. Provide one server orchestration that validates invite and atomically grants scoped access plus assignment transfer; do not grant full execution rights merely to pass this precondition |
| `coverage()` counts accepted assignment records | Add authoritative withdrawal/unavailability handling so “original cannot attend” exposes a gap immediately. An old accepted row cannot be the only basis for effective cover |
| `cancelAssignment` requires management permission | Accepted temporary helper needs a narrowly scoped withdraw operation, not broad `manage` permission |
| Commands operate one task at a time | Bundle acceptance needs an atomic host operation across all selected tasks; repeated client calls allow partial assignment/grant outcomes |
| Task edit cancels accepted/requested assignments | Respect this conservative behavior first; reconfirm affected tasks and update/revoke grants. Do not just update a UI acknowledgment while calendar still says canceled |
| `TaskStatus` lacks `uncertain`; refused tasks are closed | Keep uncertain observations in care log with unresolved task semantics until contract agreed. Refusal can close execution while coverage follow-up still requires review |
| Outcome checks instruction/task version | Retain checks; accepted manifest must bind exact current source versions. Add acknowledgment proof only with agreed service support |
| `projectView` returns task-linked instructions and audit | Do not reuse its full shape as temporary handoff. Create a minimal projection with approved current versions and only relevant history; avoid leaking old notes or broad assignments |
| Grant has actor/recipient/circle, permissions, task IDs, interval | Need distinct preparation/read vs execution/write intervals, resource/field scope and stable grant ID; map through Caleb, not a second feature grant table |
| No arrival/report entities, no shared persistence | Coverage can own these records; backend must make boundaries transactional. No in-memory transaction proves concurrency across devices |

These are compatibility questions, not requested edits to AJ's branch. Caleb's available branch contains no implementation to bind against yet. Care-plan, medication and reminder contracts are likewise absent at fetched tips. Do not infer unpublished work is absent.

## Atomic acceptance and concurrency

Prefer one database transaction in the shared backend rather than distributed service calls for this small product. Lock coverage/invitation and affected task/assignment records in deterministic order. Within the transaction:

1. Authenticate and validate fresh invite binding, server-time deadline, approval/issuer authority and recipient scope.
2. Resolve operation receipt; same actor/key/payload replays result; same key with different payload fails. A replay after revoked access must not re-expose sensitive result fields.
3. Check selected task/instruction/assignment versions, current availability and authorized capability prerequisites. No implicit partial acceptance.
4. Create/update accepted assignments, retire only replaced assignments, issue the shared limited grant, consume invite and store reviewed manifest.
5. Append audit, operation receipt and outbox events in the same transaction. Publish after commit.

If shared grant issuance and assignment persistence cannot be made atomic, fail closed and keep request “confirming/unavailable”; do not show secured or issue usable access during a partial commit. Agree backend architecture before adding a saga/queue workaround. Persistence must enforce one effective assignee per task and unique actor/operation receipts. Optimistic task versions alone are insufficient if separate processes update related records without locking.

For task results, reconcile the authoritative outcome on conflict. Recording an outcome is not permission to repeat the physical care action. Corrections append a reasoned event with observedAt and receivedAt, keeping original attribution. No “last write wins” for care history.

## Server and client access boundaries

Use Caleb's verified actor context and current stored grants; user-editable metadata and stale JWT role claims are not revocation authority. Check recipient, task, permitted fields/resources, action, interval and revocation for every sensitive read/write, document fetch and subscription. Require authorized issuer scope at grant creation; issuer authority changes must invalidate dependent grants according to the agreed people policy.

Use Supabase RLS on exposed tables and private storage, with server-side projection for fields. Do not expose broad recipient rows to make a handoff convenient. Service credentials never enter client bundles. Views/privileged functions require explicit review because default privilege behavior can bypass row policies. This is an implementation checklist, not a claim policies exist or have been tested. See [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and [OWASP authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

No public/signed document URLs first release. Future reference photos use an authorized same-origin fetch on every access; do not hand out a URL valid beyond revocation. Sensitive responses use private/no-store caching and no static generation/shared CDN cache. No localStorage, service-worker/offline health cache or download feature. Client state clears on logout, recipient change, expiry and revocation notice; reauthorize on tab focus/reconnect before showing sensitive content or enabling actions. Realtime notices carry IDs/invalidation only and are themselves authorized. Server access checks work even if a notice is missed.

Displayed information, screenshots and a disconnected open page cannot be recalled with certainty. Local expiry timers reduce exposure but do not prove revocation on an offline/frozen client. Minimize disclosure before it leaves the server and make no stronger promise. Unsaved sensitive drafts clear when access ends; late reporting uses coordinator workflow rather than an unauthorized background retry.

## Events, time and notification behavior

Proposed events: `coverage.requested`, `invitation.responded`, `coverage.confirmed`, `coverage.withdrawn`, `handoff.changed`, `arrival.unconfirmed`, `coverage.reported`, `coverage.followup_needed`, `grant.revoked`. IDs and recipient scope only in notification payloads; fetch details after authorization. Outbox dedupe includes event/target/channel; dispatcher rechecks current state, grant and preferences. Delivery, read, acceptance and completion remain separate.

First demo uses visible in-app state; no simulated SMS success. A coordinator dashboard shows unaccepted and unresolved items even if notifications fail. Deadline/expiry is derived on read/mutation so a failed worker cannot extend authority. Persistent scheduler later handles deadline and no-arrival alerts with configurable thresholds and backup contacts. The UI does not promise emergency monitoring.

Store UTC instants plus recipient IANA timezone. Use server time for access; show recipient-local date and zone on every invitation and confirmation. Reject ambiguous/nonexistent local schedule input for explicit resolution using the shared calendar time rules. A day or 24 hours is not assumed equivalent across DST. Do not invent a new timezone library for this preparation.

## Build sequence after the checkpoint

1. Agree the four contracts in README. Add shared runtime schemas and a small fictional adapter with controllable clock/errors, no credentials or server endpoints. Use fixtures below as scenarios, not alternate production tables.
2. Implement request review, minimal preview, accept/decline and coordinator pending/confirmed screens. Include unavailable-original and competing acceptance cases before polishing.
3. Implement current handoff, per-task result delegation, changed-instruction handling and return summary. Scope CSS; preserve brand; no new AI/dependency requirement.
4. Integrate Caleb identity/grants, AJ atomic assignment/result operations and maintained care-plan sources into server domain routes. Replace adapter through the same client boundary; reject startup/configuration that accidentally serves synthetic data as live data.
5. Add persistence, outbox and access enforcement through coordinated migrations in the existing project only after separate authorization. Verify two authenticated browser sessions and direct API/database/storage denial paths before claiming a connected feature.
6. Test mobile usability with fictional data, fix high-impact confusion, then request review of the concrete implementation. Medication remains a later adapter integration with its own acceptance criteria.

## Acceptance and adversarial scenarios for implementation

| Check | Expected observable result |
| --- | --- |
| Pending invitation, original unavailable | Calendar and coverage agree tasks are uncovered; named coordinator shown |
| Pending replacement, original available | Original stays confirmed until replacement commits |
| Accept + simulated grant/storage failure | No assignment transfer, no usable grant, no success toast/outbox event |
| Two concurrent accepts / accept racing cancel | Exactly one valid result; loser cannot retrieve handoff |
| New friend with only preview permission | Can accept intended invite without broad perform/manage rights; cannot execute before window |
| Forwarded token / another recipient ID / unrelated task | Denied on server and direct data paths without existence disclosure |
| Existing family member finishes temporary visit | Temporary grant closes; unrelated standing permissions unchanged |
| Time expires at exact boundary; wrong device clock | Server denies at `now >= accessUntil`; client clears; document route denies |
| Revocation with open tab and lost websocket | Next fetch/write denied; focus/refetch clears; no claim to retract already viewed information |
| Instructions change between read and save | Stale operation rejected; current source review required; unrelated tasks unaffected |
| Task already completed / duplicate retry | No duplicate effective outcome; same operation ID returns authoritative saved result |
| Recipient refusal / helper unable / unsure | Respectful result; no inferred completion; explicit follow-up or unresolved state |
| Network timeout after server commit | Retry/reconcile returns saved result once; no repeated physical care instruction |
| Finish with blank task results | Report lists “no outcome recorded,” not “not done”; coordinator owns follow-up |
| Partial availability | No accidental acceptance; revised subset leaves other tasks uncovered |
| Two recipients, same helper | Independent scope and expiry; no previous-recipient instructions in UI or response |
| Medication category/occurrence passed to generic result | Rejected/routed to dedicated module; never generic completion |
| DST gap/overlap and changed visit time | Explicit resolution/reacceptance; no silent timing change |
| Keyboard, screen reader, zoom and mobile | Named controls, announced state, visible focus and usable single-column flow |

Preparation verification covers document references and fixture consistency only. These are future implementation tests, not passed test claims. No live-service access, security test, family validation or production build has been performed in this session.
