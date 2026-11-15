import type { CareWorkspace, Meal } from '../../../contracts/care';
import { ingredients, recipes } from './catalog';
import { localToInstant, parts } from '../coordination/time';

export function mealFingerprint(w: CareWorkspace, meal: Meal) {
  const t = w.coordination.tasks.find(t => t.id === meal.taskId);
  return JSON.stringify([t?.recipientId, t?.start, t?.end, t?.instructionVersion,
    w.profiles.find(p => p.recipientId === t?.recipientId),
    w.guidance.filter(g => g.recipientId === t?.recipientId), recipes.find(r => r.id === meal.recipeId), meal.servings, meal.substitutions]);
}
export function checkMeal(w: CareWorkspace, meal: Meal): { blocked: string[]; review: string[]; notes: string[]; fingerprint: string } {
  const blocked: string[] = [], review: string[] = [], notes: string[] = [];
  const t = w.coordination.tasks.find(t => t.id === meal.taskId);
  const p = w.profiles.find(p => p.recipientId === t?.recipientId);
  const recipe = recipes.find(r => r.id === meal.recipeId);
  if (!t || !p) review.push('Care profile is unavailable.');
  if (!p || p.allergies === null) review.push('Allergy information has not been confirmed.');
  const knownNames = new Set(ingredients.flatMap(i => [i.id, i.name.toLowerCase(), ...i.allergens, ...i.tags]));
  if (p?.allergies?.some(a => !knownNames.has(a.toLowerCase()))) review.push('Some recorded allergies are outside the ingredient catalog. Manual label review is required.');
  if (p?.avoidIngredients.some(a => !knownNames.has(a.toLowerCase()))) review.push('Some dietary restrictions cannot be checked automatically. Review the care plan.');
  if (!recipe) review.push('Custom food has not been ingredient-screened. Review its ingredients and packaging.');
  const selected = recipe?.ingredients.map(i => ingredients.find(x => x.id === (meal.substitutions[i.ingredientId] || i.ingredientId))) || [];
  for (const i of selected) {
    if (!i) { review.push('An ingredient is unknown.'); continue; }
    const allergies = p?.allergies?.map(a => a.toLowerCase()) || [];
    if ([...i.allergens, ...i.tags].some(a => allergies.includes(a)) || allergies.includes(i.id) || allergies.includes(i.name.toLowerCase())) blocked.push(`${i.name}: recorded allergy conflict.`);
    if (p?.avoidIngredients.some(a => a.toLowerCase() === i.id || i.tags.includes(a.toLowerCase()))) blocked.push(`${i.name}: dietary restriction conflict.`);
  }
  const list = w.guidance.filter(g => g.recipientId === t?.recipientId);
  if (!list.length) review.push('Medication, OTC and supplement food instructions are unavailable.');
  for (const g of list) {
    if (g.status !== 'confirmed_demo' || g.rule === 'unknown') review.push(`${g.product}: food instructions need review.`);
    if (selected.some(i => i && g.avoidIngredients.includes(i.id))) blocked.push(`${g.product}: listed food conflict.`);
    notes.push(`${g.product}: ${g.instruction}`);
    if ((g.rule === 'empty_stomach' || g.rule === 'separate') && t) {
      if (g.minutesBefore === undefined || g.minutesAfter === undefined || !g.localTimes.length) review.push(`${g.product}: confirmed timing details are missing.`);
      else {
        const day = parts(t.start, t.timezone).slice(0, 10);
        // Include adjacent dates so a late-night dose is checked against early-morning food.
        for (const offset of [-1, 0, 1]) for (const time of g.localTimes) {
          const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset);
          try {
            const dose = Date.parse(localToInstant(`${d.toISOString().slice(0, 10)}T${time}`, t.timezone));
            if (Date.parse(t.start) < dose + g.minutesAfter * 60000 && Date.parse(t.end) > dose - g.minutesBefore * 60000) blocked.push(`${g.product}: meal overlaps the confirmed food-separation window.`);
          } catch { review.push(`${g.product}: dose time needs review because of a clock change.`); }
        }
      }
    }
    if (g.rule === 'with_meal' && t) {
      const local = parts(t.start, t.timezone).slice(11, 16);
      if (!g.localTimes.includes(local)) review.push(`${g.product}: confirm this meal covers the prescribed dose time. Do not change medication timing here.`);
    }
  }
  review.push('Full drug/food and supplement interaction checking is not connected. A matching recipe is not an interaction clearance.');
  return { blocked: [...new Set(blocked)], review: [...new Set(review)], notes, fingerprint: mealFingerprint(w, meal) };
}
export function shoppingList(w: CareWorkspace, recipientId: string, day: string) {
  const totals = new Map<string, { name: string; amount: number; unit: string }>();
  for (const m of w.meals) {
    const t = w.coordination.tasks.find(t => t.id === m.taskId && t.recipientId === recipientId && t.status !== 'canceled' && parts(t.start, t.timezone).startsWith(day));
    const r = recipes.find(r => r.id === m.recipeId);
    if (!t || !r) continue;
    for (const i of r.ingredients) {
      const item = ingredients.find(x => x.id === (m.substitutions[i.ingredientId] || i.ingredientId));
      if (!item) continue;
      const key = `${item.id}:${i.unit}`, old = totals.get(key);
      totals.set(key, { name: item.name, amount: (old?.amount || 0) + i.amount * m.servings / r.servings, unit: i.unit });
    }
  }
  return [...totals.values()];
}
