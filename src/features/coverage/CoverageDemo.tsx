'use client';

import { useState } from 'react';
import type { Command, Coverage, CoverageTask, Envelope, Outcome } from './domain';
import { applyCoverage, coverageLabel, createDemoStore, viewCoverage } from './domain';
import styles from './coverage.module.css';

const labels: Record<Outcome, string> = { completed: 'Done', declined_by_recipient: 'Recipient declined', unable_to_complete: 'Unable to complete', uncertain: 'Unsure · needs review' };
function time(value: string, zone: string) { return new Intl.DateTimeFormat('en-US', { timeZone: zone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value)); }
type Action = (command: Command) => void;

function RequestForm({ coverage: c, act }: { coverage: Coverage; act: Action }) {
  const [tasks, setTasks] = useState(c.taskIds.filter(id => !c.tasks.find(t => t.id === id)?.outcome));
  const [available, setAvailable] = useState(c.originalAvailable);
  const [reviewed, setReviewed] = useState(false);
  return <form onSubmit={e => { e.preventDefault(); act({ type: 'invite', taskIds: tasks, originalAvailable: available, reviewed }); }}>
    <h2>Make the handoff yours.</h2><p>Choose what Casey will cover. Instructions are ready for you to review.</p>
    <fieldset><legend>What needs covering?</legend>{c.tasks.map(t => <label className={styles.check} key={t.id}><input type="checkbox" checked={tasks.includes(t.id)} disabled={!!t.outcome} onChange={e => setTasks(e.target.checked ? [...tasks, t.id] : tasks.filter(id => id !== t.id))} /><span><strong>{t.title}</strong><small>{t.outcome ? labels[t.outcome] : t.instruction}</small></span></label>)}</fieldset>
    <fieldset><legend>If no one accepts, can you still attend?</legend><label className={styles.check}><input type="radio" name="available" checked={!available} onChange={() => setAvailable(false)} />No — these tasks will need coverage</label><label className={styles.check}><input type="radio" name="available" checked={available} onChange={() => setAvailable(true)} />Yes — I can remain the backup plan</label></fieldset>
    <div className={styles.note}><strong>Casey · known friend</strong><p>Maya coordinates this visit. Jordan is the backup contact.</p><p>Casey will first see the time, area and selected duties. Home details open after acceptance.</p></div>
    <details><summary>Review the handoff Casey will receive</summary><p>{c.address}</p><p>{c.arrival}</p><p>{c.preference}</p><p>{c.contact}</p>{c.tasks.filter(t => tasks.includes(t.id)).map(t => <p key={t.id}><strong>{t.title}</strong><br />{t.instruction}<br /><small>{t.source}</small></p>)}</details>
    <label className={styles.check}><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /><span>I reviewed the instructions and the fictional recipient's sharing approval for Casey.</span></label>
    <button className={styles.primary} disabled={!reviewed || !tasks.length}>Request coverage from Casey</button>
    <p className={styles.small}>This saves your availability choice in the demo. No message is sent.</p>
  </form>;
}

function TaskCard({ task: t, name, canRecord, act }: { task: CoverageTask; name: string; canRecord: boolean; act: Action }) {
  const [note, setNote] = useState('');
  const stale = t.acknowledgedVersion !== t.instructionVersion;
  return <article className={styles.task}>
    <div className={styles.taskHeading}><h3>{t.title}</h3><span className={styles.badge}>{t.outcome ? labels[t.outcome] : 'No outcome recorded'}</span></div>
    <p>{t.instruction}</p><p className={styles.small}>{t.source} · version {t.instructionVersion}</p>
    {t.outcome ? <p>{t.note || 'No additional note.'}</p> : <>
      {stale ? <div className={styles.warning}><strong>{t.acknowledgedVersion ? 'Instructions changed.' : 'Review the instructions.'}</strong><p>Review the directions above before recording an outcome.</p><button onClick={() => act({ type: 'acknowledge', taskId: t.id, instructionVersion: t.instructionVersion })}>I've reviewed these instructions</button></div> : null}
      <label>Note for the care team <span className={styles.small}>(optional unless unable or unsure)</span><textarea value={note} maxLength={1000} onChange={e => setNote(e.target.value)} placeholder="A short, factual observation" /></label>
      <div className={styles.actions}>{(['completed', 'declined_by_recipient', 'unable_to_complete', 'uncertain'] as Outcome[]).map(outcome => <button key={outcome} className={outcome === 'completed' ? styles.primary : ''} disabled={!canRecord || stale} onClick={() => act({ type: 'outcome', taskId: t.id, taskVersion: t.version, instructionVersion: t.instructionVersion, outcome, note })}>{outcome === 'declined_by_recipient' ? `${name} declined` : labels[outcome]}</button>)}</div>
    </>}
  </article>;
}

function Handoff({ coverage: c, now, act }: { coverage: Coverage; now: string; act: Action }) {
  const [report, setReport] = useState('');
  const canRecord = Date.parse(now) >= Date.parse(c.start);
  const tasks = c.tasks.filter(t => c.taskIds.includes(t.id));
  return <>
    <div className={styles.sectionTop}><div><p className={styles.eyebrow}>YOUR HANDOFF</p><h2>A familiar routine.<br />A helping hand.</h2></div><span className={styles.badge}>{c.arrivedAt ? 'Arrival reported' : 'You are confirmed'}</span></div>
    <div className={styles.note}><strong>Before you go</strong><p>{c.address}</p><p>{c.arrival}</p><details><summary>Contact & questions</summary><p>{c.contact}</p><p>For partial availability or questions, contact the coordinator before proceeding. Messaging is not connected in this demo.</p></details></div>
    <blockquote>{c.preference}</blockquote><p className={styles.small}>Handoff access ends {time(c.end, c.timezone)} or when you submit your report.</p>
    {!canRecord ? <p className={styles.warning}>You can prepare now. Visit recording opens {time(c.start, c.timezone)}. Use Demo tools to advance the clock.</p> : null}
    <div className={styles.actions}><button disabled={!canRecord || !!c.arrivedAt} onClick={() => act({ type: 'arrive' })}>{c.arrivedAt ? 'Arrival recorded' : "I'm here"}</button><button onClick={() => act({ type: 'withdraw' })}>I can no longer cover</button></div>
    <h2>Your tasks</h2>{tasks.map(t => <TaskCard key={t.id} task={t} name={c.name} canRecord={canRecord} act={act} />)}
    <section className={styles.return}><h2>Leave the team in the loop.</h2><p>{tasks.filter(t => t.outcome === 'completed').length} done · {tasks.filter(t => t.outcome !== 'completed').length} to review</p><ul>{tasks.filter(t => t.outcome !== 'completed').map(t => <li key={t.id}>{t.title}: {t.outcome ? labels[t.outcome] : 'No outcome recorded'}</li>)}</ul><label>End-of-visit note<textarea maxLength={1000} value={report} onChange={e => setReport(e.target.value)} /></label><p>Submitting closes your temporary handoff. Outstanding work goes back to {c.coordinatorName}; it is not marked done.</p><button className={styles.primary} disabled={!canRecord} onClick={() => act({ type: 'report', note: report })}>Submit visit report</button></section>
  </>;
}

function Coordinator({ coverage: c, now, act }: { coverage: Coverage; now: string; act: Action }) {
  const [followup, setFollowup] = useState('');
  const ended = Date.parse(now) >= Date.parse(c.end);
  return <>
    <p className={styles.eyebrow}>COORDINATOR OVERVIEW</p><h2>{coverageLabel(c, now)}</h2>
    <p>{c.state === 'confirmed' && !ended ? `${c.helperName} accepted the selected tasks. ${c.arrivedAt ? 'Arrival was self-reported.' : 'Arrival is not yet confirmed.'}` : c.originalAvailable && c.state === 'seeking' ? 'You remain available until a replacement accepts.' : 'Review unfinished work and make sure someone is responsible for the next step.'}</p>
    {c.state === 'seeking' && c.invitation === 'pending' ? <div className={styles.warning}>An invitation is not secured coverage. Reply requested by {time(c.respondBy, c.timezone)}.</div> : null}
    <div className={styles.taskList}>{c.tasks.map(t => <div key={t.id}><span>{t.title}<small>{c.taskIds.includes(t.id) ? 'Included in request' : 'Outside this request · original responsibility unchanged'}</small></span><strong>{t.outcome ? labels[t.outcome] : 'No outcome recorded'}</strong>{t.note ? <p>{t.note}</p> : null}</div>)}</div>
    {c.state === 'draft' || (c.state === 'seeking' && Date.parse(now) < Date.parse(c.respondBy) && c.invitation !== 'pending') ? <RequestForm key={c.version} coverage={c} act={act} /> : null}
    {c.state === 'seeking' && c.invitation === 'pending' ? <p className={styles.note}>Next in this demo: switch “View as” to Casey to accept or decline.</p> : null}
    {c.state === 'closed' || ended ? <section className={styles.return}><h3>Return notes & follow-up</h3><p>{c.report || 'No visit note recorded.'}</p><p>Unreported work is unknown, not proof care did not happen. Respect a recipient's refusal rather than automatically repeating care.</p><label>Your follow-up plan<textarea maxLength={1000} value={followup} onChange={e => setFollowup(e.target.value)} placeholder="Who will review the remaining work?" /></label><button onClick={() => act({ type: 'followup', note: followup })}>Acknowledge with a plan</button>{c.followup ? <p className={styles.note}>Recorded plan: {c.followup}</p> : null}</section> : null}
    {!['closed', 'canceled'].includes(c.state) ? <button className={styles.cancel} onClick={() => act({ type: 'cancel' })}>Cancel this coverage request</button> : null}
    <details><summary>Activity history ({c.history.length})</summary>{c.history.length ? <ol>{c.history.map((event, i) => <li key={i}>{event.text}<small>{event.actor} · {time(event.at, c.timezone)}</small></li>)}</ol> : <p>No changes yet.</p>}</details>
  </>;
}

export default function CoverageDemo() {
  const [store, setStore] = useState(createDemoStore);
  const [actor, setActor] = useState('maya');
  const [selected, setSelected] = useState('nora');
  const [now, setNow] = useState('2026-11-15T18:00:00Z');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [failNext, setFailNext] = useState(false);
  const [retry, setRetry] = useState<Envelope | null>(null);
  const view = viewCoverage(store, selected, actor, now);
  const c = store.coverages.find(c => c.id === selected)!; // Synthetic demo controls only.
  function clearFeedback() { setMessage(''); setError(''); setRetry(null); }
  function run(input: Envelope) {
    setError(''); setMessage('');
    if (failNext) { setFailNext(false); setRetry(input); setError('Simulated connection failure. Not saved. Retry the same action below.'); return; }
    try { setStore(applyCoverage(store, input, actor, now)); setRetry(null); setMessage('Saved in this demo. Reloading clears changes.'); }
    catch (err) { setRetry(null); setError(err instanceof Error ? err.message : 'Unable to save.'); }
  }
  const act: Action = command => run({ coverageId: selected, expectedVersion: c.version, operationId: crypto.randomUUID(), command });
  function moveClock(value: string) { clearFeedback(); setNow(value); }
  return <main className={styles.shell}>
    <header className={styles.nav}><a href="/" className={styles.wordmark}>Hands<span>In</span></a><a href="/coverage">About this preview ↗</a></header>
    <div className={styles.demoBar}><strong>FICTIONAL DEMO</strong><span>No real invitations, authentication or shared storage. Refresh resets everything.</span></div>
    <div className={styles.heading}><div><p className={styles.eyebrow}>CARE, EVEN WHEN PLANS CHANGE</p><h1>Someone to step in.</h1><p>A thoughtful handoff for the people you trust.</p></div><span className={styles.flower} aria-hidden="true">✳</span></div>
    <div className={styles.controls}><label>View as<select value={actor} onChange={e => { clearFeedback(); setActor(e.target.value); }}><option value="maya">Maya · coordinator</option><option value="casey">Casey · replacement helper</option><option value="unrelated">Unrelated account</option></select></label><label>Demo scenario<select value={selected} onChange={e => { clearFeedback(); setSelected(e.target.value); }}><option value="nora">Nora's visit</option><option value="eli">Eli's visit</option></select></label></div>
    <div className={styles.layout}>
      <aside className={styles.sidebar}><p className={styles.eyebrow}>TEMPORARY COVERAGE</p><h2>A clear plan.<br />A calmer day.</h2><ol><li>Review the handoff</li><li>Get a clear yes</li><li>Help with confidence</li><li>Bring the team up to date</li></ol><p>Acceptance, arrival and completion are three different things.</p><details><summary>Demo tools</summary><p className={styles.small}>These controls simulate time and source changes. They are not app permissions.</p><p>Clock: {time(now, c.timezone)}</p><div className={styles.tools}><button onClick={() => moveClock('2026-11-15T18:00:00Z')}>Before visit</button><button onClick={() => moveClock(c.start)}>Start visit</button><button onClick={() => moveClock(c.end)}>Expire access</button><button onClick={() => { clearFeedback(); setStore(createDemoStore()); setNow('2026-11-15T18:00:00Z'); }}>Reset demo</button></div><label className={styles.check}><input type="checkbox" checked={failNext} onChange={e => setFailNext(e.target.checked)} />Fail next save</label>{actor === 'maya' && c.state === 'confirmed' ? <button onClick={() => act({ type: 'changeInstruction', taskId: c.taskIds[0], text: 'Updated household note: the grocery bag is now by the side table. Ask before putting it away.' })}>Simulate changed instructions</button> : null}</details></aside>
      <section className={styles.panel} aria-label="Coverage workspace">
        <div role="status" aria-live="polite">{message ? <p className={styles.success}>{message}</p> : null}</div><div role="alert">{error ? <p className={styles.warning}>{error}</p> : null}</div>{retry ? <button onClick={() => run(retry)}>Retry unsaved action</button> : null}
        {view.kind === 'unavailable' ? <div className={styles.empty}><span aria-hidden="true">↗</span><h2>This handoff isn't available.</h2><p>It may not be open to this demo account, or its access has ended. Contact the coordinator if you need to report something.</p><p className={styles.small}>For the walkthrough, start as Maya, request coverage, then switch to Casey.</p></div> : view.kind === 'receipt' ? <div className={styles.empty}><h2>Thank you for stepping in.</h2><p>{view.message}</p><p>Switch to Maya to review the return report.</p></div> : <>
          <div className={styles.identity}><span className={styles.avatar}>{view.kind === 'preview' ? view.name[0] : view.coverage.name[0]}</span><div><strong>{view.kind === 'preview' ? view.name : view.coverage.name}'s visit</strong><small>{time(view.kind === 'preview' ? view.start : view.coverage.start, view.kind === 'preview' ? view.timezone : view.coverage.timezone)}</small></div></div>
          {view.kind === 'preview' ? <><p className={styles.eyebrow}>AN INVITATION FROM {view.coordinatorName.toUpperCase()}</p><h2>Could you lend a hand?</h2><p>{view.area} · until {time(view.end, view.timezone)}</p><ul className={styles.previewTasks}>{view.taskTitles.map(title => <li key={title}>{title}</li>)}</ul><p>No medication or personal care is included. Exact arrival details open after acceptance.</p><details><summary>Questions or only available for part?</summary><p>Ask {view.coordinatorName} to clarify or revise the request before accepting. Partial availability does not confirm coverage. Messaging is not connected in this demo.</p></details><div className={styles.actions}><button className={styles.primary} onClick={() => act({ type: 'respond', response: 'accepted' })}>I can cover this visit</button><button onClick={() => act({ type: 'respond', response: 'declined' })}>I can't cover</button></div><p className={styles.small}>Please reply by {time(view.respondBy, view.timezone)}.</p></> : view.kind === 'handoff' ? <Handoff key={`${selected}-${actor}`} coverage={view.coverage} now={now} act={act} /> : <Coordinator key={`${selected}-${actor}`} coverage={view.coverage} now={now} act={act} />}
        </>}
      </section>
    </div><footer className={styles.footer}>A little less guessing. A little more being there.</footer>
  </main>;
}
