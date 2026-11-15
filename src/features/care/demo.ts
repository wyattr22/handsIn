import type { CareWorkspace } from '../../contracts/care';
import { makeFixtures } from '../coordination/demo/fixtures';
import { applyCare } from '../../server/domain/care/service';
import { localToInstant, parts } from '../../server/domain/coordination/time';

/** Entirely fictional, in-memory data. Source excerpts describe products, never a prescribed regimen. */
export function makeCareFixtures(now: string): CareWorkspace {
  const coordination = makeFixtures(now), zone = coordination.recipients[0].timezone;
  coordination.recipients[0].userId = 'patient-alex';
  coordination.helpers.push({ id: 'patient-alex', name: 'Alex (patient)', categories: ['meal', 'daily_care'], unavailable: [] });
  coordination.helpers.filter(h => ['sarah', 'ben', 'maya'].includes(h.id)).forEach(h => h.categories.push('meal', 'daily_care'));
  coordination.grants.push({ actorId: 'patient-alex', recipientId: 'r-alex', circleId: 'demo-circle', permissions: ['read', 'perform'] });
  let w: CareWorkspace = { coordination, meals: [], logs: [], routines: [],
    profiles: coordination.recipients.map((r, i) => ({ recipientId: r.id, version: 1, allergies: i === 0 ? ['milk'] : null, avoidIngredients: i === 0 ? [] : ['meat'], dietaryNotes: i === 0 ? 'Check package labels for milk and cross-contact.' : 'Vegetarian preference; allergy list still needs confirmation.', preferences: i === 0 ? 'Simple warm meals.' : 'Plant-based meals.', dailyMealGoal: 2, healthFactors: 'Demo only. No clinical measurements or diagnoses entered.', planSource: 'Fictional family plan — not clinically reviewed', reviewedAt: now })),
    guidance: [
      { id: 'g-rx', recipientId: 'r-alex', version: 1, product: 'Xarelto 20 mg oral tablet (fictional profile)', category: 'prescription', status: 'confirmed_demo', rule: 'with_meal', localTimes: ['18:00'], avoidIngredients: [], sourceUrl: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/022406s045lbl.pdf', sourceText: 'XARELTO 15 mg and 20 mg tablets should be taken with food.', instruction: 'This exact tablet strength requires food. The 18:00 dose time is a fictional confirmed schedule; do not infer dosing or change timing here.' },
      { id: 'g-supp', recipientId: 'r-alex', version: 1, product: 'Nature Made Vitamin D3 25 mcg (1,000 IU) tablet', category: 'supplement', status: 'confirmed_demo', rule: 'with_meal', localTimes: ['08:00'], avoidIngredients: [], sourceUrl: 'https://www.naturemade.com/products/vitamin-d3-25-mcg-1000-iu-tablets', sourceText: 'Adults, take 1 tablet daily with water and a meal.', instruction: 'Existing fictional product instructions: water and a meal. This is not a recommendation to start a supplement.' },
      { id: 'g-otc', recipientId: 'r-june', version: 1, product: 'Ibuprofen 200 mg coated oral tablet (OTC)', category: 'otc', status: 'confirmed_demo', rule: 'conditional_food', localTimes: [], avoidIngredients: [], sourceUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=dd9aaf80-6c2b-41a3-87b9-61642aaed4f0', sourceText: 'take with food or milk if stomach upset occurs', instruction: 'Food or milk instruction is conditional on stomach upset. No dose or routine schedule is created here.' },
    ] };
  let serial = 0;
  const run = (c: Parameters<typeof applyCare>[1]) => { w = applyCare(w, c, { actorId: 'sarah', now, idempotencyKey: `seed-${++serial}`, newId: () => `care-demo-${++serial}` }).workspace; };
  const day = parts(now, zone).slice(0, 10), at = (time: string) => localToInstant(`${day}T${time}`, zone);
  for (const recipientId of ['r-alex', 'r-june']) {
    for (const [time, end, recipeId, name] of [['08:00', '08:30', 'lentil-bowl', 'Breakfast'], ['18:00', '18:30', 'rice-bowl', 'Dinner']]) run({ type: 'planMeal', recipientId, start: at(time), end: at(end), recipeId: recipientId === 'r-june' ? 'lentil-bowl' : recipeId, name, servings: 1, substitutions: {} });
    run({ type: 'saveRoutine', routine: { id: '', recipientId, version: 1, title: recipientId === 'r-alex' ? 'Personal hygiene' : 'Wash & get ready', time: '09:00', weekdays: [0, 1, 2, 3, 4, 5, 6], instructions: 'Ask which hygiene tasks are wanted today. Follow the individual plan; do not assume a shower is required.', assistance: recipientId === 'r-alex' ? 'Ask before helping' : 'Offer the support June requests', source: 'Fictional family preference, not a medical order', active: true } });
    if (recipientId === 'r-alex') run({ type: 'saveRoutine', routine: { id: '', recipientId, version: 1, title: 'Skin & comfort check', time: '14:00', weekdays: [0, 1, 2, 3, 4, 5, 6], instructions: 'Demo care-plan check with consent. Describe any skin changes, sore areas or injuries factually. Record a separate observation for follow-up. Do not diagnose or stage a pressure injury.', assistance: 'Only a person authorized and comfortable helping with this check', source: 'Synthetic care-plan example — confirm a real plan with the care team', active: true } });
    run({ type: 'scheduleRoutines', recipientId, firstDay: day, days: 7 });
  }
  const breakfast = w.coordination.tasks.find(t => t.category === 'meal' && t.recipientId === 'r-alex')!;
  w.coordination.assignments.push({ id: 'meal-primary', taskId: breakfast.id, helperId: 'sarah', requestedBy: 'sarah', status: 'accepted', version: 1, createdAt: now, priority: 0 }, { id: 'meal-secondary', taskId: breakfast.id, helperId: 'ben', requestedBy: 'sarah', status: 'accepted', version: 1, createdAt: now, priority: 1 });
  return w;
}
