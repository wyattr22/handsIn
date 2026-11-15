import type { CareSource, CoordinationState, MutationContext } from './coordination';

export interface CareProfile {
  recipientId: string; version: number; allergies: string[] | null; avoidIngredients: string[];
  dietaryNotes: string; preferences: string; dailyMealGoal: number;
  sex?: string; heightCm?: number; weightKg?: number; healthFactors: string;
  planSource: string; reviewedAt: string;
}
export interface FoodGuidance {
  id: string; recipientId: string; version: number; product: string; category: 'prescription' | 'otc' | 'supplement';
  status: 'confirmed_demo' | 'needs_review'; sourceUrl: string; sourceText: string;
  rule: 'with_meal' | 'conditional_food' | 'empty_stomach' | 'separate' | 'unknown';
  avoidIngredients: string[]; minutesBefore?: number; minutesAfter?: number; localTimes: string[];
  instruction: string;
}
export interface Ingredient { id: string; name: string; allergens: string[]; tags: string[] }
export interface Recipe {
  id: string; title: string; description: string; servings: number; minutes: number;
  ingredients: { ingredientId: string; amount: number; unit: string }[]; steps: string[];
}
export interface Meal {
  id: string; taskId: string; version: number; recipeId?: string; name: string; servings: number;
  substitutions: Record<string, string>; reviewedFingerprint?: string;
}
export interface CareLog {
  id: string; taskId: string; actorId: string; at: string; observedAt: string; source: CareSource;
  stage: 'prepared' | 'offered' | 'consumed' | 'completed' | 'declined' | 'needs_help';
  amount?: 'none' | 'some' | 'most' | 'all'; note: string; supersedesId?: string; reason?: string;
}
export interface Routine {
  id: string; recipientId: string; version: number; title: string; time: string;
  weekdays: number[]; instructions: string; source: string; assistance: string; active: boolean;
}
export interface CareWorkspace {
  coordination: CoordinationState; profiles: CareProfile[]; guidance: FoodGuidance[];
  meals: Meal[]; logs: CareLog[]; routines: Routine[];
}
export type CareCommand =
  | { type: 'planMeal'; recipientId: string; start: string; end: string; name: string; recipeId?: string; servings: number; substitutions: Record<string, string> }
  | { type: 'reviewMeal'; mealId: string; expectedVersion: number; fingerprint: string }
  | { type: 'saveProfile'; profile: CareProfile; expectedVersion: number }
  | { type: 'record'; taskId: string; expectedVersion: number; stage: CareLog['stage']; amount?: CareLog['amount']; source: CareSource; observedAt: string; note: string; correctsId?: string; reason?: string }
  | { type: 'saveRoutine'; routine: Routine; expectedVersion?: number }
  | { type: 'scheduleRoutines'; recipientId: string; firstDay: string; days: number }
  | { type: 'observe'; recipientId: string; taskId?: string; kind: 'skin_change' | 'injury' | 'other'; location: string; description: string; source: CareSource; observedAt: string }
  | { type: 'followUp'; observationId: string; expectedVersion: number; status: 'acknowledged' | 'resolved'; note: string };

/** Host supplies verified identity and an atomic transaction; never accept actor/grants from request JSON. */
export interface CareRepository { transaction<T>(actorId: string, work: (workspace: CareWorkspace) => T): Promise<T> }
export interface CareClient { getView(): Promise<CareWorkspace>; mutate(command: CareCommand, key: string): Promise<string> }
export interface MedicationFoodPort { getConfirmedGuidance(recipientId: string): Promise<FoodGuidance[]>; interactionsAvailable: boolean }
export interface CareNotificationPort { dispatch(eventId: string): Promise<void> }
export type CareContext = MutationContext;
