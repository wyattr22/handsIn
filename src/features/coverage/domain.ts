/** Fictional preview model. Not an authentication, grant or persistence implementation.
 * A production host must replace this adapter with authorized shared task/care services. */
export type Outcome = 'completed' | 'declined_by_recipient' | 'unable_to_complete' | 'uncertain';
export type CoverageState = 'draft' | 'seeking' | 'confirmed' | 'closed' | 'canceled';
export interface CoverageTask {
  id: string; title: string; category: string; instruction: string; source: string;
  instructionVersion: number; acknowledgedVersion: number; version: number;
  outcome?: Outcome; note?: string; recordedBy?: string;
}
export interface Coverage {
  id: string; recipientId: string; name: string; timezone: string; area: string;
  address: string; arrival: string; preference: string; coordinatorId: string;
  coordinatorName: string; helperId: string; helperName: string; contact: string;
  start: string; end: string; prepareFrom: string; respondBy: string;
  version: number; state: CoverageState; originalAvailable: boolean;
  invitation: 'none' | 'pending' | 'accepted' | 'declined' | 'revoked';
  taskIds: string[]; tasks: CoverageTask[]; reviewed: boolean;
  arrivedAt?: string; report?: string; reportAt?: string; followup?: string;
  history: { actor: string; at: string; text: string }[];
}
export interface DemoStore {
  coverages: Coverage[];
  receipts: { actor: string; key: string; fingerprint: string }[];
}
export type Command =
  | { type: 'invite'; taskIds: string[]; originalAvailable: boolean; reviewed: boolean }
  | { type: 'respond'; response: 'accepted' | 'declined' }
  | { type: 'arrive' }
  | { type: 'acknowledge'; taskId: string; instructionVersion: number }
  | { type: 'outcome'; taskId: string; taskVersion: number; instructionVersion: number; outcome: Outcome; note: string }
  | { type: 'report'; note: string }
  | { type: 'cancel' }
  | { type: 'withdraw' }
  | { type: 'followup'; note: string }
  | { type: 'changeInstruction'; taskId: string; text: string };
export interface Envelope { coverageId: string; expectedVersion: number; operationId: string; command: Command }
/** Future implementation derives identity/time from the host, never client request JSON. */
export interface CoverageClient {
  getView(coverageId: string): Promise<CoverageView>;
  mutate(input: Envelope): Promise<CoverageView>;
}
export type CoverageView =
  | { kind: 'unavailable' }
  | { kind: 'receipt'; message: string }
  | { kind: 'preview'; id: string; version: number; name: string; helperName: string; coordinatorName: string; area: string; start: string; end: string; respondBy: string; timezone: string; taskTitles: string[] }
  | { kind: 'handoff' | 'coordinator'; coverage: Coverage };
const instant = (value: string) => Date.parse(value);
function requireThat(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
export function hasAccess(c: Coverage, actor: string, now: string) {
  return actor === c.helperId && c.state === 'confirmed' && instant(now) >= instant(c.prepareFrom) && instant(now) < instant(c.end);
}
export function viewCoverage(store: DemoStore, id: string, actor: string, now: string): CoverageView {
  const c = store.coverages.find(item => item.id === id);
  if (!c) return { kind: 'unavailable' };
  if (actor === c.coordinatorId) return { kind: 'coordinator', coverage: structuredClone(c) };
  if (actor !== c.helperId) return { kind: 'unavailable' };
  if (hasAccess(c, actor, now)) {
    const handoff = structuredClone(c);
    handoff.tasks = handoff.tasks.filter(t => handoff.taskIds.includes(t.id));
    handoff.history = []; // Coordinator activity is not part of the minimum handoff.
    return { kind: 'handoff', coverage: handoff };
  }
  if (c.state === 'closed' && c.reportAt) return { kind: 'receipt', message: 'Your visit report was received. This temporary handoff is now closed.' };
  if (c.state === 'seeking' && c.invitation === 'pending' && instant(now) < instant(c.respondBy)) {
    return { kind: 'preview', id: c.id, version: c.version, name: c.name, helperName: c.helperName,
      coordinatorName: c.coordinatorName, area: c.area, start: c.start, end: c.end,
      respondBy: c.respondBy, timezone: c.timezone, taskTitles: c.tasks.filter(t => c.taskIds.includes(t.id)).map(t => t.title) };
  }
  return { kind: 'unavailable' };
}
export function coverageLabel(c: Coverage, now: string): string {
  if (c.state === 'closed') return 'Report received';
  if (c.state === 'canceled') return 'Request canceled';
  if (c.state === 'draft') return 'Ready to arrange';
  if (instant(now) >= instant(c.end)) return 'Visit ended · review outstanding work';
  if (c.state === 'confirmed') return c.arrivedAt ? 'Arrival reported' : 'Confirmed · arrival not reported';
  if (c.invitation === 'declined') return 'Declined · coverage needed';
  if (c.invitation === 'pending' && instant(now) >= instant(c.respondBy)) return 'Reply deadline passed';
  return c.invitation === 'pending' ? 'Waiting for a reply' : 'Coverage needed';
}
export function applyCoverage(previous: DemoStore, input: Envelope, actor: string, now: string): DemoStore {
  requireThat(Number.isFinite(instant(now)), 'Invalid clock.');
  const s = structuredClone(previous);
  const c = s.coverages.find(item => item.id === input.coverageId);
  requireThat(c && (actor === c.coordinatorId || actor === c.helperId), 'This handoff is not available to this account.');
  requireThat(typeof input.operationId === 'string' && input.operationId.length > 0 && input.operationId.length <= 128, 'Invalid operation ID.');
  const fingerprint = JSON.stringify(input);
  const receipt = s.receipts.find(r => r.actor === actor && r.key === input.operationId);
  if (receipt) {
    requireThat(receipt.fingerprint === fingerprint, 'This retry differs from the original request.');
    return s; // Only an authorized projection is returned by the host, never a cached handoff.
  }
  requireThat(c.version === input.expectedVersion, 'This request changed. Refresh and review it before trying again.');
  const cmd = input.command;
  const coordinator = () => requireThat(actor === c.coordinatorId, 'Only the coordinator can make this change.');
  const active = () => requireThat(hasAccess(c, actor, now), 'Your temporary access is unavailable or has ended.');
  const execution = () => { active(); requireThat(instant(now) >= instant(c.start), 'You can prepare now. Record visit outcomes when the visit starts.'); };
  const note = (value: string, required = false) => requireThat(typeof value === 'string' && value.length <= 1000 && (!required || value.trim().length > 0), 'Add a short note (up to 1,000 characters).');
  const task = (id: string) => {
    const t = c.tasks.find(t => t.id === id && c.taskIds.includes(id));
    requireThat(t, 'This task is not included in the handoff.'); return t;
  };
  let event = '';
  switch (cmd.type) {
    case 'invite': {
      coordinator(); requireThat(c.state === 'draft' || c.state === 'seeking', 'Close the existing arrangement before requesting a replacement.');
      requireThat(instant(now) < instant(c.respondBy), 'The reply deadline has passed. Start a newly reviewed request.');
      requireThat(cmd.reviewed === true && typeof cmd.originalAvailable === 'boolean', 'Review the handoff and sharing approval first.');
      requireThat(Array.isArray(cmd.taskIds) && cmd.taskIds.length > 0 && new Set(cmd.taskIds).size === cmd.taskIds.length, 'Choose at least one distinct task.');
      requireThat(cmd.taskIds.every(id => c.tasks.some(t => t.id === id && !t.outcome && ['household', 'companionship'].includes(t.category) && t.instruction.trim())), 'Only current everyday tasks can be included.');
      c.taskIds = [...cmd.taskIds]; c.originalAvailable = cmd.originalAvailable; c.reviewed = true;
      c.state = 'seeking'; c.invitation = 'pending'; event = `Invitation prepared for ${c.helperName}. ${c.originalAvailable ? 'Original helper remains available.' : 'Selected tasks need coverage.'}`; break;
    }
    case 'respond':
      requireThat(actor === c.helperId && c.state === 'seeking' && c.invitation === 'pending' && instant(now) < instant(c.respondBy), 'This invitation is no longer available.');
      requireThat(cmd.response === 'accepted' || cmd.response === 'declined', 'Choose accept or decline.');
      requireThat(c.taskIds.every(id => !task(id).outcome), 'The selected tasks changed. Ask the coordinator to review.');
      c.invitation = cmd.response;
      if (cmd.response === 'accepted') { c.state = 'confirmed'; c.tasks.forEach(t => { if (c.taskIds.includes(t.id)) t.acknowledgedVersion = 0; }); }
      event = `${c.helperName} ${cmd.response} the request.`; break;
    case 'arrive': execution(); requireThat(!c.arrivedAt, 'Arrival is already recorded.'); c.arrivedAt = now; event = 'Arrival self-reported.'; break;
    case 'acknowledge': {
      active(); const t = task(cmd.taskId); requireThat(t.instructionVersion === cmd.instructionVersion, 'Instructions changed again. Review the latest version.');
      t.acknowledgedVersion = t.instructionVersion; event = `Reviewed current instructions: ${t.title}.`; break;
    }
    case 'outcome': {
      execution(); const t = task(cmd.taskId);
      requireThat(['household', 'companionship'].includes(t.category), 'Use the owning care or medication module for this task.');
      requireThat(t.version === cmd.taskVersion && !t.outcome, 'An outcome already exists or this task changed. Refresh before acting.');
      requireThat(t.instructionVersion === cmd.instructionVersion && t.acknowledgedVersion === t.instructionVersion, 'Review the changed instructions before recording an outcome.');
      requireThat(['completed', 'declined_by_recipient', 'unable_to_complete', 'uncertain'].includes(cmd.outcome), 'Choose a valid outcome.');
      note(cmd.note, cmd.outcome === 'unable_to_complete' || cmd.outcome === 'uncertain');
      t.outcome = cmd.outcome; t.note = cmd.note.trim(); t.recordedBy = actor; t.version++;
      event = `${t.title}: ${cmd.outcome.replaceAll('_', ' ')}.`; break;
    }
    case 'report': execution(); note(cmd.note); c.report = cmd.note.trim(); c.reportAt = now; c.state = 'closed'; event = 'Visit report submitted; temporary handoff closed.'; break;
    case 'cancel': coordinator(); requireThat(!['closed', 'canceled'].includes(c.state), 'This request is already closed.'); c.state = 'canceled'; c.invitation = 'revoked'; event = 'Coverage canceled; unfinished tasks still need review.'; break;
    case 'withdraw':
      active(); c.state = 'seeking'; c.invitation = 'revoked'; c.originalAvailable = false; c.arrivedAt = undefined;
      event = 'Helper withdrew. Unfinished tasks need coverage.'; break;
    case 'followup': coordinator(); requireThat(c.state === 'closed' || instant(now) >= instant(c.end), 'Review follow-up after the report or visit ends.'); note(cmd.note, true); c.followup = cmd.note.trim(); event = 'Coordinator acknowledged follow-up; task outcomes unchanged.'; break;
    case 'changeInstruction': {
      coordinator(); requireThat(!['closed', 'canceled'].includes(c.state), 'This handoff is closed.'); note(cmd.text, true);
      const t = task(cmd.taskId); requireThat(!t.outcome, 'Historical instructions cannot be rewritten.');
      t.instruction = cmd.text.trim(); t.instructionVersion++; t.version++; event = `Source instruction updated: ${t.title}.`; break;
    }
    default: throw new Error('Unsupported operation.');
  }
  c.version++; c.history.push({ actor, at: now, text: event });
  s.receipts.push({ actor, key: input.operationId, fingerprint });
  return s;
}

export function createDemoStore(): DemoStore {
  const make = (id: string, name: string, timezone: string, start: string, end: string): Coverage => ({
    id, recipientId: `demo-${id}`, name, timezone, area: 'Fictional neighborhood', address: `Demo home ${name === 'Nora' ? 'A' : 'B'} · not a real address`,
    arrival: 'Use the front entrance and knock. Wait for an answer before entering.', preference: `Ask ${name} before putting things away. A visit can be declined.`,
    coordinatorId: 'maya', coordinatorName: 'Maya', helperId: 'casey', helperName: 'Casey', contact: 'Maya is the demo contact; Jordan is the backup. No real contact is connected.',
    start, end, prepareFrom: '2026-11-14T22:00:00Z', respondBy: '2026-11-15T21:00:00Z',
    version: 1, state: 'draft', originalAvailable: false, invitation: 'none', taskIds: [`${id}-bag`, `${id}-visit`], reviewed: false, history: [],
    tasks: [
      { id: `${id}-bag`, title: 'Bring the grocery bag inside', category: 'household', instruction: `The bag is on the front bench. Ask ${name} where it should go.`, source: 'Household note · reviewed by Maya, Nov 14', instructionVersion: 1, acknowledgedVersion: 0, version: 1 },
      { id: `${id}-visit`, title: 'Spend some time together', category: 'companionship', instruction: `Ask ${name} if they would like company. Respect their choice if they decline.`, source: 'Recipient preference · reviewed Nov 14', instructionVersion: 1, acknowledgedVersion: 0, version: 1 }
    ]
  });
  return { coverages: [make('nora', 'Nora', 'America/Los_Angeles', '2026-11-15T22:00:00Z', '2026-11-15T23:00:00Z'), make('eli', 'Eli', 'America/New_York', '2026-11-16T18:00:00Z', '2026-11-16T19:00:00Z')], receipts: [] };
}
