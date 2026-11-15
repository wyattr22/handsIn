'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CoverageWorkspaceProvider, useCoverageWorkspace } from '../../coverage/DemoWorkspace';
import DemoAppFrame from '../../coverage/DemoAppFrame';
import CalendarDemo from '../../coordination/CalendarDemo';
import type { CalendarWalkthrough } from '../../coordination/walkthrough';
import { DEMO_HELPERS } from '../../coordination/demo/people';
import { Timeline } from './timeline';
import styles from './eros.module.css';

const NOTE = 'June chose a walk in the garden. We spent the afternoon together. — Ben';
const ASSETS = ['/brand/handsin-mark.png', '/demo-profiles/june-photo.png', '/demo-profiles/alex-photo.png'];
type Mode = 'loading' | 'ready' | 'playing' | 'paused' | 'done' | 'manual' | 'error';

export default function ErosDemo() {
  const [generation, setGeneration] = useState(0);
  // A nested provider deliberately isolates all synthetic records from the ordinary demo.
  return <CoverageWorkspaceProvider key={generation}><Player restart={() => setGeneration(n => n + 1)} /></CoverageWorkspaceProvider>;
}

function Player({ restart }: { restart: () => void }) {
  const api = useRef<CalendarWalkthrough>(null), timeline = useRef<Timeline | null>(null);
  const root = useRef<HTMLDivElement>(null), playButton = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<Mode>('loading');
  const [caption, setCaption] = useState('One family. A clear handoff.');
  const [elapsed, setElapsed] = useState(0), [failure, setFailure] = useState('');
  const { setNow, selected, recipients, actor } = useCoverageWorkspace();
  const person = recipients.find(p => p.key === selected)!;
  const actorName = DEMO_HELPERS.find(p => p.id === actor)?.name.split(' ')[0] || 'Helper';

  function clearHighlight() { root.current?.querySelectorAll('[data-eros-focus]').forEach(el => el.removeAttribute('data-eros-focus')); }
  function focusTarget(target?: string) {
    clearHighlight();
    if (!target) return;
    const el = root.current?.querySelector<HTMLElement>(`[data-eros="${target}"]`);
    if (!el) throw new Error('The next control is unavailable. Restart or take over manually.');
    if (el instanceof HTMLDetailsElement) el.open = true;
    el.setAttribute('data-eros-focus', 'true');
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
  }

  useEffect(() => {
    let canceled = false;
    const abort = new AbortController();
    const timeout = window.setTimeout(() => {
      abort.abort();
      if (!canceled) { setFailure('Preparation timed out. Check the connection, then Restart.'); setMode('error'); }
    }, 8000);
    setNow('2026-11-15T23:45:00Z'); // Fixed fictional 3:45 PM, within June’s care window.
    api.current?.prepare();
    Promise.all(ASSETS.map(async src => {
      const response = await fetch(src, { signal: abort.signal });
      if (!response.ok) throw new Error('A demo image could not load.');
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob); bitmap.close();
    })).then(() => document.fonts.ready).then(() => {
      if (canceled || abort.signal.aborted) return;
      api.current?.prepare();
      setMode('ready');
    }).catch(() => { if (!canceled) { setFailure('Preparation failed. Check the connection, then Restart.'); setMode('error'); } })
      .finally(() => window.clearTimeout(timeout));
    return () => { canceled = true; abort.abort(); window.clearTimeout(timeout); timeline.current?.stop(); };
  }, [setNow]);

  function start() {
    if (mode !== 'ready' || !api.current || timeline.current) return;
    const current = () => { if (!api.current) throw new Error('Calendar disconnected.'); if (api.current.snapshot.error) throw new Error(api.current.snapshot.error); return api.current; };
    timeline.current = new Timeline([
      { at: 0, caption: 'June needs company. Ben can see the request.', target: 'task', act: () => {}, ready: () => current().snapshot.recipient === 'r-june' },
      { at: 3000, caption: 'Open the task. See exactly what needs doing.', target: 'accept', act: () => current().open(), ready: () => current().snapshot.entryId === 't-walk' },
      { at: 7000, caption: 'Ben accepts. Responsibility is now clear.', target: 'record', act: () => current().accept(), ready: () => current().snapshot.accepted },
      { at: 10000, caption: 'June’s preferences travel with the task.', target: 'instructions', act: () => {}, ready: () => current().snapshot.accepted },
      { at: 14000, caption: 'After the visit, Ben records what happened.', target: 'note', act: () => current().record(), ready: () => current().snapshot.action === 'outcome' },
      { at: 16000, caption: 'A short update gives the next helper context.', target: 'save', act: () => current().write(NOTE), ready: () => current().snapshot.note === NOTE },
      { at: 19000, caption: 'The task is resolved, with Ben’s update attached.', target: 'history', act: () => current().save(), ready: () => current().snapshot.completed && current().snapshot.action === null },
      { at: 22000, caption: 'Who helped. What happened. One clear record.', target: 'history', act: () => {}, ready: () => current().snapshot.completed },
    ]);
    timeline.current.resume(performance.now()); setMode('playing');
  }

  useEffect(() => {
    if (mode !== 'playing') return;
    let frame = 0;
    const tick = () => {
      const player = timeline.current;
      if (!player) return;
      const settled = player.tick(performance.now());
      setElapsed(player.elapsed);
      if (settled !== null) {
        setCaption(player.steps[settled].caption);
        try { focusTarget(player.steps[settled].target); }
        catch (e) { player.error = e instanceof Error ? e.message : 'Playback interrupted.'; player.stop(); }
      }
      if (player.error) { setFailure(player.error); setMode('error'); return; }
      if (player.finished) { setMode('done'); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  useEffect(() => {
    const visibility = () => { if (document.hidden && timeline.current && !timeline.current.paused) { timeline.current.pause(performance.now()); setMode('paused'); } };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);

  function pause() { timeline.current?.pause(performance.now()); setMode('paused'); }
  function resume() { timeline.current?.resume(performance.now()); setMode('playing'); }
  function takeover() { timeline.current?.stop(); clearHighlight(); setMode('manual'); setCaption('You’re in control. These records stay in this preview.'); }

  return <div ref={root} className={styles.demo} data-mode={mode} onKeyDownCapture={e => {
    if (e.key === 'Escape' && mode === 'playing') { e.preventDefault(); e.stopPropagation(); pause(); playButton.current?.focus(); }
  }}>
    <header className={styles.presenter}>
      <div><span className={styles.eyebrow}>EROS · AUTOMATED WALKTHROUGH</span><strong>Care is shared when responsibility is clear.</strong><p><span className={styles.person} style={{ color: person.color }}>● {person.name}</span> · {actorName}’s view · Fictional, in-memory data · 25 sec</p></div>
      <div className={styles.controls} aria-label="Walkthrough controls">
        <button ref={playButton} className={styles.primary} disabled={mode === 'loading' || mode === 'done' || mode === 'manual' || mode === 'error'} onClick={mode === 'playing' ? pause : mode === 'paused' ? resume : start}>{mode === 'loading' ? 'Preparing…' : mode === 'playing' ? 'Pause' : mode === 'paused' ? 'Resume' : mode === 'done' ? 'Complete' : 'Play · 25 sec'}</button>
        <button onClick={restart}>Restart</button>
        <button disabled={mode === 'loading' || mode === 'manual'} onClick={takeover}>Take over</button>
        <Link href="/demo" onClick={() => timeline.current?.stop()}>Exit</Link>
      </div>
    </header>
    <div className={styles.stage} inert={mode === 'loading'} onPointerDownCapture={e => { if (!['loading', 'manual'].includes(mode) && e.isTrusted) takeover(); }} onKeyDownCapture={e => { if (!['loading', 'manual'].includes(mode) && e.key !== 'Escape') takeover(); }}>
      <DemoAppFrame wide><CalendarDemo embedded walkthroughRef={api} /></DemoAppFrame>
    </div>
    <aside className={styles.caption} aria-label="Walkthrough progress">
      <div className={styles.captionRow}><span className={styles.counter}>{Math.min(25, Math.floor(elapsed / 1000)).toString().padStart(2, '0')} / 25</span><strong role="status">{mode === 'error' ? failure : mode === 'ready' ? 'Press Play to follow Ben’s care handoff for June.' : caption}</strong><span className={styles.status}>{mode === 'done' ? `${(elapsed / 1000).toFixed(1)}s · Complete` : mode}</span></div>
      <progress aria-label="Playback time" max={25000} value={Math.min(elapsed, 25000)} />
      <small>{mode === 'error' ? 'Restart the clean preview, take over, or use the screenshot fallback.' : 'Local demonstration only. No sign-in, cross-device sync, persistence or notifications are demonstrated.'}</small>
    </aside>
  </div>;
}
