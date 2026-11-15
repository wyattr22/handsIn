import type { CareCommand, CareContext, CareRepository, CareWorkspace, Meal } from '../../../contracts/care';
import type { CareSource } from '../../../contracts/coordination';
import { applyCommand, authorize } from '../coordination/service';
import { CoordinationError, localToInstant, parts } from '../coordination/time';
import { checkMeal } from './guidance';
import { ingredients, recipes } from './catalog';

function fail(message: string): never { throw new CoordinationError('VALIDATION_FAILED', message); }
function text(value: unknown, label: string, max = 1000): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`${label} is required (up to ${max} characters).`);
}
function version(actual: number, expected?: number) {
  if (actual !== expected) throw new CoordinationError('VERSION_CONFLICT', 'This item changed. Refresh before saving.');
}
function source(w: CareWorkspace, recipientId: string, value: CareSource, at: string, ctx: CareContext) {
  if (!['self_reported', 'observed', 'reported_by_other'].includes(value) || (value === 'self_reported') !== (w.coordination.recipients.find(r => r.id === recipientId)?.userId === ctx.actorId)) fail('Select an accurate reporting source.');
  if (!Number.isFinite(Date.parse(at)) || Date.parse(at) > Date.parse(ctx.now)) fail('Observation time must not be in the future.');
}
export function canCare(w: CareWorkspace, actor: string, recipientId: string, permission: 'read' | 'manage' | 'perform', now: string, taskId?: string) {
  try {
    if (taskId) authorize(w.coordination, actor, recipientId, permission, now, taskId);
    else for (const category of ['meal', 'daily_care']) authorize(w.coordination, actor, recipientId, permission, now, undefined, category);
    return true;
  } catch { return false; }
}
/** Pure atomic transition. A production host MUST call this inside one authorized database transaction. */
export function applyCare(original: CareWorkspace, c: CareCommand, ctx: CareContext): { workspace: CareWorkspace; resultId: string } {
  if (!ctx.actorId || !Number.isFinite(Date.parse(ctx.now))) fail('Verified identity and server time are required.');
  text(ctx.idempotencyKey, 'Request key', 200);
  if (!c || typeof c !== 'object') fail('Invalid command.');
  const w = structuredClone(original), s = w.coordination;
  const taskId = 'taskId' in c ? c.taskId : c.type === 'reviewMeal' ? w.meals.find(m => m.id === c.mealId)?.taskId : undefined;
  const task = s.tasks.find(t => t.id === taskId);
  const observation = 'observationId' in c ? s.observations?.find(o => o.id === c.observationId) : undefined;
  const recipientId = c.type === 'saveProfile' ? c.profile?.recipientId : c.type === 'saveRoutine' ? c.routine?.recipientId : 'recipientId' in c ? c.recipientId : task?.recipientId || observation?.recipientId;
  if (!recipientId) fail('Item unavailable.');
  const category = ['planMeal', 'reviewMeal'].includes(c.type) ? 'meal' : c.type === 'record' ? task?.category : 'daily_care';
  const recipient = authorize(s, ctx.actorId, recipientId, ['record', 'observe'].includes(c.type) ? 'perform' : 'manage', ctx.now, taskId, category);
  if (task && task.circleId !== recipient.circleId) fail('Task scope mismatch.');
  const fingerprint = JSON.stringify(c), receipt = s.receipts.find(r => r.actorId === ctx.actorId && r.key === ctx.idempotencyKey);
  if (receipt) {
    if (receipt.fingerprint !== fingerprint) fail('Request key already used.');
    return { workspace: w, resultId: receipt.resultId };
  }
  let resultId = '';
  const execute = (command: Parameters<typeof applyCommand>[1], suffix: string) => {
    const result = applyCommand(w.coordination, command, { ...ctx, idempotencyKey: `${ctx.idempotencyKey}:${suffix}` });
    w.coordination = result.state; return result.resultId;
  };
  switch (c.type) {
    case 'planMeal': {
      text(c.name, 'Meal name', 160);
      if (!Number.isFinite(c.servings) || c.servings <= 0 || c.servings > 20) fail('Choose 0–20 servings, greater than zero.');
      if (c.recipeId && !recipes.some(r => r.id === c.recipeId)) fail('Recipe unavailable.');
      const recipe = recipes.find(r => r.id === c.recipeId);
      if (!c.substitutions || Object.entries(c.substitutions).some(([from, to]) => !recipe?.ingredients.some(i => i.ingredientId === from) || !ingredients.some(i => i.id === to))) fail('Unknown ingredient substitution.');
      const id = execute({ type: 'createTask', input: { recipientId, title: c.name, category: 'meal', recordingPolicy: 'shared_care', start: c.start, end: c.end, timezone: recipient.timezone } }, 'task');
      const meal: Meal = { id: ctx.newId(), taskId: id, name: c.name.trim(), recipeId: c.recipeId, servings: c.servings, substitutions: c.substitutions, version: 1 };
      w.meals.push(meal);
      const checked = checkMeal(w, meal);
      if (checked.blocked.length) fail(checked.blocked.join(' '));
      resultId = meal.id; break;
    }
    case 'reviewMeal': {
      const m = w.meals.find(m => m.id === c.mealId)!; version(m.version, c.expectedVersion);
      const check = checkMeal(w, m);
      if (check.blocked.length) fail(check.blocked.join(' '));
      if (check.fingerprint !== c.fingerprint) fail('Guidance changed. Review the updated information first.');
      m.reviewedFingerprint = check.fingerprint; m.version++; resultId = m.id; break;
    }
    case 'saveProfile': {
      const old = w.profiles.find(p => p.recipientId === recipientId); if (!old) fail('Profile unavailable.');
      version(old.version, c.expectedVersion);
      const p = c.profile;
      if (!Number.isInteger(p.dailyMealGoal) || p.dailyMealGoal < 1 || p.dailyMealGoal > 10) fail('Choose a household meal goal from 1–10.');
      if ((p.heightCm !== undefined && (!Number.isFinite(p.heightCm) || p.heightCm <= 0 || p.heightCm > 300)) || (p.weightKg !== undefined && (!Number.isFinite(p.weightKg) || p.weightKg <= 0 || p.weightKg > 700))) fail('Check height and weight units.');
      if (p.allergies !== null && (!Array.isArray(p.allergies) || p.allergies.some(a => typeof a !== 'string' || a.length > 100))) fail('Invalid allergy list.');
      if (!Array.isArray(p.avoidIngredients) || p.avoidIngredients.some(a => typeof a !== 'string' || a.length > 100)) fail('Invalid restriction list.');
      for (const field of [p.dietaryNotes, p.preferences, p.healthFactors]) if (typeof field !== 'string' || field.length > 2000) fail('Profile text is too long.');
      text(p.planSource, 'Plan source');
      Object.assign(old, p, { version: old.version + 1, reviewedAt: ctx.now }); resultId = recipientId; break;
    }
    case 'record': {
      if (!task || task.recordingPolicy !== 'shared_care' || task.medicationOccurrenceId || !['meal', 'daily_care'].includes(task.category)) fail('This is not a shared meal or daily-care occurrence.');
      version(task.version, c.expectedVersion);
      if (task.status === 'canceled') fail('This occurrence was canceled.');
      source(w, recipientId, c.source, c.observedAt, ctx); text(c.note, 'Record note');
      const meal = w.meals.find(m => m.taskId === taskId);
      if (task.category === 'meal' && !meal) fail('Meal plan is unavailable.');
      const stages = task.category === 'meal' ? ['prepared', 'offered', 'consumed', 'declined', 'needs_help'] : ['completed', 'declined', 'needs_help'];
      if (!stages.includes(c.stage)) fail('Choose an appropriate outcome.');
      if (c.stage === 'consumed' && !['none', 'some', 'most', 'all'].includes(c.amount || '')) fail('Record how much was eaten.');
      const prior = effectiveLog(w, task.id);
      if (c.correctsId) {
        if (!prior || prior.id !== c.correctsId) fail('Correct the latest record.');
        text(c.reason, 'Correction reason', 500);
      } else if (['completed', 'declined_by_recipient'].includes(task.status)) fail('Already recorded. Choose Correct last record.');
      const latestAudit = w.coordination.audit.filter(e => e.taskId === task.id && e.action === 'careOutcome').at(-1);
      const status = c.stage === 'completed' || (c.stage === 'consumed' && c.amount !== 'none') ? 'completed' : c.stage === 'declined' ? 'declined_by_recipient' : c.stage === 'needs_help' || c.amount === 'none' ? 'unable_to_complete' : 'in_progress';
      execute({ type: 'careOutcome', taskId: task.id, expectedVersion: c.expectedVersion, status, source: c.source, observedAt: c.observedAt,
        detail: `${c.stage}${c.amount ? ` (${c.amount})` : ''}: ${c.note}`, correctsAuditId: c.correctsId ? latestAudit?.id : undefined, correctionReason: c.reason }, 'outcome');
      const log = { id: ctx.newId(), taskId: task.id, actorId: ctx.actorId, at: ctx.now, observedAt: c.observedAt, source: c.source, stage: c.stage, amount: c.amount, note: c.note.trim(), supersedesId: c.correctsId, reason: c.reason };
      w.logs.push(log); resultId = log.id; break;
    }
    case 'saveRoutine': {
      const r = c.routine, old = w.routines.find(x => x.id === r.id);
      if (old && old.recipientId !== recipientId) fail('Routine scope mismatch.');
      if (old) version(old.version, c.expectedVersion);
      text(r.title, 'Routine title', 160); text(r.instructions, 'Care instructions'); text(r.source, 'Care-plan source'); text(r.assistance, 'Assistance');
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) || !Array.isArray(r.weekdays) || !r.weekdays.length || r.weekdays.some(d => !Number.isInteger(d) || d < 0 || d > 6) || typeof r.active !== 'boolean') fail('Choose a valid time and days.');
      if (old) {
        for (const t of w.coordination.tasks.filter(t => t.seriesId === r.id && Date.parse(t.start) >= Date.parse(ctx.now) && !['completed', 'declined_by_recipient', 'canceled'].includes(t.status))) execute({ type: 'cancelTask', taskId: t.id, expectedVersion: t.version, scope: 'one' }, `retire-${t.id}`);
        Object.assign(old, r, { version: old.version + 1 }); resultId = old.id;
      } else { resultId = ctx.newId(); w.routines.push({ ...r, id: resultId, version: 1 }); }
      break;
    }
    case 'scheduleRoutines': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(c.firstDay) || !Number.isInteger(c.days) || c.days < 1 || c.days > 14) fail('Schedule up to 14 days at a time.');
      for (let i = 0; i < c.days; i++) {
        const date = new Date(`${c.firstDay}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + i);
        const day = date.toISOString().slice(0, 10);
        for (const routine of w.routines.filter(r => r.recipientId === recipientId && r.active && r.weekdays.includes(date.getUTCDay()))) {
          if (w.coordination.tasks.some(t => t.seriesId === routine.id && parts(t.start, t.timezone).startsWith(day) && (t.instructionVersion === routine.version || ['completed', 'declined_by_recipient'].includes(t.status)))) continue;
          const instructionId = `${routine.id}-v${routine.version}`;
          if (!w.coordination.instructions.some(x => x.id === instructionId)) w.coordination.instructions.push({ id: instructionId, circleId: recipient.circleId, recipientId, version: routine.version, current: true, text: `${routine.instructions} Assistance: ${routine.assistance}. Source: ${routine.source}` });
          const start = localToInstant(`${day}T${routine.time}`, recipient.timezone);
          resultId = execute({ type: 'createTask', input: { recipientId, title: routine.title, category: 'daily_care', recordingPolicy: 'shared_care', start, end: new Date(Date.parse(start) + 30 * 60000).toISOString(), timezone: recipient.timezone, instructionId } }, `${routine.id}-${day}`);
          w.coordination.tasks.find(t => t.id === resultId)!.seriesId = routine.id;
        }
      }
      break;
    }
    case 'observe': {
      if (taskId && (!task || task.recipientId !== recipientId || task.circleId !== recipient.circleId)) fail('Linked task unavailable.');
      source(w, recipientId, c.source, c.observedAt, ctx); text(c.description, 'What you noticed'); text(c.location, 'Body location', 200);
      if (!['skin_change', 'injury', 'other'].includes(c.kind)) fail('Choose an observation type.');
      resultId = ctx.newId();
      (w.coordination.observations ||= []).push({ id: resultId, circleId: recipient.circleId, recipientId, taskId, actorId: ctx.actorId, at: ctx.now, observedAt: c.observedAt, source: c.source, kind: c.kind, location: c.location, description: c.description, status: 'open', version: 1 });
      for (const actor of new Set(s.grants.map(g => g.actorId))) if (canCare(w, actor, recipientId, 'manage', ctx.now)) w.coordination.outbox.push({ id: ctx.newId(), observationId: resultId, recipientId, targetId: actor, kind: 'care_concern', dueAt: ctx.now, status: 'pending', taskVersion: 1 });
      break;
    }
    case 'followUp': {
      if (!observation || observation.circleId !== recipient.circleId) fail('Observation unavailable.');
      version(observation.version, c.expectedVersion); text(c.note, 'Follow-up note');
      if (observation.status === 'resolved' || !['acknowledged', 'resolved'].includes(c.status)) fail('Observation is already resolved or status is invalid.');
      observation.version++; observation.status = c.status;
      if (c.status === 'acknowledged') Object.assign(observation, { acknowledgedBy: ctx.actorId, acknowledgedAt: ctx.now });
      else Object.assign(observation, { resolution: c.note, resolvedBy: ctx.actorId, resolvedAt: ctx.now });
      w.coordination.outbox.filter(e => e.observationId === observation.id).forEach(e => { e.status = 'invalidated'; });
      resultId = observation.id; break;
    }
    default: fail('Unknown care command.');
  }
  w.coordination.audit.push({ id: ctx.newId(), taskId, actorId: ctx.actorId, at: ctx.now, action: `care:${c.type}`, detail: c.type === 'followUp' ? `${resultId}: ${c.status}: ${c.note}` : `${c.type}: ${resultId}` });
  w.coordination.receipts.push({ actorId: ctx.actorId, key: ctx.idempotencyKey, fingerprint, resultId });
  return { workspace: w, resultId };
}
export function effectiveLog(w: CareWorkspace, taskId: string) { return w.logs.filter(l => l.taskId === taskId).at(-1); }
export function mealsEaten(w: CareWorkspace, recipientId: string, day: string) {
  return w.meals.filter(m => {
    const t = w.coordination.tasks.find(t => t.id === m.taskId && t.recipientId === recipientId && t.status !== 'canceled');
    const log = effectiveLog(w, m.taskId);
    return t && log?.stage === 'consumed' && log.amount !== 'none' && log.amount !== undefined && parts(log.observedAt, t.timezone).startsWith(day);
  }).length;
}
/** Only full-recipient grants expose health profiles; task-filtered guests get calendar task projections only. */
export function projectCare(w: CareWorkspace, actor: string, now: string): CareWorkspace {
  const ids = new Set(w.coordination.recipients.filter(r => canCare(w, actor, r.id, 'read', now)).map(r => r.id));
  const tasks = w.coordination.tasks.filter(t => ids.has(t.recipientId) && canCare(w, actor, t.recipientId, 'read', now, t.id) && w.coordination.recipients.some(r => r.id === t.recipientId && r.circleId === t.circleId));
  const taskIds = new Set(tasks.map(t => t.id));
  return structuredClone({ ...w,
    profiles: w.profiles.filter(p => ids.has(p.recipientId)), guidance: w.guidance.filter(g => ids.has(g.recipientId)),
    meals: w.meals.filter(m => taskIds.has(m.taskId)), routines: w.routines.filter(r => ids.has(r.recipientId)), logs: w.logs.filter(l => taskIds.has(l.taskId)),
    coordination: { ...w.coordination, recipients: w.coordination.recipients.filter(r => ids.has(r.id)), tasks,
      grants: w.coordination.grants.filter(g => g.actorId === actor && ids.has(g.recipientId)), helpers: w.coordination.helpers.filter(h => h.id === actor || w.coordination.grants.some(g => g.actorId === h.id && ids.has(g.recipientId) && canCare(w, h.id, g.recipientId, 'read', now))).map(h => ({ ...h, unavailable: [] })),
      visits: w.coordination.visits.filter(v => { try { const r = authorize(w.coordination, actor, v.recipientId, 'read', now, undefined, 'scheduling'); return ids.has(v.recipientId) && r.circleId === v.circleId; } catch { return false; } }), instructions: w.coordination.instructions.filter(i => tasks.some(t => t.instructionId === i.id)),
      assignments: w.coordination.assignments.filter(a => taskIds.has(a.taskId)), observations: w.coordination.observations?.filter(o => ids.has(o.recipientId)),
      audit: w.coordination.audit.filter(e => e.taskId && taskIds.has(e.taskId)), outbox: w.coordination.outbox.filter(e => e.targetId === actor && (e.recipientId ? ids.has(e.recipientId) : !!e.taskId && taskIds.has(e.taskId))), receipts: [] } });
}
export async function executeCare(repo: CareRepository, c: CareCommand, ctx: CareContext) {
  return repo.transaction(ctx.actorId, w => { const result = applyCare(w, c, ctx); Object.assign(w, result.workspace); return result.resultId; });
}
