/** Shared fictional identities from integration/cohesive-app's calendar fixture.
 * These are never Supabase auth or recipient IDs. */
export const DEMO_RECIPIENTS = [
  { id: 'r-alex', key: 'alex', name: 'Alex Morgan', preferredName: 'Alex', initials: 'AM', circleId: 'demo-circle', timezone: 'America/Los_Angeles' },
  { id: 'r-june', key: 'june', name: 'June Morgan', preferredName: 'June', initials: 'JM', circleId: 'demo-circle', timezone: 'America/Los_Angeles' },
];
export const DEMO_HELPERS = [
  { id: 'sarah', name: 'Sarah Morgan', initials: 'SM', categories: ['transport', 'daily_care', 'household', 'companionship'], unavailable: [] },
  { id: 'ben', name: 'Ben Morgan', initials: 'BM', categories: ['transport', 'household', 'companionship'], unavailable: [] },
  { id: 'maya', name: 'Maya Morgan', initials: 'MM', categories: ['transport', 'daily_care', 'companionship'], unavailable: [] },
  { id: 'guest', name: 'Temporary helper', initials: 'TH', categories: ['companionship'], unavailable: [] },
  { id: 'unrelated', name: 'Unrelated account', initials: 'UA', categories: [], unavailable: [] },
];
