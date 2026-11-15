// Fictional local preview only. These functions are not production authorization.
export const categories = ['medications', 'tasks', 'meals', 'care', 'health'] as const;
export type Category = typeof categories[number];
export const categoryNames: Record<Category, string> = { medications: 'Medications', tasks: 'Scheduling & tasks', meals: 'Meals', care: 'Daily care & notes', health: 'Health reports' };
export type Tier = 0 | 1 | 2 | 3;
export const tierNames = ['No family access', 'Medication & scheduling', 'Meals & daily care', 'Full access'];
export interface Access { tier: Tier; overrides?: Partial<Record<Category, boolean>> }
export interface Person { id: string; name: string; initials: string; color: string; title: string; admin: boolean; owner?: boolean; temporary?: boolean; email: string; access: Record<string, Access>; bio: string }
export interface Group { id: string; name: string; description: string; members: string[]; start: string; end: string; approved: boolean; overrides: Record<string, Access> }
export interface Task { id: string; recipient: string; title: string; detail: string; category: Category; assignee: string; time: string; group: string; status: 'requested' | 'accepted' | 'completed' | 'declined'; outcome?: string }
export function includesCategory(access: Access, category: Category) {
  if (access.tier === 0) return false;
  return access.overrides?.[category] ?? (category === 'health' ? access.tier >= 3 : category === 'meals' || category === 'care' ? access.tier >= 2 : access.tier >= 1);
}
export function effectiveAccess(person: Person, recipient: string, groups: Group[], now: Date): Access {
  const active = recipient === 'grandma' ? groups.filter(g => g.approved && g.members.includes(person.id) && g.overrides[person.id] && new Date(g.start) <= now && now < new Date(g.end)).map(g => g.overrides[person.id]) : [];
  if (!active.length) return person.access[recipient] || { tier: 0 };
  const tier = Math.max(...active.map(a => a.tier)) as Tier;
  // Active temporary grants replace regular access; overlapping grants combine by strongest category permission.
  const overrides = Object.fromEntries(categories.map(category => [category, active.some(a => includesCategory(a, category))]));
  return { tier, overrides };
}
export function canSeeTask(person: Person, task: Task, groups: Group[], now: Date) {
  if (!includesCategory(effectiveAccess(person, task.recipient, groups, now), task.category)) return false;
  return task.group === 'family' || !!groups.find(g => g.id === task.group && g.approved && g.members.includes(person.id));
}
export function canRespond(person: Person, task: Task) { return person.id === task.assignee && task.status === 'requested'; }
export const recipients = [{ id: 'grandma', name: 'Margaret', label: 'Grandma', initials: 'MJ', color: 'rose' }, { id: 'grandpa', name: 'Robert', label: 'Grandpa', initials: 'RJ', color: 'blue' }];
export function initialPeople(): Person[] { return [
  { id: 'sarah', name: 'Sarah Johnson', initials: 'SJ', color: 'rose', title: 'Owner', owner: true, admin: true, email: 'sarah@example.test', access: { grandma: { tier: 3 }, grandpa: { tier: 3 } }, bio: 'Brings the family together. Coordinates appointments and makes sure every visit has a plan.' },
  { id: 'james', name: 'James Johnson', initials: 'JJ', color: 'blue', title: 'Family helper', admin: false, email: 'james@example.test', access: { grandma: { tier: 2 }, grandpa: { tier: 1 } }, bio: 'Happy to help with meals, pharmacy pickups, and a good afternoon walk.' },
  { id: 'lena', name: 'Lena Chen', initials: 'LC', color: 'gold', title: 'Admin', admin: true, email: 'lena@example.test', access: { grandma: { tier: 3 }, grandpa: { tier: 2 } }, bio: 'Keeps the weekly routine running and checks in with the whole circle.' },
  { id: 'margaret', name: 'Margaret Johnson', initials: 'MJ', color: 'green', title: 'Care recipient', admin: false, email: 'margaret@example.test', access: { grandma: { tier: 3 }, grandpa: { tier: 0 } }, bio: 'Loves gardening, Sunday lunch, and having a say in her own care.' },
  { id: 'maya', name: 'Maya Patel', initials: 'MP', color: 'purple', title: 'Temporary caregiver', temporary: true, admin: false, email: 'maya@example.test', access: { grandma: { tier: 0 }, grandpa: { tier: 0 } }, bio: 'Helping during Grandma’s vacation. Access is limited to the care needed for this visit.' },
]; }
export function initialGroups(now = new Date()): Group[] { const start = new Date(now); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 5); return [{ id: 'vacation', name: 'Grandma vacation', description: 'A little change of scenery, with everyone in the loop.', members: ['sarah', 'james', 'maya'], start: start.toISOString(), end: end.toISOString(), approved: true, overrides: { maya: { tier: 1 }, james: { tier: 2 } } }]; }
export function initialTasks(): Task[] { return [
  { id: 't1', recipient: 'grandma', title: 'Morning medication check-in', detail: 'Review the existing medication list and record what happened. Follow reviewed instructions; never guess a dose.', category: 'medications', assignee: 'maya', time: '8:00 AM', group: 'vacation', status: 'requested' },
  { id: 't2', recipient: 'grandma', title: 'Make lunch together', detail: 'Margaret would love some company at lunch. Check her recorded preferences before preparing food.', category: 'meals', assignee: 'james', time: '12:00 PM', group: 'family', status: 'requested' },
  { id: 't3', recipient: 'grandma', title: 'A walk in the garden', detail: 'A relaxed afternoon outside, following Margaret’s current care instructions.', category: 'care', assignee: 'lena', time: '2:30 PM', group: 'family', status: 'accepted' },
  { id: 't4', recipient: 'grandma', title: 'Review new blood test report', detail: 'Read the fictional uploaded report and prepare questions for the next appointment.', category: 'health', assignee: 'sarah', time: '4:00 PM', group: 'family', status: 'accepted' },
  { id: 't5', recipient: 'grandma', title: 'Confirm tomorrow’s pickup', detail: 'Check the vacation pickup time and share an update with vacation participants only.', category: 'tasks', assignee: 'james', time: '5:00 PM', group: 'vacation', status: 'accepted' },
  { id: 't6', recipient: 'grandpa', title: 'Drive Robert to his appointment', detail: 'Confirm transport and meeting time with Robert.', category: 'tasks', assignee: 'james', time: '10:00 AM', group: 'family', status: 'requested' },
  { id: 't7', recipient: 'grandma', title: 'Record my morning medication', detail: 'Record a self-reported outcome against an existing medication. This does not add a prescription or change a schedule.', category: 'medications', assignee: 'margaret', time: '8:00 AM', group: 'family', status: 'accepted' },
]; }
