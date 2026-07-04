// Nutrition math: BMR (Mifflin–St Jeor) → TDEE → goal-adjusted calorie & macro targets.

export type Sex = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "athlete";
export type Goal = "lose" | "maintain" | "gain";
export type DietStyle = "omnivore" | "halal" | "vegetarian" | "vegan";
export type Allergen = "dairy" | "egg" | "nuts" | "gluten" | "fish";

export interface DietProfile {
  id: string; // always DIET_PROFILE_ID
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
  style: DietStyle;
  allergens: Allergen[];
  mealsPerDay: number; // 3–6
  bias?: MacroBias; // macro emphasis (default balanced)
}

export interface MacroTargets {
  kcal: number;
  protein: number; // grams/day
  carbs: number;
  fat: number;
}

/** Macro emphasis — lets marketplace plans express different valid strategies. */
export type MacroBias = "balanced" | "high-protein" | "low-carb" | "high-carb";

export interface NutritionExtras {
  fiber: number; // grams/day
  waterL: number; // litres/day
  maintenance: number; // TDEE, kcal
}

export const ACTIVITY_OPTIONS: {
  value: ActivityLevel;
  label: string;
  hint: string;
  factor: number;
}[] = [
  { value: "sedentary", label: "Sedentary", hint: "Little or no exercise", factor: 1.2 },
  { value: "light", label: "Light", hint: "1–3 days / week", factor: 1.375 },
  { value: "moderate", label: "Moderate", hint: "3–5 days / week", factor: 1.55 },
  { value: "active", label: "Active", hint: "6–7 days / week", factor: 1.725 },
  { value: "athlete", label: "Athlete", hint: "Hard daily / physical job", factor: 1.9 },
];

export const GOAL_OPTIONS: { value: Goal; label: string; hint: string }[] = [
  { value: "lose", label: "Lose fat", hint: "~20% calorie deficit" },
  { value: "maintain", label: "Maintain", hint: "Stay at your weight" },
  { value: "gain", label: "Build muscle", hint: "~12% calorie surplus" },
];

export const STYLE_OPTIONS: { value: DietStyle; label: string }[] = [
  { value: "omnivore", label: "Omnivore" },
  { value: "halal", label: "Halal" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
];

export const ALLERGEN_OPTIONS: { value: Allergen; label: string }[] = [
  { value: "dairy", label: "Dairy" },
  { value: "egg", label: "Egg" },
  { value: "nuts", label: "Nuts" },
  { value: "gluten", label: "Gluten" },
  { value: "fish", label: "Fish" },
];

const round = (n: number, to = 1) => Math.round(n / to) * to;

/** Mifflin–St Jeor basal metabolic rate. */
export function bmr(p: DietProfile): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return base + (p.sex === "male" ? 5 : -161);
}

export function tdee(p: DietProfile): number {
  const factor =
    ACTIVITY_OPTIONS.find((a) => a.value === p.activity)?.factor ?? 1.4;
  return bmr(p) * factor;
}

// Fat as a share of calories, per macro-bias (fat is also floored at 0.6 g/kg for hormones).
const FAT_PCT: Record<MacroBias, number> = {
  balanced: 0.28,
  "high-protein": 0.25,
  "low-carb": 0.4,
  "high-carb": 0.2,
};

export function macroTargets(
  p: DietProfile,
  bias: MacroBias = "balanced"
): MacroTargets {
  const maintenance = tdee(p);
  let kcal = round(
    p.goal === "lose"
      ? maintenance * 0.8
      : p.goal === "gain"
      ? // Cap the surplus in absolute terms too: ~200–400 kcal is the
        // evidence-based band; 12% of a large TDEE overshoots into fat gain.
        Math.min(maintenance * 1.12, maintenance + 400)
      : maintenance,
    10
  );
  // Never prescribe below a safe floor (protects LBM & micronutrient intake).
  const floor = Math.max(bmr(p) * 1.1, p.sex === "female" ? 1200 : 1500);
  kcal = round(Math.max(kcal, floor), 10);

  // Protein: 1.6–2.4 g/kg — 2.2 in a deficit (Helms: 2.3–3.1 g/kg FFM while cutting).
  let perKg = p.goal === "lose" ? 2.2 : p.goal === "gain" ? 1.9 : 1.7;
  if (bias === "high-protein") perKg += 0.3;
  const protein = round(Math.min(p.weightKg * perKg, p.weightKg * 2.4));

  // Fat: max of the bias share and a 0.8 g/kg hormonal floor (consensus 0.7–1.0).
  const fat = Math.max(round((kcal * FAT_PCT[bias]) / 9), round(p.weightKg * 0.8));

  // Carbs fill the remaining energy.
  const carbs = Math.max(0, round((kcal - protein * 4 - fat * 9) / 4));

  return { kcal, protein, carbs, fat };
}

export function nutritionExtras(p: DietProfile, t: MacroTargets): NutritionExtras {
  return {
    // ~14 g per 1000 kcal, floored at 25 g so low-calorie plans stay adequate.
    fiber: Math.max(25, round((14 * t.kcal) / 1000)),
    waterL: Math.round((35 * p.weightKg) / 100) / 10, // ~35 ml/kg (+~0.7 L on training days)
    maintenance: round(tdee(p), 10),
  };
}

export const DIET_PROFILE_ID = "me";
