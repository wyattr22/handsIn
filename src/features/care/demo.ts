import type { CareWorkspace } from '../../contracts/care';
import { makeFixtures } from '../coordination/demo/fixtures';
import { applyCare } from '../../server/domain/care/service';
import { addLocalDays, localToInstant, parts } from '../../server/domain/coordination/time';

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
  const identities = [
    { ingredient: 'rivaroxaban', strength: '20 mg', form: 'tablet', route: 'oral' },
    { ingredient: 'vitamin D3', strength: '25 mcg (1000 IU)', form: 'tablet', route: 'oral' },
    { ingredient: 'ibuprofen', strength: '200 mg', form: 'coated tablet', route: 'oral' },
  ];
  w.guidance.forEach((g, i) => { g.productIdentity = identities[i]; g.sourceVersion = 'Product source checked 2026-11-15'; g.reviewedAt = now; });
  w.guidance[0].instruction = 'Take with food.';
  w.guidance[1].instruction = 'Take with water and a meal.';
  w.guidance[1].requirements = [{ type: 'drink', ingredientIds: ['water'], text: 'Take with water and a meal.' }];
  w.guidance[2].patientInstruction = 'Take with food or milk if stomach upset occurs.';
  w.guidance.push({ id: 'g-fat', recipientId: 'r-june', version: 1, product: 'Kalydeco 150 mg oral tablet', category: 'prescription', status: 'confirmed_demo', rule: 'with_meal', localTimes: ['09:00', '21:00'], avoidIngredients: ['grapefruit'], sourceUrl: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/203188s044lbl.pdf', sourceText: 'Administer KALYDECO tablets or oral granules with fat-containing food.', sourceVersion: 'FDA label, Reference ID 5764298, 2026', reviewedAt: now, instruction: 'Take with food containing fat. Avoid grapefruit food and drink.', productIdentity: { ingredient: 'ivacaftor', strength: '150 mg', form: 'tablet', route: 'oral' }, requirements: [{ type: 'nutrient', nutrient: 'fat', unit: 'g', text: 'Take with food containing fat.', foodExamples: ['egg', 'yogurt'] }] });
  w.medicationOccurrences = [];
  // Synthetic adapter output for already-confirmed schedules. Never derive a real regimen from a label.
  for (let offset = 0; offset < 7; offset++) for (const g of w.guidance.filter(g => g.localTimes.length)) for (const time of g.localTimes) {
    const dose = { id: `demo-dose-${g.id}-${offset}-${time}`, medicationId: `demo-med-${g.id}`, recipientId: g.recipientId, guidanceId: g.id, guidanceVersion: g.version, version: 1, at: addLocalDays(at(time), offset, zone), timezone: zone, status: 'confirmed' as const, productIdentity: { ...g.productIdentity! } };
    w.medicationOccurrences.push(dose);
    w.coordination.tasks.push({ id: `calendar-${dose.id}`, circleId: 'demo-circle', recipientId: dose.recipientId, title: g.product, category: 'medication', medicationOccurrenceId: dose.id, start: dose.at, end: new Date(Date.parse(dose.at) + 15 * 60000).toISOString(), timezone: zone, status: 'open', version: 1 });
  }
  for (const recipientId of ['r-alex', 'r-june']) {
    for (const [time, end, recipeId, name] of recipientId === 'r-june' ? [['09:00', '09:30', 'egg-rice', 'Late breakfast'], ['21:00', '21:30', 'egg-rice', 'Evening snack']] : [['08:00', '08:30', 'lentil-bowl', 'Breakfast'], ['18:00', '18:30', 'rice-bowl', 'Dinner']]) {
      const doses = w.medicationOccurrences!.filter(d => d.recipientId === recipientId && d.at === at(time));
      run({ type: 'planMeal', recipientId, start: at(time), end: at(end), recipeId, name, servings: 1, substitutions: {}, drinks: recipientId === 'r-alex' && time === '08:00' ? ['water'] : [], medicationOccurrenceIds: doses.map(d => d.id), expectedDoseVersions: Object.fromEntries(doses.map(d => [d.id, d.version])) });
    }
    run({ type: 'saveRoutine', routine: { id: '', recipientId, version: 1, title: recipientId === 'r-alex' ? 'Personal hygiene' : 'Wash & get ready', time: recipientId === 'r-alex' ? '09:00' : '07:30', weekdays: [0, 1, 2, 3, 4, 5, 6], instructions: 'Ask which hygiene tasks are wanted today. Follow the individual plan; do not assume a shower is required.', assistance: recipientId === 'r-alex' ? 'Ask before helping' : 'Offer the support June requests', source: 'Fictional family preference, not a medical order', active: true } });
    if (recipientId === 'r-june') run({ type: 'saveRoutine', routine: { id: '', recipientId, version: 1, title: 'Tend the porch garden & bird feeder', time: '10:30', weekdays: [0, 1, 2, 3, 4, 5, 6], instructions: 'Ask June whether she would like to water the planters, refill the bird feeder, or sit outside and identify visiting birds. Bring the lightweight watering can and allow rest breaks.', assistance: 'Set out supplies; June chooses the activity and pace', source: 'Fictional personal preference, not a medical order', active: true } });
    if (recipientId === 'r-alex') run({ type: 'saveRoutine', routine: { id: '', recipientId, version: 1, title: 'Skin & comfort check', time: '14:00', weekdays: [0, 1, 2, 3, 4, 5, 6], instructions: 'Demo care-plan check with consent. Describe any skin changes, sore areas or injuries factually. Record a separate observation for follow-up. Do not diagnose or stage a pressure injury.', assistance: 'Only a person authorized and comfortable helping with this check', source: 'Synthetic care-plan example — confirm a real plan with the care team', active: true } });
    run({ type: 'scheduleRoutines', recipientId, firstDay: day, days: 7 });
  }
  const breakfast = w.coordination.tasks.find(t => t.category === 'meal' && t.recipientId === 'r-alex')!;
  w.coordination.assignments.push({ id: 'meal-primary', taskId: breakfast.id, helperId: 'sarah', requestedBy: 'sarah', status: 'accepted', version: 1, createdAt: now, priority: 0 }, { id: 'meal-secondary', taskId: breakfast.id, helperId: 'ben', requestedBy: 'sarah', status: 'accepted', version: 1, createdAt: now, priority: 1 });
  return w;
}
