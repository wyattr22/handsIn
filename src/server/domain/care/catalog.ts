import type { Ingredient, Recipe } from '../../../contracts/care';

/** Curated example recipes, not prescriptions or complete nutrition plans. No external recipe service. */
export const ingredients: Ingredient[] = [
  { id: 'rice', name: 'Cooked rice', allergens: [], tags: [] },
  { id: 'chicken', name: 'Cooked chicken', allergens: [], tags: ['meat'] },
  { id: 'carrot', name: 'Carrot', allergens: [], tags: [] },
  { id: 'oil', name: 'Olive oil', allergens: [], tags: [] },
  { id: 'lentil', name: 'Cooked lentils', allergens: [], tags: [] },
  { id: 'water', name: 'Water', allergens: [], tags: [] },
  { id: 'yogurt', name: 'Plain dairy yogurt', allergens: ['milk'], tags: ['dairy'] },
  { id: 'berries', name: 'Berries', allergens: [], tags: [] },
  { id: 'almond', name: 'Almonds', allergens: ['tree nuts'], tags: ['nuts'] },
];
export const recipes: Recipe[] = [
  { id: 'rice-bowl', title: 'Chicken & rice bowl', description: 'A simple meal with cooked chicken, rice and soft carrots.', servings: 2, minutes: 20,
    ingredients: [{ ingredientId: 'rice', amount: 2, unit: 'cups' }, { ingredientId: 'chicken', amount: 200, unit: 'g' }, { ingredientId: 'carrot', amount: 2, unit: 'whole' }, { ingredientId: 'oil', amount: 1, unit: 'tbsp' }],
    steps: ['Wash, peel and chop the carrots. Cook in water until tender, then drain.', 'Reheat the cooked chicken and rice thoroughly according to food-safety instructions on their packaging.', 'Divide between two bowls. Add carrots and olive oil. Adjust texture only according to the existing care plan.'] },
  { id: 'lentil-bowl', title: 'Warm lentils & vegetables', description: 'A plant-based meal using cooked lentils and carrots.', servings: 2, minutes: 20,
    ingredients: [{ ingredientId: 'lentil', amount: 2, unit: 'cups' }, { ingredientId: 'carrot', amount: 2, unit: 'whole' }, { ingredientId: 'water', amount: 1, unit: 'cups' }, { ingredientId: 'oil', amount: 1, unit: 'tbsp' }],
    steps: ['Wash, peel and chop the carrots. Simmer in the measured water until tender.', 'Add cooked lentils and heat thoroughly. Add olive oil.', 'Divide into two portions. Use only textures permitted by the care plan.'] },
  { id: 'yogurt-bowl', title: 'Yogurt & berries', description: 'A quick option containing milk. Check packaging and portion needs.', servings: 1, minutes: 5,
    ingredients: [{ ingredientId: 'yogurt', amount: 1, unit: 'cups' }, { ingredientId: 'berries', amount: 0.5, unit: 'cups' }],
    steps: ['Wash the berries. Measure the yogurt.', 'Combine and serve using the texture permitted by the care plan. Check labels for allergens and cross-contact.'] },
];
