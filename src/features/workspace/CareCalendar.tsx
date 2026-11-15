'use client';
import type {CareRecord} from './records';
import {localDate} from './records';
import styles from './trial.module.css';
export type CalendarMode='day'|'week'|'month';
export function calendarBounds(date:string,mode:CalendarMode){
 const start=new Date(date+'T00:00:00'),end=new Date(start);
 if(mode==='week'){start.setDate(start.getDate()-start.getDay());end.setTime(start.getTime());end.setDate(end.getDate()+7);}
 else if(mode==='month'){start.setDate(1);end.setMonth(end.getMonth()+1,1);}
 else end.setDate(end.getDate()+1);
 return {start,end};
}
export function inCalendar(row:CareRecord,date:string,mode:CalendarMode){if(!row.starts_at)return false;const {start,end}=calendarBounds(date,mode);const time=new Date(row.starts_at);return time>=start&&time<end;}
export default function CareCalendar({rows,date,mode,onDate,onMode}:{rows:CareRecord[];date:string;mode:CalendarMode;onDate:(d:string)=>void;onMode:(m:CalendarMode)=>void}){
 const {start,end}=calendarBounds(date,mode);
 const monthStart=new Date(date+'T12:00:00');monthStart.setDate(1);const gridStart=new Date(monthStart);gridStart.setDate(1-monthStart.getDay());
 const days=Array.from({length:mode==='month'?42:mode==='week'?7:1},(_,i)=>{const day=new Date(mode==='month'?gridStart:start);day.setDate(day.getDate()+i);return day;});
 function move(direction:number){const next=new Date(date+'T12:00:00');if(mode==='month'){next.setDate(1);next.setMonth(next.getMonth()+direction);}else next.setDate(next.getDate()+direction*(mode==='week'?7:1));onDate(localDate(next));}
 return <section className={styles.calendar} aria-label="Care calendar"><div className={styles.heading}><div><h2>{new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}).format(start)}</h2><p className={styles.muted}>Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}</p></div><div className={styles.segmented} aria-label="Calendar view">{(['day','week','month'] as CalendarMode[]).map(m=><button key={m} aria-pressed={mode===m} onClick={()=>onMode(m)}>{m[0].toUpperCase()+m.slice(1)}</button>)}</div></div>
 <div className={styles.calendarControls}><button aria-label="Previous period" onClick={()=>move(-1)}>←</button><button onClick={()=>onDate(localDate(new Date()))}>Today</button><button aria-label="Next period" onClick={()=>move(1)}>→</button><label>Go to date<input type="date" value={date} onChange={e=>{if(e.target.value)onDate(e.target.value);}}/></label></div>
 {mode!=='day'&&<div className={styles.calendarGrid}>{days.map(day=>{const key=localDate(day),items=rows.filter(r=>r.starts_at&&localDate(new Date(r.starts_at))===key&&r.status!=='canceled');return <button key={key} className={day.getMonth()!==monthStart.getMonth()?styles.outsideMonth:''} aria-label={`${day.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}, ${items.length} scheduled`} aria-pressed={date===key} onClick={()=>{onDate(key);onMode('day');}}><span>{day.toLocaleDateString(undefined,{weekday:'short'})}</span><strong>{day.getDate()}</strong>{items.slice(0,2).map(r=><small key={r.id}>{r.content?.title}</small>)}{items.length>2&&<small>+{items.length-2} more</small>}</button>;})}</div>}
 <p className={styles.muted}>{mode==='day'?start.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}):`Agenda for ${start.toLocaleDateString()} – ${new Date(end.getTime()-1).toLocaleDateString()}`}</p></section>;
}

