import type { CareWorkspace, FoodGuidance, Meal, MedicationFoodOccurrence, Recipe } from '../../../contracts/care';
import { ingredients, recipes } from './catalog';

export const unspecifiedMacros = 'No specific fat, carbohydrate, or protein amount is stated.';
export function instructionConflicts(g: FoodGuidance) {
  const conflicts = g.conflict ? [g.conflict] : [];
  if (g.patientRule && g.patientRule !== g.rule) conflicts.push('Patient and product food instructions differ.');
  if (g.patientRequirements && JSON.stringify(g.patientRequirements) !== JSON.stringify(g.requirements || [])) conflicts.push('Patient and product nutritional or food requirements differ.');
  return conflicts;
}
export function foodInstruction(g: FoodGuidance) {
  if (instructionConflicts(g).length || g.status === 'needs_review' || g.rule === 'unknown') return 'Food instructions need confirmation.';
  const requirements = g.requirements?.map(r => r.text).join(' ');
  const avoid = g.avoidIngredients.length ? ` Avoid ${g.avoidIngredients.map(id => ingredients.find(i => i.id === id)?.name.toLowerCase() || id).join(', ')}.` : '';
  const spacing = ['empty_stomach', 'separate'].includes(g.rule) && g.minutesBefore !== undefined && g.minutesAfter !== undefined ? ` No food from ${g.minutesBefore} minutes before until ${g.minutesAfter} minutes after the dose.` : '';
  return (requirements || ({ with_meal: 'Take with food or a meal.', conditional_food: g.patientInstruction || g.instruction,
    empty_stomach: 'Take on an empty stomach.', separate: g.patientInstruction || g.instruction, unknown: 'Food instructions need confirmation.' }[g.rule])
  ) + spacing + avoid;
}
export function macroInstruction(g: FoodGuidance) {
  const nutrients = g.requirements?.filter(r => r.type === 'nutrient') || [];
  return nutrients.length ? nutrients.map(r => r.type === 'nutrient' ? `${r.text}${r.minimum === undefined ? ' No minimum amount is stated.' : ` Recorded minimum: ${r.minimum} ${r.unit}.`}` : '').join(' ') : unspecifiedMacros;
}
export function doseIssues(w: CareWorkspace, dose: MedicationFoodOccurrence) {
  const g = w.guidance.find(g => g.id === dose.guidanceId && g.recipientId === dose.recipientId);
  const issues: string[] = [];
  if (dose.status !== 'confirmed' || !Number.isFinite(Date.parse(dose.at))) issues.push('The medication occurrence is not confirmed.');
  if (!g || !['confirmed', 'confirmed_demo'].includes(g.status) || g.rule === 'unknown') issues.push('Food instructions need confirmation.');
  if (!g?.sourceUrl.startsWith('https://') || !g.sourceText || !g.sourceVersion || !g.reviewedAt || !Number.isFinite(Date.parse(g.reviewedAt))) issues.push('Reviewed product source details are unavailable.');
  if (g?.version !== dose.guidanceVersion) issues.push('Medication instructions changed. Confirm the dose link again with the medication module.');
  if (!g?.productIdentity || !['ingredient', 'strength', 'form', 'route'].every(key => g.productIdentity![key as keyof typeof g.productIdentity] === dose.productIdentity[key as keyof typeof dose.productIdentity])) issues.push('The exact medication product does not match the reviewed source.');
  if (g && instructionConflicts(g).length) issues.push(`Conflicting instructions: ${instructionConflicts(g).join(' ')} Ask the pharmacist or prescriber to confirm.`);
  return issues;
}
export function linkedDoses(w: CareWorkspace, meal: Meal) { return (meal.medicationOccurrenceIds || []).map(id => w.medicationOccurrences?.find(d => d.id === id)); }

/** Numerical claims require verified quantity- and unit-compatible data for every ingredient. */
export function recipeNutrition(recipe: Recipe, servings: number, substitutions: Record<string, string>) {
  const total = { fat: 0, carbohydrate: 0, protein: 0, energy: 0 };
  for (const entry of recipe.ingredients) {
    const item = ingredients.find(i => i.id === (substitutions[entry.ingredientId] || entry.ingredientId));
    const n = item?.nutrition;
    if (!n || !n.verified || !n.sourceUrl || !n.version || n.basisUnit !== entry.unit || !Number.isFinite(n.basisAmount) || n.basisAmount <= 0 || Object.keys(total).some(key => !Number.isFinite(n[key as keyof typeof total]) || n[key as keyof typeof total] < 0)) return undefined;
    for (const key of Object.keys(total) as (keyof typeof total)[]) total[key] += n[key] * entry.amount * servings / recipe.servings / n.basisAmount;
  }
  return total;
}
export function requirementIssues(w: CareWorkspace, meal: Meal) {
  const blocked: string[] = [], review: string[] = [], notes: string[] = [];
  const t = w.coordination.tasks.find(t => t.id === meal.taskId), recipe = recipes.find(r => r.id === meal.recipeId);
  const foods = recipe?.ingredients.map(i => meal.substitutions[i.ingredientId] || i.ingredientId) || [];
  const nutrition = recipe && recipeNutrition(recipe, meal.servings, meal.substitutions);
  for (const dose of linkedDoses(w, meal)) {
    if (!dose || dose.recipientId !== t?.recipientId) { review.push('A linked medication occurrence is unavailable.'); continue; }
    const problems = doseIssues(w, dose); review.push(...problems);
    if (problems.length) continue;
    const g = w.guidance.find(g => g.id === dose.guidanceId);
    if (!g) continue;
    if (t && ['with_meal', 'conditional_food'].includes(g.rule) && Date.parse(t.start) !== Date.parse(dose.at)) review.push(`${g.product}: meal time changed. Confirm the meal-to-dose timing; no extra food window is assumed.`);
    if (g.rule === 'empty_stomach' && t && Date.parse(t.start) <= Date.parse(dose.at) && Date.parse(t.end) > Date.parse(dose.at)) blocked.push(`${g.product}: a meal at this dose time conflicts with the empty-stomach instruction.`);
    for (const r of g.requirements || []) {
      if (r.type === 'nutrient') {
        const correctUnit = r.nutrient === 'energy' ? r.unit === 'kcal' : r.unit === 'g';
        if (!correctUnit || (r.minimum !== undefined && (!Number.isFinite(r.minimum) || r.minimum < 0))) { review.push(`${g.product}: the nutritional instruction needs confirmation.`); continue; }
        if (r.minimum !== undefined) {
          if (!nutrition) review.push(`${g.product}: ${r.minimum} ${r.unit} ${r.nutrient} requires verified recipe nutrition; suitability is unconfirmed.`);
          else if (nutrition[r.nutrient] + 1e-9 < r.minimum) blocked.push(`${g.product}: planned portion does not meet the recorded ${r.nutrient} minimum.`);
          else notes.push(`Planned portion meets the recorded ${r.nutrient} minimum using sourced quantities. Actual intake is not confirmed.`);
        } else if (!r.foodExamples?.some(id => foods.includes(id))) review.push(`${g.product}: confirm this recipe meets the ${r.nutrient} food requirement. No amount is invented.`);
      } else {
        const present = r.type === 'drink' ? meal.drinks || [] : foods;
        if (!r.ingredientIds.length || !r.ingredientIds.some(id => present.includes(id))) review.push(`${g.product}: ${r.text} The planned ${r.type} has not been confirmed.`);
      }
    }
  }
  return { blocked, review, notes };
}
/** One candidate first; never returns an unsafe candidate merely to fill the screen. */
export function rankRecipes(w: CareWorkspace, meal: Meal, check: (w: CareWorkspace, m: Meal) => { blocked: string[]; review: string[] }) {
  return recipes.map(recipe => {
    const assessment = check(w, { ...meal, recipeId: recipe.id, substitutions: {} });
    const p = w.profiles.find(p => p.recipientId === w.coordination.tasks.find(t => t.id === meal.taskId)?.recipientId);
    const preference = p?.preferences.toLowerCase().includes('plant') && !recipe.ingredients.some(i => ingredients.find(x => x.id === i.ingredientId)?.tags.includes('meat')) ? 1 : 0;
    return { recipe, assessment, score: assessment.review.length * 100 + recipe.minutes - preference * 5 };
  }).filter(r => !r.assessment.blocked.length).sort((a, b) => a.score - b.score);
}
