'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CareCommand, FoodGuidance, Meal } from '../../contracts/care';
import type { CareSource, Task } from '../../contracts/coordination';
import { applyCare, canCare, effectiveLog, mealsEaten, projectCare } from '../../server/domain/care/service';
import { applyCommand } from '../../server/domain/coordination/service';
import { checkMeal, shoppingList } from '../../server/domain/care/guidance';
import { doseIssues, foodInstruction, instructionConflicts, linkedDoses, macroInstruction } from '../../server/domain/care/requirements';
import { ingredients, recipes } from '../../server/domain/care/catalog';
import { localToInstant, parts } from '../../server/domain/coordination/time';
import { shiftDay } from '../coordination/calendarMath';
import CalendarDialog from '../coordination/CalendarDialog';
import { useDemoWorkspace } from './DemoWorkspace';
import { ProfileForm, RoutineForm } from './PlanForms';
import { MealPlanner, RecordForm, SourceField } from './TodayForms';
import baseStyles from './care.module.css';
import todayStyles from './today.module.css';
const styles = { ...baseStyles, ...todayStyles };

const statusName = (status: string) => ({ open: 'To do', completed: 'Done', skipped: 'Skipped', declined_by_recipient: 'Skipped', unable_to_complete: 'Needs help', in_progress: 'In progress', canceled: 'Canceled' }[status] || status);
const sourceName = (source: string) => ({ self_reported: 'Self-reported', observed: 'Personally observed', reported_by_other: 'Reported by someone else' }[source] || source);
const value = (d: FormData, key: string) => String(d.get(key) || '').trim();
type Modal = { type: 'plan' | 'ideas' | 'recipe' | 'record' | 'profile' | 'routine' | 'observation'; id?: string; doseId?: string; correction?: boolean } | null;

export default function CareToday() {
  const { workspace, setWorkspace, actor, setActor } = useDemoWorkspace(), w = workspace!;
  const [now, setNow] = useState(() => new Date().toISOString());
  const [recipientId, setRecipientId] = useState('r-alex'), [day, setDay] = useState(() => parts(now, 'America/Los_Angeles').slice(0, 10));
  const [tab, setTab] = useState<'meals' | 'care'>('meals'), [modal, setModal] = useState<Modal>(null);
  const [message, setMessage] = useState(''), [error, setError] = useState('');
  useEffect(() => { const timer = setInterval(() => setNow(new Date().toISOString()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('task'), t = w.coordination.tasks.find(t => t.id === id);
    if (t) { setRecipientId(t.recipientId); setDay(parts(t.start, t.timezone).slice(0, 10)); setTab(t.category === 'daily_care' ? 'care' : 'meals'); }
    // Incoming calendar links select a date once. Later selections belong to the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const view = projectCare(w, actor, now), recipient = view.coordination.recipients.find(r => r.id === recipientId) || view.coordination.recipients[0];
  const id = recipient?.id || '', zone = recipient?.timezone || 'America/Los_Angeles', today = parts(now, zone).slice(0, 10);
  const manager = canCare(w, actor, id, 'manage', now), profile = view.profiles.find(p => p.recipientId === id);
  const tasks = view.coordination.tasks.filter(t => t.recipientId === id && t.recordingPolicy === 'shared_care' && t.status !== 'canceled' && parts(t.start, zone).startsWith(day)).sort((a, b) => a.start.localeCompare(b.start));
  const meals = tasks.filter(t => t.category === 'meal'), observations = view.coordination.observations?.filter(o => o.recipientId === id) || [];
  const doses = view.medicationOccurrences?.filter(d => d.recipientId === id && d.status !== 'canceled' && parts(d.at, zone).startsWith(day)).sort((a,b) => a.at.localeCompare(b.at)) || [];
  const canRecord = (t: Task) => canCare(w, actor, t.recipientId, 'perform', now, t.id);
  const name = (actorId: string) => actorId ? view.coordination.helpers.find(h => h.id === actorId)?.name || 'Care team member' : 'Not assigned';
  const time = (at: string) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: zone }).format(new Date(at));
  const meal = view.meals.find(m => m.id === modal?.id), task = view.coordination.tasks.find(t => t.id === modal?.id);
  function open(next: Modal) { setError(''); setMessage(''); setModal(next); }
  function run(c: CareCommand, close = true) {
    try { const result = applyCare(w, c, { actorId: actor, now: new Date().toISOString(), idempotencyKey: crypto.randomUUID(), newId: () => crypto.randomUUID() }); setWorkspace(result.workspace); setError(''); setMessage('Saved.'); if (close) setModal(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Please try again.'); }
  }
  function cancel(t: Task) {
    try { const result = applyCommand(w.coordination, { type: 'cancelTask', taskId: t.id, expectedVersion: t.version, scope: 'one' }, { actorId: actor, now: new Date().toISOString(), idempotencyKey: crypto.randomUUID(), newId: () => crypto.randomUUID() }); setWorkspace({ ...w, coordination: result.state }); setMessage('Reminder canceled.'); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to cancel.'); }
  }
  function recordButton(t: Task) {
    const closed = ['completed', 'skipped', 'declined_by_recipient'].includes(t.status);
    return canRecord(t) && <button className={closed ? '' : styles.primary} onClick={() => open({ type: 'record', id: t.id, correction: closed })}>{closed ? 'Correct record' : t.category === 'meal' ? 'Record meal' : 'Done'}</button>;
  }
  function history(t: Task) {
    const log = effectiveLog(view, t.id), accepted = view.coordination.assignments.filter(a => a.taskId === t.id && a.status === 'accepted');
    return <>
      <p>Primary: {name(accepted.find(a => (a.priority ?? 0) === 0)?.helperId || '')}. Secondary: {name(accepted.find(a => a.priority === 1)?.helperId || '')}.</p>
      <p><Link href="/calendar/demo">Open calendar & assignments</Link></p>
      {log && <p>Last recorded by {name(log.actorId)}. {sourceName(log.source)}. Observed {parts(log.observedAt, zone).replace('T', ' ')}. Saved {parts(log.at, zone).replace('T', ' ')}.</p>}
      {view.logs.filter(l => l.taskId === t.id).map(l => <p className={styles.small} key={l.id}>{sourceName(l.source)} - {name(l.actorId)}: {l.stage === 'completed' ? 'Done' : l.stage === 'declined' ? 'Skipped' : l.stage.replaceAll('_', ' ')}{l.amount ? ` (${l.amount})` : ''}. {l.note} {l.reason && `Correction: ${l.reason}`}</p>)}
      {manager && !['completed', 'skipped', 'declined_by_recipient'].includes(t.status) && <button onClick={() => cancel(t)}>Cancel this reminder</button>}
    </>;
  }
  function mealCard(t: Task) {
    const m = view.meals.find(m => m.taskId === t.id); if (!m) return null;
    const check = checkMeal(view, m), recipe = recipes.find(r => r.id === m.recipeId), linked = linkedDoses(view, m);
    const unresolved = check.review.find(s => /not been confirmed|not confirmed|not.*match|unavailable|unknown|need.*review|conflict|unconfirmed|missing|changed|requires verified/i.test(s) && !s.includes('interaction checking'));
    const needs = check.blocked.length ? 'Food conflict: review this meal before serving.' : unresolved ? `Needs confirmation: ${unresolved}` : check.review.some(s => !s.includes('interaction checking')) && m.reviewedFingerprint !== check.fingerprint ? 'Needs confirmation: check the food details.' : '';
    return <article className={styles.simpleMeal} key={t.id} id={`task-${t.id}`}>
      <div className={styles.row}><p className={styles.mealTime}>{time(t.start)} <span>{t.title}</span></p><span className={t.status === 'completed' ? styles.done : styles.badge}>{statusName(t.status)}</span></div>
      {linked.length ? linked.map((d, i) => { const g = view.guidance.find(g => g.id === d?.guidanceId); return <div className={styles.doseLine} key={d?.id || i}><p><strong>{g?.product || 'Medication needs confirmation'}</strong>{d && ` at ${time(d.at)}`}</p><p><span className={styles.requiredLabel}>{!d || doseIssues(view, d).length ? 'Needs confirmation' : 'Required'}</span> {g ? foodInstruction(g) : 'Confirm the medication instructions.'}</p></div>; }) : <p className={styles.small}>Meal suggestion only - no medication dose is linked.</p>}
      <div className={styles.suggestion}><span>Meal suggestion</span><h3>{check.blocked.length ? 'Choose another meal' : recipe?.title || m.name}</h3><p>{check.blocked.length ? 'The previous suggestion conflicts with the recorded instructions.' : `${recipe ? `${recipe.minutes} minutes` : 'Custom meal'}${m.drinks?.length ? ` - Serve with ${m.drinks.map(id => ingredients.find(i => i.id === id)?.name || id).join(', ').toLowerCase()}` : ''}`}</p></div>
      {needs && <p className={styles.confirmation}>{needs}</p>}
      <div className={styles.actions}>{recordButton(t)}{check.blocked.length && manager ? <button onClick={() => open({ type: 'ideas', id: m.id })}>Other meal ideas</button> : recipe && <button onClick={() => open({ type: 'recipe', id: m.id })}>View recipe</button>}</div>
      <details className={styles.details}><summary>Details</summary>
        {check.blocked.map(s => <p className={styles.warning} key={s}>{s}</p>)}{check.review.map(s => <p key={s}>{s}</p>)}
        {linked.map(d => { const g = view.guidance.find(g => g.id === d?.guidanceId); return g && <GuidanceSource key={g.id} guidance={g} />; })}
        <p>Check ingredient packaging and the individual dietary, texture and fluid instructions. A suggested meal is optional; it is not a complete nutrition plan.</p>
        {manager && <div className={styles.actions}><button onClick={() => open({ type: 'ideas', id: m.id })}>Other meal ideas</button><button disabled={!!check.blocked.length} onClick={() => run({ type: 'reviewMeal', mealId: m.id, expectedVersion: m.version, fingerprint: check.fingerprint }, false)}>I reviewed the food details</button></div>}
        {m.reviewedFingerprint && m.reviewedFingerprint !== check.fingerprint && <p className={styles.warning}>The plan changed since the last review. Please review it again.</p>}
        {history(t)}
      </details>
    </article>;
  }
  function reminder(t: Task) {
    return <article className={styles.reminder} key={t.id} id={`reminder-${t.id}`}><div className={styles.reminderTop}><div><p className={styles.small}>{time(t.start)}</p><h3>{t.category === 'meal' ? `${t.title} - eat a meal` : t.title}</h3><p className={styles.small}>{statusName(t.status)}</p></div>{recordButton(t)}</div><details className={styles.details}><summary>Details</summary>{view.coordination.instructions.filter(i => i.id === t.instructionId).map(i => <p key={i.id}>{i.text}</p>)}{history(t)}</details></article>;
  }
  const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));
  return <main className={`${styles.shell} ${styles.page}`}>
    <header className={styles.header}><Link className={styles.logo} href="/">Hands<span>In</span></Link><nav aria-label="Care sections"><Link href="/calendar/demo">Calendar</Link><Link href="/care/demo" aria-current="page">Meals & daily care</Link></nav></header>
    <p className={styles.demo}>Fictional demo. Changes reset on reload. No real alerts are sent.</p>
    <div className={styles.heading}><div><h1>Meals & daily care<span>.</span></h1><p className={styles.subtitle}>What to eat. When to eat. A little care each day.</p></div></div>
    <section className={styles.toolbar} aria-label="Person and day"><label>Care for<select value={id} disabled={!recipient} onChange={e => { setRecipientId(e.target.value); setError(''); }}>{view.coordination.recipients.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}{!recipient && <option>No accessible profiles</option>}</select></label><div className={styles.dateNav}><button aria-label="Previous day" onClick={() => setDay(shiftDay(day, -1))}>&lsaquo;</button><label>Date<input type="date" value={day} onChange={e => { if (e.target.value) setDay(e.target.value); }} /></label><button aria-label="Next day" onClick={() => setDay(shiftDay(day, 1))}>&rsaquo;</button><button onClick={() => setDay(today)}>Today</button></div></section>
    {message && <p role="status" className={styles.success}>{message}</p>}{error && !modal && <p role="alert" className={styles.warning}>{error}</p>}
    {!recipient ? <section className={styles.empty}><h2>No access to a care profile</h2><p>This account has no shared meals and daily-care access.</p></section> : <>
      <div className={styles.todayHeading}><h2>{day === today ? 'Today' : dayLabel}</h2><p>{day === today ? dayLabel : ''} <span className={styles.small}>{zone.replaceAll('_', ' ')}</span></p></div>
      <div className={styles.tabs} role="tablist" aria-label="Daily support" onKeyDown={e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 'meals' : e.key === 'End' ? 'care' : tab === 'meals' ? 'care' : 'meals'; setTab(next); document.getElementById(`tab-${next}`)?.focus(); } }}><button id="tab-meals" role="tab" aria-controls="care-panel" tabIndex={tab === 'meals' ? 0 : -1} aria-selected={tab === 'meals'} onClick={() => setTab('meals')}>Meals</button><button id="tab-care" role="tab" aria-controls="care-panel" tabIndex={tab === 'care' ? 0 : -1} aria-selected={tab === 'care'} onClick={() => setTab('care')}>Daily care</button></div>
      <section id="care-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        <div className={styles.sectionHeading}><p>{tab === 'meals' ? 'Simple meals for your medication times.' : 'A few reminders for the day.'}</p>{manager && <button onClick={() => open({ type: tab === 'meals' ? 'plan' : 'routine' })}>+ {tab === 'meals' ? 'Plan a meal' : 'Add reminder'}</button>}</div>
        {tab === 'meals' ? meals.map(mealCard) : tasks.map(reminder)}
        {!(tab === 'meals' ? meals : tasks).length && <p className={styles.empty}>Nothing planned for this day.</p>}
        {tab === 'meals' && doses.filter(d => !view.meals.some(m => m.medicationOccurrenceIds?.includes(d.id) && view.coordination.tasks.some(t => t.id === m.taskId && t.status !== 'canceled'))).map(d => { const g = view.guidance.find(g => g.id === d.guidanceId); return <article className={styles.reminder} key={d.id}><strong>{g?.product} - {time(d.at)}</strong><p>{g && foodInstruction(g)}</p>{manager && g && !doseIssues(view, d).length && g.rule !== 'empty_stomach' && g.rule !== 'separate' ? <button onClick={() => open({ type: 'plan', doseId: d.id })}>Review a meal for this dose</button> : <p>Needs confirmation: ask the pharmacist or prescriber about food timing.</p>}</article>; })}
      </section>
      {tab === 'meals' ? <>
        <details className={styles.panel}><summary>Medication food instructions</summary>{view.guidance.filter(g => g.recipientId === id).map(g => <GuidanceSource key={g.id} guidance={g} />)}</details>
        <details className={styles.panel}><summary>Shopping list & meal progress</summary><p>{mealsEaten(view, id, day)} of {profile?.dailyMealGoal || 2} meals recorded as eaten. This is a household tracking goal, not a nutrition target.</p><ul>{shoppingList(view, id, day).map((i, n) => <li key={n}>{Number(i.amount.toFixed(2))} {i.unit} {i.name}</li>)}</ul><p>Check custom meals and drinks separately.</p></details>
      </> : <>
        <details className={styles.panel}><summary>Observations & follow-up {observations.some(o => o.status !== 'resolved') ? `(${observations.filter(o => o.status !== 'resolved').length} open)` : ''}</summary><p>Optional: record a sore, skin change or injury. Describe what you noticed without diagnosing or prescribing treatment. Completing a reminder does not resolve a concern.</p>{canCare(w, actor, id, 'perform', now) && <button onClick={() => open({ type: 'observation' })}>Add an observation</button>}{observations.map(o => <article className={styles.observation} key={o.id}><strong>{o.location} - {o.status}</strong><p>{o.description}</p><p className={styles.small}>{name(o.actorId)}. {sourceName(o.source)}. {parts(o.observedAt, zone).replace('T', ' ')}</p>{o.resolution && <p>{o.resolution}</p>}{manager && o.status !== 'resolved' && <form onSubmit={e => { e.preventDefault(); const d = new FormData(e.currentTarget); run({ type: 'followUp', observationId: o.id, expectedVersion: o.version, status: value(d, 'status') as 'acknowledged' | 'resolved', note: value(d, 'note') }, false); }}><label>Follow-up note<input name="note" required maxLength={1000} /></label><label>Update<select name="status"><option value="acknowledged">Acknowledge; keep open</option><option value="resolved">Resolve with follow-up note</option></select></label><button>Save follow-up</button></form>}</article>)}</details>
        {manager && <details className={styles.panel}><summary>Manage personal reminders</summary><button onClick={() => run({ type: 'scheduleRoutines', recipientId: id, firstDay: day, days: 7 })}>Schedule next 7 days</button>{view.routines.filter(r => r.recipientId === id).map(r => <div className={styles.routine} key={r.id}><div><strong>{r.title}</strong><p>{r.time} - {r.active ? 'Active' : 'Paused'}</p></div><button onClick={() => open({ type: 'routine', id: r.id })}>Edit reminder</button></div>)}</details>}
      </>}
      {manager && <p><button className={styles.textButton} onClick={() => open({ type: 'profile' })}>Personalize care plan</button></p>}
    </>}
    <details className={styles.demoTools}><summary>Demo tools & connections</summary><label>View as<select value={actor} onChange={e => { setActor(e.target.value); setModal(null); setError(''); setMessage(''); }}>{w.coordination.helpers.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label><p>Sarah is the coordinator. Ben is a secondary caregiver. Maya is a caregiver. Alex can self-report for Alex only. Guest and unrelated accounts have no care-profile access.</p><p>Medication schedules are fictional adapter data. Full interaction checking, production accounts, encrypted storage and phone alerts are not connected. {view.coordination.outbox.filter(e => e.status === 'pending').length} notification events are queued for this account; none have been delivered.</p></details>
    <footer className={styles.footer}>Care is a team effort.<Link href="/calendar/demo">Open calendar</Link></footer>
    {modal && <CalendarDialog title={{ plan: 'Plan a meal', ideas: 'Other meal ideas', recipe: 'Simple recipe', record: modal.correction ? 'Correct record' : task?.category === 'meal' ? 'Record meal' : 'Update reminder', profile: 'Personalize care plan', routine: 'Personal reminder', observation: 'Record an observation' }[modal.type]} close={() => { setModal(null); setError(''); }}><div className={styles.form}>
      {error && <p role="alert" className={styles.warning}>{error}</p>}
      {(modal.type === 'plan' || modal.type === 'ideas') && <MealPlanner workspace={view} recipientId={id} day={day} zone={zone} initialMeal={meal} initialDoseId={modal.doseId} submit={run} />}
      {modal.type === 'record' && task && <RecordForm task={task} now={now} actor={actor} patientId={recipient?.userId} prior={modal.correction ? effectiveLog(view, task.id) : undefined} submit={run} />}
      {modal.type === 'profile' && profile && <ProfileForm profile={profile} submit={run} />}
      {modal.type === 'routine' && <RoutineForm routine={view.routines.find(r => r.id === modal.id)} recipientId={id} submit={run} />}
      {modal.type === 'recipe' && meal && <RecipeDetails meal={meal} />}
      {modal.type === 'observation' && <form onSubmit={e => { e.preventDefault(); const d = new FormData(e.currentTarget); try { run({ type: 'observe', recipientId: id, kind: value(d, 'kind') as 'skin_change' | 'injury' | 'other', location: value(d, 'location'), description: value(d, 'description'), source: value(d, 'source') as CareSource, observedAt: localToInstant(value(d, 'observedAt'), zone) }); } catch (e) { setError(e instanceof Error ? e.message : 'Check the time.'); } }}><label>Type<select name="kind"><option value="skin_change">Sore area / skin change</option><option value="injury">Injury noticed</option><option value="other">Other</option></select></label><label>Body location<input name="location" required maxLength={200} /></label><label>What you noticed<textarea name="description" required maxLength={1000} /></label><SourceField self={actor === recipient?.userId} /><label>Observed at ({zone})<input name="observedAt" type="datetime-local" defaultValue={parts(now, zone)} required max={parts(now, zone)} /></label><button className={styles.primary}>Save observation</button></form>}
    </div></CalendarDialog>}
  </main>;
}
export function GuidanceSource({ guidance: g }: { guidance: FoodGuidance }) {
  return <details className={styles.source}><summary>{g.product}</summary><p><strong>{instructionConflicts(g).length || g.status === 'needs_review' ? 'Needs confirmation' : 'Required'}:</strong> {foodInstruction(g)}</p><p>{macroInstruction(g)}</p>{instructionConflicts(g).map(s => <p key={s} className={styles.warning}>{s} Confirm with the pharmacist or prescriber.</p>)}{g.patientInstruction && <p>Patient instruction: {g.patientInstruction}</p>}<blockquote>{g.sourceText}</blockquote><a href={g.sourceUrl} target="_blank" rel="noreferrer">Read product source</a><p className={styles.small}>{g.productIdentity && `${g.productIdentity.ingredient}; ${g.productIdentity.strength}; ${g.productIdentity.form}; ${g.productIdentity.route}. `}Source: {g.sourceVersion || 'Version unavailable'}. Instruction version {g.version}. {g.status === 'confirmed_demo' ? 'Fictional confirmation only.' : g.status === 'confirmed' ? 'Confirmed product instructions.' : 'Not confirmed.'}</p></details>;
}
function RecipeDetails({ meal }: { meal: Meal }) {
  const r = recipes.find(r => r.id === meal.recipeId); if (!r) return <p>Custom meal: review its ingredients separately.</p>;
  const substituted = Object.values(meal.substitutions).length > 0;
  return <><h3>{r.title}</h3><p>{r.minutes} minutes - {meal.servings} planned serving{meal.servings === 1 ? '' : 's'}</p><h3>What you need</h3><ul>{r.ingredients.map(i => <li key={i.ingredientId}>{Number((i.amount * meal.servings / r.servings).toFixed(2))} {i.unit} {ingredients.find(x => x.id === (meal.substitutions[i.ingredientId] || i.ingredientId))?.name}</li>)}{meal.drinks?.map(id => <li key={id}>Serve with {ingredients.find(i => i.id === id)?.name}. Follow any fluid restrictions.</li>)}</ul><h3>What to do</h3><ol>{r.steps.map(s => <li key={s}>{s}</li>)}</ol>{substituted && <p className={styles.warning}>Ingredients were substituted. The original steps may need adjustment; confirm preparation and texture before using.</p>}<p>Meal suggestion, not a prescribed portion. Check allergies, package labels and individual texture instructions.</p></>;
}
