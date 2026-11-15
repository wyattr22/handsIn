import { DEMO_HELPERS, DEMO_RECIPIENTS } from './people';
import type { CoordinationState } from '../../../contracts/coordination';
import { addLocalDays, localToInstant, parts } from '../../../server/domain/coordination/time';

/** Fictional and intentionally local-only. Never seed real health records through this adapter. */
export function makeFixtures(now: string): CoordinationState {
  const circleId = 'demo-circle';
  const zone = 'America/Los_Angeles';
  const day = parts(now, zone).slice(0, 10);
  const at = (time: string) => localToInstant(`${day}T${time}`, zone);
  return {
    recipients: structuredClone(DEMO_RECIPIENTS),
    helpers: structuredClone(DEMO_HELPERS),
    grants: ['sarah', 'ben', 'maya'].flatMap(actorId => ['r-alex', 'r-june'].map(recipientId => ({ actorId, recipientId, circleId, permissions: actorId === 'sarah' ? ['read', 'manage', 'perform'] as const : ['read', 'perform'] as const }))).map(g => ({ ...g, permissions: [...g.permissions] })),
    instructions: [{ id: 'i-walk', recipientId: 'r-june', circleId, version: 1, text: 'Fictional demo: ask June which activity she prefers. Contact the coordinator if help is needed.', current: true }],
    visits: [
      { id: 'v-visit', circleId, recipientId: 'r-alex', title: 'Doctor appointment', kind: 'appointment', start: at('10:00'), end: at('11:00'), timezone: zone, location: 'Demo clinic', provider: 'Fictional care team', notes: 'Synthetic appointment. Arrange a ride.', version: 1, canceled: false },
      { id: 'v-followup', circleId, recipientId: 'r-alex', title: 'Follow-up with Dr. Lee', kind: 'appointment', followUpOf: 'v-visit', start: addLocalDays(at('11:00'), 7, zone), end: addLocalDays(at('12:00'), 7, zone), timezone: zone, location: 'Demo clinic', provider: 'Dr. Lee (fictional)', notes: 'Bring the family’s questions.', version: 1, canceled: false },
      { id: 'v-home', circleId, recipientId: 'r-june', title: 'Family care visit', kind: 'visit', start: addLocalDays(at('14:00'), 2, zone), end: addLocalDays(at('15:00'), 2, zone), timezone: zone, location: 'June’s home (fictional)', provider: '', notes: 'Choose an activity together.', version: 1, canceled: false },
      { id: 'v-checkup', circleId, recipientId: 'r-june', title: 'Annual checkup', kind: 'appointment', start: addLocalDays(at('09:00'), 10, zone), end: addLocalDays(at('10:00'), 10, zone), timezone: zone, location: 'Demo clinic', provider: 'Fictional care team', notes: '', version: 1, canceled: false },
    ],
    tasks: [
      { id: 't-ride', circleId, recipientId: 'r-alex', title: 'Take Alex to the appointment', category: 'transport', start: at('09:30'), end: at('11:30'), timezone: zone, visitId: 'v-visit', status: 'open', version: 1 },
      { id: 't-walk', circleId, recipientId: 'r-june', title: 'An afternoon together', category: 'companionship', start: at('15:00'), end: at('16:00'), timezone: zone, instructionId: 'i-walk', instructionVersion: 1, status: 'open', version: 1 },
    ],
    assignments: [{ id: 'a-walk', taskId: 't-walk', helperId: 'ben', requestedBy: 'sarah', status: 'requested', version: 1, createdAt: now }],
    audit: [], outbox: [], receipts: [],
  };
}
