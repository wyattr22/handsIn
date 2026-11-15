'use client';
import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import styles from './calendar.module.css';
export default function CalendarDialog({ title, close, children, walkthrough = false, context }: { title: string; close: () => void; children: ReactNode; walkthrough?: boolean; context?: string }) {
  const ref = useRef<HTMLDivElement>(null), id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; ref.current?.focus();
    return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div className={styles.overlay} data-walkthrough={walkthrough || undefined}><section ref={ref} className={styles.dialog} tabIndex={-1} role="dialog" aria-modal={!walkthrough} aria-labelledby={id} onKeyDown={e => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key === 'Tab' && !walkthrough) {
      const controls = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),a[href]') || []);
      if (e.shiftKey && (document.activeElement === controls[0] || document.activeElement === ref.current)) { e.preventDefault(); controls.at(-1)?.focus(); }
      else if (!e.shiftKey && document.activeElement === controls.at(-1)) { e.preventDefault(); controls[0]?.focus(); }
    }
  }}><div data-eros={walkthrough ? 'dialog-heading' : undefined} className={styles.dialogHeading}><div><h2 id={id}>{title}</h2>{context && <p data-eros="task-status">{context}</p>}</div><button type="button" onClick={close} aria-label="Close dialog">Close <span aria-hidden="true">×</span></button></div>{children}</section></div>;
}

