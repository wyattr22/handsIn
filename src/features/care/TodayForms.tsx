'use client';
import { useState } from 'react';
import type { CareCommand, CareLog, CareWorkspace, Meal } from '../../contracts/care';
import type { CareSource, Task } from '../../contracts/coordination';
import { checkMeal } from '../../server/domain/care/guidance';
import { doseIssues, foodInstruction, rankRecipes } from '../../server/domain/care/requirements';
import { ingredients, recipes } from '../../server/domain/care/catalog';
import { localToInstant, parts } from '../../server/domain/coordination/time';
import styles from './care.module.css';

const value = (d: FormData, key: string) => String(d.get(key) || '').trim();
export function SourceField({ self }: { self: boolean }) {
  return <label>How do you know?<select name="source" defaultValue={self ? 'self_reported' : 'observed'}>{self ? <option value="self_reported">I am the patient - self-reported</option> : <><option value="observed">I personally observed it</option><option value="reported_by_other">Someone told me</option></>}</select></label>;
}
export function RecordForm({ task, now, actor, patientId, prior, submit }: { task: Task; now: string; actor: string; patientId?: string; prior?: CareLog; submit: (c: CareCommand) => void }) {
  const meal = task.category === 'meal', [stage, setStage] = useState<CareLog['stage']>(meal ? 'consumed' : 'completed'), [error, setError] = useState('');
  const title = (s: string) => ({ consumed: 'Eaten / drunk', prepared: 'Prepared', offered: 'Offered', completed: 'Done', skipped: 'Skipped', declined: 'Patient declined', needs_help: 'Need help' }[s] || s);
  return <form onSubmit={e => { e.preventDefault(); const d = new FormData(e.currentTarget); try { submit({ type: 'record', taskId: task.id, expectedVersion: task.version, stage, amount: stage === 'consumed' ? value(d, 'amount') as CareLog['amount'] : undefined, source: value(d, 'source') as CareSource, observedAt: localToInstant(value(d, 'observedAt'), task.timezone), note: value(d, 'note') || `${title(stage)}: ${task.title}`, correctsId: prior?.id, reason: prior ? value(d, 'reason') : undefined }); } catch (e) { setError(e instanceof Error ? e.message : 'Please check the time.'); } }}>
    <p><strong>{task.title}</strong></p><label>What happened?<select value={stage} onChange={e => setStage(e.target.value as CareLog['stage'])}>{(meal ? ['consumed', 'prepared', 'offered', 'declined', 'needs_help'] : ['completed', 'skipped', 'needs_help']).map(s => <option key={s} value={s}>{title(s)}</option>)}</select></label>
    {stage === 'consumed' && <label>How much was eaten?<select name="amount" defaultValue="some"><option value="none">None</option><option value="some">Some</option><option value="most">Most</option><option value="all">All</option></select></label>}
    <SourceField self={patientId === actor} /><label>When did it happen? ({task.timezone})<input type="datetime-local" name="observedAt" required defaultValue={parts(now, task.timezone)} max={parts(now, task.timezone)} /></label>
    <label>{meal ? 'What was actually eaten?' : 'Note (optional)'}<textarea name="note" required={meal} maxLength={1000} placeholder={meal ? 'It can be different from the suggested meal.' : 'Anything the care team should know?'} /></label>
    {meal && <p className={styles.small}>Prepared or offered food does not count as eaten. This record does not mark medication as taken.</p>}
    {prior && <label>Reason for correction<input name="reason" required maxLength={500} /></label>}{error && <p role="alert" className={styles.warning}>{error}</p>}<button className={styles.primary}>{prior ? 'Save correction' : 'Save record'}</button>
  </form>;
}
export function MealPlanner({ workspace: w, recipientId, day, zone, initialMeal, initialDoseId, submit }: { workspace: CareWorkspace; recipientId: string; day: string; zone: string; initialMeal?: Meal; initialDoseId?: string; submit: (c: CareCommand) => void }) {
  const choices = (w.medicationOccurrences || []).filter(d => d.recipientId === recipientId && d.status !== 'canceled' && parts(d.at, zone).startsWith(day)).sort((a,b) => a.at.localeCompare(b.at));
  const available = choices.filter(d => !w.meals.some(m => m.id !== initialMeal?.id && m.medicationOccurrenceIds?.includes(d.id) && w.coordination.tasks.some(t => t.id === m.taskId && t.status !== 'canceled')));
  const originalTask = w.coordination.tasks.find(t => t.id === initialMeal?.taskId);
  const defaultDose = available.find(d => d.id === initialDoseId);
  const [doseIds, setDoseIds] = useState(initialMeal?.medicationOccurrenceIds || (defaultDose ? [defaultDose.id] : []));
  const [time, setTime] = useState(originalTask ? parts(originalTask.start, zone).slice(11) : defaultDose ? parts(defaultDose.at, zone).slice(11) : '12:00');
  const [servings, setServings] = useState(initialMeal?.servings || 1), [subs, setSubs] = useState<Record<string, string>>(initialMeal?.substitutions || {});
  const [drinks, setDrinks] = useState<string[]>(initialMeal?.drinks || (defaultDose && w.guidance.find(g => g.id === defaultDose.guidanceId)?.requirements?.some(r => r.type === 'drink' && r.ingredientIds.includes('water')) ? ['water'] : []));
  const [error, setError] = useState('');
  let previewTask: Task | undefined;
  try { const start = originalTask?.start || localToInstant(`${day}T${time}`, zone); previewTask = { id: initialMeal?.taskId || 'meal-preview', recipientId, circleId: w.coordination.recipients.find(r => r.id === recipientId)?.circleId || '', title: '', start, end: originalTask?.end || new Date(Date.parse(start) + 30 * 60000).toISOString(), timezone: zone, category: 'meal', status: 'open', version: 1 }; } catch { /* Show the local-time error on submit. */ }
  const base: Meal = { id: initialMeal?.id || 'meal-preview', taskId: previewTask?.id || '', name: '', servings, substitutions: subs, version: initialMeal?.version || 1, drinks, medicationOccurrenceIds: doseIds };
  const preview = { ...w, coordination: { ...w.coordination, tasks: [...w.coordination.tasks.filter(t => t.id !== previewTask?.id), ...(previewTask ? [previewTask] : [])] } };
  const ranked = rankRecipes(preview, base, checkMeal);
  const [recipeId, setRecipeId] = useState(initialMeal?.recipeId || ranked[0]?.recipe.id || '');
  const selectedRecipe = recipes.find(r => r.id === recipeId), candidate = { ...base, recipeId: recipeId || undefined };
  const assessment = checkMeal(preview, candidate);
  function toggleDose(id: string, checked: boolean) {
    setDoseIds(ids => checked ? [...ids, id] : ids.filter(x => x !== id));
    const dose = choices.find(d => d.id === id);
    if (checked && dose && !doseIds.length && !initialMeal) {
      setTime(parts(dose.at, zone).slice(11));
      if (w.guidance.find(g => g.id === dose.guidanceId)?.requirements?.some(r => r.type === 'drink' && r.ingredientIds.includes('water'))) setDrinks(['water']);
    }
  }
  return <form onSubmit={e => { e.preventDefault(); const d = new FormData(e.currentTarget); try {
    if (!previewTask) throw new Error('Choose a valid local time. Clock-change times may need confirmation.');
    if (initialMeal) submit({ type: 'changeMeal', mealId: initialMeal.id, expectedVersion: initialMeal.version, recipeId: recipeId || undefined, servings, substitutions: subs, drinks, fingerprint: assessment.fingerprint });
    else submit({ type: 'planMeal', recipientId, name: value(d, 'name'), start: previewTask.start, end: previewTask.end, recipeId: recipeId || undefined, servings, substitutions: subs, drinks, medicationOccurrenceIds: doseIds, expectedDoseVersions: Object.fromEntries(available.filter(d => doseIds.includes(d.id)).map(d => [d.id, d.version])), repeatDays: Number(value(d, 'repeat') || 1) });
  } catch (e) { setError(e instanceof Error ? e.message : 'Unable to plan this meal.'); } }}>
    {!initialMeal && <><label>Meal name<input name="name" required maxLength={160} placeholder="Breakfast, lunch, dinner..." defaultValue={defaultDose ? 'Meal with medication' : ''} /></label>
      <fieldset><legend>Related medication (optional)</legend>{available.length ? available.map(d => { const g = w.guidance.find(g => g.id === d.guidanceId), invalid = doseIssues(w, d); return <label key={d.id} className={styles.checkbox}><input type="checkbox" checked={doseIds.includes(d.id)} disabled={!!invalid.length} onChange={e => toggleDose(d.id, e.target.checked)} /><span>{g?.product} - {parts(d.at, zone).slice(11)}<small className={styles.fieldHelp}>{g && foodInstruction(g)}{invalid.length ? ' Needs confirmation.' : ''}</small></span></label>; }) : <p>No unplanned confirmed doses for this day. You can still plan an ordinary meal.</p>}</fieldset>
      <label>Meal time ({zone})<input type="time" value={time} required onChange={e => setTime(e.target.value)} /></label><p className={styles.small}>Review this proposed time. Medication times stay unchanged. No extra food window is assumed.</p></>}
    <label>{initialMeal ? 'Choose another simple meal' : 'Meal suggestion'}<select value={recipeId} onChange={e => { setRecipeId(e.target.value); setSubs({}); }}><option value="">Custom meal - ingredients need review</option>{recipes.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
    {selectedRecipe && <p>{selectedRecipe.minutes} minutes. {selectedRecipe.description}</p>}<label>Planned servings<input type="number" min="0.25" max="20" step="0.25" required value={servings} onChange={e => setServings(Number(e.target.value))} /></label>
    <label className={styles.checkbox}><input type="checkbox" checked={drinks.includes('water')} onChange={e => setDrinks(e.target.checked ? ['water'] : [])} />Serve with water (follow any fluid restrictions)</label>
    {selectedRecipe && <details><summary>Ingredients & substitutions</summary><p>Substitutions are rechecked. Preparation, quantities and texture may need review.</p>{selectedRecipe.ingredients.map(i => <label key={i.ingredientId}>{Number((i.amount * servings / selectedRecipe.servings).toFixed(2))} {i.unit} {ingredients.find(x => x.id === i.ingredientId)?.name}<select value={subs[i.ingredientId] || i.ingredientId} onChange={e => setSubs({ ...subs, [i.ingredientId]: e.target.value })}>{ingredients.filter(x => !x.tags.includes('drink')).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>)}</details>}
    {assessment.blocked.map(s => <p key={s} className={styles.warning}>{s}</p>)}
    <details><summary>Food details & confirmation</summary>{assessment.review.map(s => <p key={s}>{s}</p>)}{assessment.notes.map(s => <p key={s}>{s}</p>)}</details>
    {!initialMeal && <label>Repeat this meal<select name="repeat" defaultValue="1"><option value="1">This day only</option><option value="7">Daily for 7 days</option></select></label>}
    <label className={styles.checkbox}><input type="checkbox" required />I reviewed the meal, time, allergies and dietary instructions. Missing information still needs confirmation.</label>
    {error && <p role="alert" className={styles.warning}>{error}</p>}<button className={styles.primary} disabled={!!assessment.blocked.length}>{initialMeal ? 'Save meal idea' : 'Confirm meal & add to calendar'}</button>
  </form>;
}
