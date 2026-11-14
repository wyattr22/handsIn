import type { Assignment, CoordinationCommand, CoordinationState, CoordinationView, Grant, MutationContext, Permission, Task, Conflict, CoordinationRepository } from '../../../contracts/coordination';
import { addLocalDays, CoordinationError, localToInstant, overlaps, parts, validateInterval } from './time';

const closed = new Set(['completed', 'declined_by_recipient', 'canceled']);
const fail = (code: string, message: string): never => { throw new CoordinationError(code, message); };
function text(value: unknown, label: string, max = 2000): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail('VALIDATION_FAILED', `${label} is required (maximum ${max} characters).`);
}
function validGrant(g: Grant, actor: string, now: string) {
  return g.actorId === actor && !g.revokedAt && (!g.startsAt || Date.parse(g.startsAt) <= Date.parse(now)) && (!g.expiresAt || Date.parse(g.expiresAt) > Date.parse(now));
}
export function authorize(s: CoordinationState, actor: string, recipientId: string, permission: Permission, now: string, taskId?: string) {
  const recipient = s.recipients.find(r => r.id === recipientId);
  if (!actor) fail('UNAUTHENTICATED', 'Sign in to continue.');
  if (!recipient || !s.grants.some(g => validGrant(g, actor, now) && g.recipientId === recipientId && g.circleId === recipient.circleId && g.permissions.includes(permission) && (!g.taskIds || (!!taskId && g.taskIds.includes(taskId))))) {
    fail('FORBIDDEN', 'Access is unavailable or has expired.');
  }
  return recipient!;
}
function taskFor(s: CoordinationState, id: string) { return s.tasks.find(t => t.id === id) || fail('FORBIDDEN', 'Task unavailable.'); }
function current(t: { version: number }, expected: number) { if (!Number.isInteger(expected) || t.version !== expected) fail('VERSION_CONFLICT', 'This item changed. Refresh and review it before trying again.'); }
function checkInstruction(s: CoordinationState, t: Task) {
  if (!t.instructionId) return;
  const instruction = s.instructions.find(i => i.id === t.instructionId && i.recipientId === t.recipientId && i.circleId === t.circleId && i.current);
  if (!instruction || instruction.version !== t.instructionVersion) fail('VERSION_CONFLICT', 'Care instructions changed. Have the coordinator review and update this task first.');
}
function invalidate(s: CoordinationState, taskId: string) { s.outbox.filter(e => e.taskId === taskId && e.status === 'pending').forEach(e => { e.status = 'invalidated'; }); }
function event(s: CoordinationState, t: Task, ctx: MutationContext, kind: CoordinationState['outbox'][number]['kind'], targetId: string, dueAt = ctx.now) {
  s.outbox.push({ id: ctx.newId(), taskId: t.id, kind, targetId, dueAt, status: 'pending', taskVersion: t.version });
}
function coordinators(s: CoordinationState, t: Task, now: string) {
  return [...new Set(s.grants.filter(g => g.recipientId === t.recipientId && g.circleId === t.circleId && validGrant(g, g.actorId, now) && g.permissions.includes('manage') && (!g.taskIds || g.taskIds.includes(t.id))).map(g => g.actorId))];
}
function reminder(s: CoordinationState, t: Task, ctx: MutationContext) {
  if (closed.has(t.status)) return;
  const accepted = s.assignments.find(a => a.taskId === t.id && a.status === 'accepted');
  if (accepted) event(s, t, ctx, 'task_due', accepted.helperId, t.start);
  else for (const coordinator of coordinators(s, t, ctx.now)) event(s, t, ctx, 'coverage_gap', coordinator);
}
export function assignmentConflicts(s: CoordinationState, actorId: string, task: Task, helperId: string, now: string): Conflict[] {
  const recipient = authorize(s, actorId, task.recipientId, 'read', now, task.id);
  if (task.circleId !== recipient.circleId) fail('FORBIDDEN', 'Task scope mismatch.');
  const helper = s.helpers.find(h => h.id === helperId);
  if (!helper) return [{ kind: 'capability_unknown', message: 'Helper information unavailable.' }];
  const conflicts: Conflict[] = [];
  if (!helper.categories.includes(task.category)) conflicts.push({ kind: 'capability_unknown', message: 'Willingness/training for this task is not recorded. Review before assigning.' });
  if (helper.unavailable.some(w => overlaps(w, task))) conflicts.push({ kind: 'unavailable', message: 'Unavailable during this time.' });
  for (const a of s.assignments.filter(a => a.helperId === helperId && a.status === 'accepted' && a.taskId !== task.id)) {
    const other = taskFor(s, a.taskId);
    if (closed.has(other.status) || !overlaps(other, task)) continue;
    let detail = 'Unavailable: another accepted commitment overlaps.';
    try { authorize(s, actorId, other.recipientId, 'read', now, other.id); detail = `Overlaps with ${other.title}.`; } catch { /* no private recipient details */ }
    conflicts.push({ kind: 'overlap', message: detail });
  }
  return conflicts;
}
/** Pure atomic transition. Production repository commits returned state and outbox together. */
export function applyCommand(original: CoordinationState, raw: unknown, ctx: MutationContext): { state: CoordinationState; resultId: string } {
  if (!ctx.actorId) fail('UNAUTHENTICATED', 'Sign in to continue.');
  if (!Number.isFinite(Date.parse(ctx.now))) fail('VALIDATION_FAILED', 'Invalid server time.');
  text(ctx.idempotencyKey, 'Idempotency key', 200);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('VALIDATION_FAILED', 'Invalid command.');
  const c = raw as CoordinationCommand;
  const allowed = ['createTask', 'createVisit', 'editVisit', 'cancelVisit', 'requestAssignment', 'respondAssignment', 'cancelAssignment', 'outcome', 'editTask', 'cancelTask'];
  if (!allowed.includes(c.type)) fail('VALIDATION_FAILED', 'Unknown command.');
  const s = structuredClone(original);
  let recipientId: string;
  let task: Task | undefined;
  let assignment: Assignment | undefined;
  if (c.type === 'createTask' || c.type === 'createVisit' || c.type === 'editVisit') {
    if (!c.input || typeof c.input !== 'object') fail('VALIDATION_FAILED', 'Missing fields.');
    recipientId = c.input.recipientId;
  } else if (c.type === 'cancelVisit') {
    recipientId = s.visits.find(v => v.id === c.id)?.recipientId || fail('FORBIDDEN', 'Visit unavailable.');
  } else {
    if (c.type === 'respondAssignment' || c.type === 'cancelAssignment') {
      assignment = s.assignments.find(a => a.id === c.id) || fail('FORBIDDEN', 'Assignment unavailable.');
      task = taskFor(s, assignment.taskId);
    } else task = taskFor(s, c.taskId);
    recipientId = task.recipientId;
  }
  const permission = c.type === 'respondAssignment' || c.type === 'outcome' ? 'perform' : 'manage';
  const recipient = authorize(s, ctx.actorId, recipientId, permission, ctx.now, task?.id);
  if (task && task.circleId !== recipient.circleId) fail('FORBIDDEN', 'Task scope mismatch.');
  const fingerprint = JSON.stringify(c);
  const receipt = s.receipts.find(r => r.actorId === ctx.actorId && r.key === ctx.idempotencyKey);
  if (receipt) {
    if (receipt.fingerprint !== fingerprint) fail('VALIDATION_FAILED', 'Idempotency key already used for a different request.');
    return { state: s, resultId: receipt.resultId };
  }
  let resultId = task?.id || '';
  switch (c.type) {
    case 'createTask': {
      const input = c.input;
      text(input.title, 'Task title', 160); text(input.category, 'Task category', 80);
      validateInterval(input.start, input.end, input.timezone);
      if (input.timezone !== recipient.timezone) fail('VALIDATION_FAILED', 'Use the recipient timezone for care tasks.');
      const visit = input.visitId && s.visits.find(v => v.id === input.visitId && v.recipientId === recipientId && v.circleId === recipient.circleId && !v.canceled);
      if (input.visitId && !visit) fail('VALIDATION_FAILED', 'Linked visit unavailable for this recipient.');
      const instruction = input.instructionId && s.instructions.find(i => i.id === input.instructionId && i.current && i.recipientId === recipientId && i.circleId === recipient.circleId);
      if (input.instructionId && !instruction) fail('VALIDATION_FAILED', 'Current instructions unavailable for this recipient.');
      const count = input.recurrence?.count ?? 1;
      if (!Number.isInteger(count) || count < 1 || count > 30 || (input.recurrence && !['daily', 'weekly'].includes(input.recurrence.frequency))) fail('VALIDATION_FAILED', 'Choose daily/weekly recurrence, up to 30 occurrences.');
      const seriesId = input.recurrence ? ctx.newId() : undefined;
      for (let i = 0; i < count; i++) {
        const days = i * (input.recurrence?.frequency === 'weekly' ? 7 : 1);
        const start = days ? addLocalDays(input.start, days, recipient.timezone) : input.start;
        const end = days ? addLocalDays(input.end, days, recipient.timezone) : input.end;
        validateInterval(start, end, recipient.timezone);
        const t: Task = { id: ctx.newId(), circleId: recipient.circleId, recipientId, title: input.title.trim(), category: input.category, start, end, timezone: recipient.timezone, visitId: input.visitId, instructionId: input.instructionId, instructionVersion: instruction ? instruction.version : undefined, seriesId, status: 'open', version: 1 };
        s.tasks.push(t); reminder(s, t, ctx); resultId ||= t.id;
      }
      break;
    }
    case 'createVisit': case 'editVisit': {
      const input = c.input;
      text(input.title, 'Visit title', 160);
      if (!['appointment', 'visit'].includes(input.kind)) fail('VALIDATION_FAILED', 'Choose appointment or visit.');
      for (const value of [input.location, input.provider, input.notes]) if (typeof value !== 'string' || value.length > 2000) fail('VALIDATION_FAILED', 'Invalid visit details.');
      validateInterval(input.start, input.end, input.timezone);
      if (input.timezone !== recipient.timezone) fail('VALIDATION_FAILED', 'Use the recipient timezone.');
      if (c.type === 'createVisit') {
        resultId = ctx.newId(); s.visits.push({ ...input, id: resultId, circleId: recipient.circleId, version: 1, canceled: false });
      } else {
        const visit = s.visits.find(v => v.id === c.id && v.recipientId === recipientId && !v.canceled) || fail('FORBIDDEN', 'Visit unavailable.');
        current(visit, c.expectedVersion);
        // Linked tasks have their own time windows; never silently reschedule accepted care.
        if (s.tasks.some(t => t.visitId === visit.id && !closed.has(t.status)) && (input.start !== visit.start || input.end !== visit.end)) fail('VALIDATION_FAILED', 'Reschedule linked tasks explicitly before changing this visit time.');
        Object.assign(visit, input, { version: visit.version + 1 }); resultId = visit.id;
      }
      break;
    }
    case 'cancelVisit': {
      const visit = s.visits.find(v => v.id === c.id)!; current(visit, c.expectedVersion);
      if (visit.circleId !== recipient.circleId) fail('FORBIDDEN', 'Visit scope mismatch.');
      visit.canceled = true; visit.version++; resultId = visit.id;
      for (const t of s.tasks.filter(t => t.visitId === visit.id && !closed.has(t.status))) {
        if (t.circleId !== visit.circleId || t.recipientId !== visit.recipientId) fail('FORBIDDEN', 'Linked task scope mismatch.');
        cancel(t);
      }
      break;
    }
    case 'requestAssignment': {
      const t = task!; current(t, c.expectedVersion); checkInstruction(s, t);
      if (closed.has(t.status)) fail('VALIDATION_FAILED', 'This task is closed.');
      authorize(s, c.helperId, t.recipientId, 'perform', ctx.now, t.id);
      if (!s.helpers.some(h => h.id === c.helperId)) fail('VALIDATION_FAILED', 'Helper unavailable.');
      if (s.assignments.some(a => a.taskId === t.id && a.helperId === c.helperId && ['requested', 'accepted'].includes(a.status))) fail('VALIDATION_FAILED', 'This helper already has an active request.');
      const withdrawn = s.assignments.filter(a => a.taskId === t.id && a.status === 'requested').map(a => a.helperId);
      s.assignments.filter(a => a.taskId === t.id && a.status === 'requested').forEach(a => { a.status = 'canceled'; a.version++; });
      assignment = { id: ctx.newId(), taskId: t.id, helperId: c.helperId, requestedBy: ctx.actorId, status: 'requested', version: 1, createdAt: ctx.now };
      s.assignments.push(assignment); t.version++; invalidate(s, t.id); reminder(s, t, ctx);
      event(s, t, ctx, 'assignment_requested', c.helperId); resultId = assignment.id;
      for (const target of withdrawn) event(s, t, ctx, 'task_changed', target);
      break;
    }
    case 'respondAssignment': {
      const a = assignment!, t = task!; current(a, c.expectedVersion);
      if (a.helperId !== ctx.actorId || a.status !== 'requested' || closed.has(t.status)) fail('FORBIDDEN', 'Only the intended helper can respond to an open request.');
      if (!['accepted', 'declined'].includes(c.response)) fail('VALIDATION_FAILED', 'Invalid response.');
      if (c.response === 'accepted') checkInstruction(s, t);
      if (c.response === 'accepted' && assignmentConflicts(s, ctx.actorId, t, ctx.actorId, ctx.now).some(w => w.kind !== 'capability_unknown')) fail('VALIDATION_FAILED', 'Resolve the overlapping commitment or unavailability before accepting.');
      const replaced = c.response === 'accepted' ? s.assignments.filter(other => other.taskId === t.id && other.id !== a.id && other.status === 'accepted').map(other => other.helperId) : [];
      if (c.response === 'accepted') s.assignments.filter(other => other.taskId === t.id && other.id !== a.id && other.status === 'accepted').forEach(other => { other.status = 'canceled'; other.version++; });
      a.status = c.response; a.version++; t.version++; invalidate(s, t.id); reminder(s, t, ctx);
      for (const target of new Set([a.requestedBy, ...coordinators(s, t, ctx.now)])) event(s, t, ctx, 'assignment_responded', target);
      for (const target of replaced) event(s, t, ctx, 'task_changed', target);
      resultId = a.id;
      break;
    }
    case 'cancelAssignment': {
      const a = assignment!, t = task!; current(a, c.expectedVersion);
      if (!['requested', 'accepted'].includes(a.status)) fail('VALIDATION_FAILED', 'Assignment already closed.');
      a.status = 'canceled'; a.version++; t.version++; invalidate(s, t.id); reminder(s, t, ctx); resultId = a.id;
      event(s, t, ctx, 'task_changed', a.helperId);
      break;
    }
    case 'outcome': {
      const t = task!; current(t, c.expectedVersion); checkInstruction(s, t);
      if (t.medicationOccurrenceId || t.category === 'medication') fail('VALIDATION_FAILED', 'Record medication outcomes through the medication module.');
      if (closed.has(t.status)) fail('ALREADY_RECORDED', 'Task already closed.');
      if (!s.assignments.some(a => a.taskId === t.id && a.helperId === ctx.actorId && a.status === 'accepted')) fail('FORBIDDEN', 'Accept responsibility before recording an outcome.');
      if (!['in_progress', 'completed', 'declined_by_recipient', 'unable_to_complete'].includes(c.status)) fail('VALIDATION_FAILED', 'Invalid outcome.');
      text(c.detail, 'Outcome note', 1000);
      t.status = c.status; t.version++; invalidate(s, t.id);
      if (c.status === 'unable_to_complete') { s.assignments.filter(a => a.taskId === t.id && a.status === 'accepted').forEach(a => { a.status = 'canceled'; a.version++; }); }
      reminder(s, t, ctx); break;
    }
    case 'editTask': case 'cancelTask': {
      const t = task!; current(t, c.expectedVersion);
      if (!['one', 'future'].includes(c.scope)) fail('VALIDATION_FAILED', 'Choose one or this-and-future occurrences.');
      if (closed.has(t.status)) fail('VALIDATION_FAILED', 'Historical outcomes cannot be rewritten.');
      const affected = c.scope === 'future' && t.seriesId ? s.tasks.filter(other => other.seriesId === t.seriesId && Date.parse(other.start) >= Date.parse(t.start) && !closed.has(other.status)) : [t];
      if (c.type === 'editTask') {
        text(c.title, 'Task title', 160); validateInterval(c.start, c.end, t.timezone);
        const oldLocal = parts(t.start, t.timezone);
        const newLocal = parts(c.start, t.timezone);
        const newEndLocal = parts(c.end, t.timezone);
        const midnight = (local: string) => Date.parse(`${local.slice(0, 10)}T00:00:00Z`);
        for (const other of affected) {
          authorize(s, ctx.actorId, other.recipientId, 'manage', ctx.now, other.id);
          if (other.instructionId) {
            const instruction = s.instructions.find(i => i.id === other.instructionId && i.current && i.recipientId === other.recipientId && i.circleId === other.circleId);
            if (!instruction || c.instructionVersion !== instruction.version) fail('VERSION_CONFLICT', 'Review and acknowledge the current instruction version before updating this task.');
            other.instructionVersion = instruction!.version;
          }
          other.title = c.title.trim();
          if (c.scope === 'one') { other.start = c.start; other.end = c.end; }
          else {
            const days = (midnight(parts(other.start, other.timezone)) - midnight(oldLocal)) / 86400000;
            const shift = (local: string) => { const date = new Date(`${local}:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 16); };
            other.start = localToInstant(shift(newLocal), other.timezone);
            other.end = localToInstant(shift(newEndLocal), other.timezone);
            validateInterval(other.start, other.end, other.timezone);
          }
          other.version++; invalidate(s, other.id);
          // Changed task requires new acknowledgment rather than retaining stale accepted coverage.
          const recipients = new Set([...coordinators(s, other, ctx.now), ...s.assignments.filter(a => a.taskId === other.id && ['accepted', 'requested'].includes(a.status)).map(a => a.helperId)]);
          s.assignments.filter(a => a.taskId === other.id && ['accepted', 'requested'].includes(a.status)).forEach(a => { a.status = 'canceled'; a.version++; });
          reminder(s, other, ctx);
          for (const target of recipients) event(s, other, ctx, 'task_changed', target);
        }
      } else for (const other of affected) { authorize(s, ctx.actorId, other.recipientId, 'manage', ctx.now, other.id); cancel(other); }
      break;
    }
  }
  function cancel(t: Task) {
    const recipients = new Set([...coordinators(s, t, ctx.now), ...s.assignments.filter(a => a.taskId === t.id && ['accepted', 'requested'].includes(a.status)).map(a => a.helperId)]);
    t.status = 'canceled'; t.version++; invalidate(s, t.id);
    s.assignments.filter(a => a.taskId === t.id && ['accepted', 'requested'].includes(a.status)).forEach(a => { a.status = 'canceled'; a.version++; });
    for (const target of recipients) event(s, t, ctx, 'task_changed', target);
  }
  for (const changed of s.tasks.filter(t => original.tasks.find(old => old.id === t.id)?.version !== t.version)) {
    s.audit.push({ id: ctx.newId(), taskId: changed.id, actorId: ctx.actorId, at: ctx.now, action: c.type, instructionVersion: changed.instructionVersion, detail: c.type === 'outcome' ? c.detail : c.type });
  }
  for (const changed of s.visits.filter(v => original.visits.find(old => old.id === v.id)?.version !== v.version)) {
    s.audit.push({ id: ctx.newId(), visitId: changed.id, actorId: ctx.actorId, at: ctx.now, action: c.type, detail: c.type });
  }
  s.receipts.push({ actorId: ctx.actorId, key: ctx.idempotencyKey, fingerprint, resultId });
  return { state: s, resultId };
}
export function projectView(s: CoordinationState, actorId: string, now: string): CoordinationView {
  if (!actorId) fail('UNAUTHENTICATED', 'Sign in to continue.');
  const readable = (recipient: string, taskId?: string) => { try { authorize(s, actorId, recipient, 'read', now, taskId); return true; } catch { return false; } };
  const tasks = s.tasks.filter(t => s.recipients.some(r => r.id === t.recipientId && r.circleId === t.circleId) && readable(t.recipientId, t.id));
  const taskIds = new Set(tasks.map(t => t.id));
  const recipients = s.recipients.filter(r => readable(r.id));
  // Restricted helpers get a minimal recipient label for their tasks, never the full recipient profile.
  for (const t of tasks) if (!recipients.some(r => r.id === t.recipientId)) recipients.push(s.recipients.find(r => r.id === t.recipientId)!);
  const assignments = s.assignments.filter(a => taskIds.has(a.taskId));
  const helpers = s.helpers.filter(h => h.id === actorId || recipients.some(r => readable(r.id) && s.grants.some(g => validGrant(g, h.id, now) && g.recipientId === r.id && !g.taskIds)));
  return structuredClone({ recipients, helpers: helpers.map(h => ({ ...h, unavailable: h.id === actorId ? h.unavailable : [] })), tasks,
    visits: s.visits.filter(v => s.recipients.some(r => r.id === v.recipientId && r.circleId === v.circleId) && readable(v.recipientId)), assignments,
    instructions: s.instructions.filter(i => tasks.some(t => t.instructionId === i.id)), audit: s.audit.filter(e => e.taskId && taskIds.has(e.taskId)) });
}
export function coverage(s: Pick<CoordinationState, 'assignments'>, t: Task) {
  if (closed.has(t.status)) return 'closed';
  return s.assignments.some(a => a.taskId === t.id && a.status === 'accepted') ? 'accepted' : s.assignments.some(a => a.taskId === t.id && a.status === 'requested') ? 'pending' : 'uncovered';
}
export function shouldDispatch(s: CoordinationState, eventId: string, now: string) {
  const e = s.outbox.find(e => e.id === eventId);
  if (!e || e.status !== 'pending' || Date.parse(e.dueAt) > Date.parse(now)) return false;
  const t = s.tasks.find(t => t.id === e.taskId);
  if (!t || t.version !== e.taskVersion || !s.recipients.some(r => r.id === t.recipientId && r.circleId === t.circleId)) return false;
  try { authorize(s, e.targetId, t.recipientId, 'read', now, t.id); } catch { return false; }
  if (e.kind === 'task_due') return !closed.has(t.status) && s.assignments.some(a => a.taskId === t.id && a.helperId === e.targetId && a.status === 'accepted');
  if (e.kind === 'assignment_requested') return !closed.has(t.status) && s.assignments.some(a => a.taskId === t.id && a.helperId === e.targetId && a.status === 'requested');
  return true;
}
export async function execute(repository: CoordinationRepository, raw: unknown, ctx: MutationContext) {
  return repository.transaction(ctx.actorId, state => {
    const result = applyCommand(state, raw, ctx);
    Object.assign(state, result.state);
    return result.resultId;
  });
}
