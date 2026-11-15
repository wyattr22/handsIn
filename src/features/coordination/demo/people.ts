/** Shared fictional identities from integration/cohesive-app's calendar fixture.
 * These are never Supabase auth or recipient IDs. */
export type DemoRecipient = { id: string; key: string; name: string; preferredName: string; initials: string; circleId: string; timezone: string; photoUrl: string; color: string; tint: string };
export const DEMO_RECIPIENTS: DemoRecipient[] = [
  { id: 'r-alex', key: 'alex', name: 'Alex Morgan', preferredName: 'Alex', initials: 'AM', circleId: 'demo-circle', timezone: 'America/Los_Angeles', photoUrl: '/demo-profiles/alex.svg', color: '#2f766d', tint: '#e8f3f0' },
  { id: 'r-june', key: 'june', name: 'June Morgan', preferredName: 'June', initials: 'JM', circleId: 'demo-circle', timezone: 'America/Los_Angeles', photoUrl: '/demo-profiles/june.svg', color: '#8a5d78', tint: '#f4eaf0' },
];
export const DEMO_HELPERS = [
  { id: 'sarah', name: 'Sarah Morgan', initials: 'SM', categories: ['transport', 'daily_care', 'household', 'companionship'], unavailable: [] },
  { id: 'ben', name: 'Ben Morgan', initials: 'BM', categories: ['transport', 'household', 'companionship'], unavailable: [] },
  { id: 'maya', name: 'Maya Morgan', initials: 'MM', categories: ['transport', 'daily_care', 'companionship'], unavailable: [] },
  { id: 'guest', name: 'Temporary helper', initials: 'TH', categories: ['companionship'], unavailable: [] },
  { id: 'unrelated', name: 'Unrelated account', initials: 'UA', categories: [], unavailable: [] },
];
