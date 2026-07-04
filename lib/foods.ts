// Iranian, budget-friendly food database + deterministic meal generator + supplement advice.
// Affordable staples (rice, bread, legumes, eggs, dairy, seasonal veg). Macros per serving.
// Not AI-driven — a fixed dataset (sources: USDA + standard Iranian food composition).

import type {
  Allergen,
  DietProfile,
  DietStyle,
  MacroTargets,
} from "./nutrition";

export type FoodTag = "meat" | "fish" | "dairy" | "egg" | "nuts" | "gluten";
export type FoodCat = "protein" | "carb" | "veg" | "fruit" | "fat" | "dairy" | "snack";

export interface Food {
  id: string;
  name: string; // English
  nameFa: string; // Persian
  cat: FoodCat;
  serving: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: FoodTag[];
  vegetarian: boolean;
  vegan: boolean;
}

// prettier-ignore
export const FOODS: Food[] = [
  // Carbs (cheap staples)
  { id: "rice", name: "White rice", nameFa: "برنج سفید", cat: "carb", serving: "۱۵۰ گرم", kcal: 195, protein: 4, carbs: 42, fat: 0.4, tags: [], vegetarian: true, vegan: true },
  { id: "basmati", name: "Basmati rice", nameFa: "برنج باسماتی", cat: "carb", serving: "۱۵۰ گرم", kcal: 190, protein: 4, carbs: 41, fat: 0.5, tags: [], vegetarian: true, vegan: true },
  { id: "barbari", name: "Nan barbari", nameFa: "نان بربری", cat: "carb", serving: "۱۰۰ گرم", kcal: 270, protein: 9, carbs: 54, fat: 1.5, tags: ["gluten"], vegetarian: true, vegan: true },
  { id: "sangak", name: "Sangak", nameFa: "نان سنگک", cat: "carb", serving: "۱۰۰ گرم", kcal: 250, protein: 9, carbs: 51, fat: 1.2, tags: ["gluten"], vegetarian: true, vegan: true },
  { id: "lavash", name: "Lavash", nameFa: "نان لواش", cat: "carb", serving: "۶۰ گرم", kcal: 165, protein: 5, carbs: 34, fat: 0.8, tags: ["gluten"], vegetarian: true, vegan: true },
  { id: "taftoon", name: "Taftoon", nameFa: "نان تافتون", cat: "carb", serving: "۸۰ گرم", kcal: 215, protein: 7, carbs: 44, fat: 1.2, tags: ["gluten"], vegetarian: true, vegan: true },
  { id: "potato", name: "Potato", nameFa: "سیب‌زمینی", cat: "carb", serving: "۱۵۰ گرم", kcal: 130, protein: 3, carbs: 30, fat: 0.2, tags: [], vegetarian: true, vegan: true },
  { id: "oats", name: "Oats", nameFa: "جو دوسر", cat: "carb", serving: "۴۰ گرم", kcal: 152, protein: 5, carbs: 26, fat: 2.7, tags: ["gluten"], vegetarian: true, vegan: true },

  // Proteins (legumes = cheapest)
  { id: "lentils", name: "Lentils", nameFa: "عدس", cat: "protein", serving: "۱۵۰ گرم", kcal: 175, protein: 14, carbs: 30, fat: 0.6, tags: [], vegetarian: true, vegan: true },
  { id: "adasi", name: "Adasi", nameFa: "عدسی", cat: "protein", serving: "۲۰۰ گرم", kcal: 210, protein: 13, carbs: 33, fat: 3, tags: [], vegetarian: true, vegan: true },
  { id: "chickpeas", name: "Chickpeas", nameFa: "نخود", cat: "protein", serving: "۱۵۰ گرم", kcal: 205, protein: 11, carbs: 34, fat: 3.2, tags: [], vegetarian: true, vegan: true },
  { id: "lapeh", name: "Split peas", nameFa: "لپه", cat: "protein", serving: "۱۵۰ گرم", kcal: 175, protein: 13, carbs: 31, fat: 0.6, tags: [], vegetarian: true, vegan: true },
  { id: "redbeans", name: "Red beans", nameFa: "لوبیا قرمز", cat: "protein", serving: "۱۵۰ گرم", kcal: 190, protein: 13, carbs: 34, fat: 0.7, tags: [], vegetarian: true, vegan: true },
  { id: "whitebeans", name: "White beans", nameFa: "لوبیا سفید", cat: "protein", serving: "۱۵۰ گرم", kcal: 190, protein: 13, carbs: 34, fat: 0.7, tags: [], vegetarian: true, vegan: true },
  { id: "eggs", name: "Eggs", nameFa: "تخم‌مرغ", cat: "protein", serving: "۲ عدد", kcal: 155, protein: 13, carbs: 1, fat: 11, tags: ["egg"], vegetarian: true, vegan: false },
  { id: "chicken", name: "Chicken breast", nameFa: "سینه مرغ", cat: "protein", serving: "۱۰۰ گرم", kcal: 165, protein: 31, carbs: 0, fat: 3.6, tags: ["meat"], vegetarian: false, vegan: false },
  { id: "chickenthigh", name: "Chicken thigh", nameFa: "ران مرغ", cat: "protein", serving: "۱۰۰ گرم", kcal: 210, protein: 26, carbs: 0, fat: 11, tags: ["meat"], vegetarian: false, vegan: false },
  { id: "beef", name: "Ground beef", nameFa: "گوشت چرخ‌کرده", cat: "protein", serving: "۱۰۰ گرم", kcal: 250, protein: 26, carbs: 0, fat: 15, tags: ["meat"], vegetarian: false, vegan: false },
  { id: "liver", name: "Chicken liver", nameFa: "جگر مرغ", cat: "protein", serving: "۱۰۰ گرم", kcal: 170, protein: 25, carbs: 1, fat: 6.5, tags: ["meat"], vegetarian: false, vegan: false },
  { id: "tuna", name: "Canned tuna", nameFa: "تن ماهی", cat: "protein", serving: "۱۰۰ گرم", kcal: 115, protein: 26, carbs: 0, fat: 1, tags: ["fish"], vegetarian: false, vegan: false },

  // Dairy
  { id: "yogurt", name: "Yogurt", nameFa: "ماست", cat: "dairy", serving: "۲۰۰ گرم", kcal: 130, protein: 10, carbs: 15, fat: 3, tags: ["dairy"], vegetarian: true, vegan: false },
  { id: "doogh", name: "Doogh", nameFa: "دوغ", cat: "dairy", serving: "۲۵۰ میلی‌لیتر", kcal: 75, protein: 5, carbs: 8, fat: 2.5, tags: ["dairy"], vegetarian: true, vegan: false },
  { id: "feta", name: "Feta cheese", nameFa: "پنیر", cat: "dairy", serving: "۵۰ گرم", kcal: 132, protein: 7, carbs: 2, fat: 10.5, tags: ["dairy"], vegetarian: true, vegan: false },
  { id: "milk", name: "Milk", nameFa: "شیر", cat: "dairy", serving: "۲۵۰ میلی‌لیتر", kcal: 150, protein: 8, carbs: 12, fat: 8, tags: ["dairy"], vegetarian: true, vegan: false },

  // Fruit
  { id: "dates", name: "Dates", nameFa: "خرما", cat: "fruit", serving: "۵۰ گرم", kcal: 140, protein: 1, carbs: 37, fat: 0.2, tags: [], vegetarian: true, vegan: true },
  { id: "raisins", name: "Raisins", nameFa: "کشمش", cat: "fruit", serving: "۴۰ گرم", kcal: 120, protein: 1, carbs: 32, fat: 0.2, tags: [], vegetarian: true, vegan: true },
  { id: "banana", name: "Banana", nameFa: "موز", cat: "fruit", serving: "۱ عدد", kcal: 107, protein: 1, carbs: 27, fat: 0.4, tags: [], vegetarian: true, vegan: true },
  { id: "apple", name: "Apple", nameFa: "سیب", cat: "fruit", serving: "۱ عدد", kcal: 78, protein: 0, carbs: 21, fat: 0.3, tags: [], vegetarian: true, vegan: true },

  // Veg
  { id: "cucumber", name: "Cucumber", nameFa: "خیار", cat: "veg", serving: "۱۰۰ گرم", kcal: 15, protein: 1, carbs: 3.6, fat: 0.1, tags: [], vegetarian: true, vegan: true },
  { id: "tomato", name: "Tomato", nameFa: "گوجه‌فرنگی", cat: "veg", serving: "۱۰۰ گرم", kcal: 18, protein: 1, carbs: 3.9, fat: 0.2, tags: [], vegetarian: true, vegan: true },
  { id: "eggplant", name: "Eggplant", nameFa: "بادمجان", cat: "veg", serving: "۱۰۰ گرم", kcal: 25, protein: 1, carbs: 6, fat: 0.2, tags: [], vegetarian: true, vegan: true },
  { id: "spinach", name: "Spinach", nameFa: "اسفناج", cat: "veg", serving: "۱۰۰ گرم", kcal: 23, protein: 3, carbs: 3.6, fat: 0.4, tags: [], vegetarian: true, vegan: true },
  { id: "carrot", name: "Carrot", nameFa: "هویج", cat: "veg", serving: "۱۰۰ گرم", kcal: 41, protein: 1, carbs: 9.6, fat: 0.2, tags: [], vegetarian: true, vegan: true },
  { id: "onion", name: "Onion", nameFa: "پیاز", cat: "veg", serving: "۱۰۰ گرم", kcal: 40, protein: 1, carbs: 9.3, fat: 0.1, tags: [], vegetarian: true, vegan: true },

  // Fats
  { id: "walnuts", name: "Walnuts", nameFa: "گردو", cat: "fat", serving: "۳۰ گرم", kcal: 196, protein: 5, carbs: 4, fat: 19.6, tags: ["nuts"], vegetarian: true, vegan: true },
  { id: "oil", name: "Vegetable oil", nameFa: "روغن مایع", cat: "fat", serving: "۱ ق‌غ", kcal: 120, protein: 0, carbs: 0, fat: 13.6, tags: [], vegetarian: true, vegan: true },
  { id: "oliveoil", name: "Olive oil", nameFa: "روغن زیتون", cat: "fat", serving: "۱ ق‌غ", kcal: 119, protein: 0, carbs: 0, fat: 13.5, tags: [], vegetarian: true, vegan: true },
  { id: "butter", name: "Butter", nameFa: "کره", cat: "fat", serving: "۱ ق‌غ", kcal: 102, protein: 0, carbs: 0, fat: 11.5, tags: ["dairy"], vegetarian: true, vegan: false },
  { id: "pnutbutter", name: "Peanut butter", nameFa: "کره بادام‌زمینی", cat: "fat", serving: "۲ ق‌غ", kcal: 190, protein: 8, carbs: 6, fat: 16, tags: ["nuts"], vegetarian: true, vegan: true },
  { id: "tahini", name: "Tahini", nameFa: "ارده", cat: "fat", serving: "۲ ق‌غ", kcal: 178, protein: 5, carbs: 6.4, fat: 16, tags: ["nuts"], vegetarian: true, vegan: true },

  // Snacks
  { id: "hummus", name: "Hummus", nameFa: "حمص", cat: "snack", serving: "۱۰۰ گرم", kcal: 166, protein: 8, carbs: 14, fat: 9.6, tags: [], vegetarian: true, vegan: true },
  { id: "honey", name: "Honey", nameFa: "عسل", cat: "snack", serving: "۱ ق‌غ", kcal: 64, protein: 0, carbs: 17, fat: 0, tags: [], vegetarian: true, vegan: false },
];

// ---- Filtering ----

function styleOk(food: Food, style: DietStyle): boolean {
  if (style === "vegan") return food.vegan;
  if (style === "vegetarian") return food.vegetarian;
  return true;
}
function allergenOk(food: Food, allergens: Allergen[]): boolean {
  return !allergens.some((a) => (food.tags as string[]).includes(a));
}
export function availableFoods(style: DietStyle, allergens: Allergen[]): Food[] {
  return FOODS.filter((f) => styleOk(f, style) && allergenOk(f, allergens));
}

// ---- Plan types ----

export interface PlanItem {
  name: string;
  nameFa: string;
  label: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}
export interface PlanMeal {
  name: string; // key: Breakfast/Lunch/Dinner/Snack (+ index)
  items: PlanItem[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}
export interface DietPlan {
  id: string;
  seed: number;
  createdAt: number;
  days: PlanMeal[][];
}

// ---- Generator ----

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(arr: T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)];
const clampHalf = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(n * 2) / 2));
const trimNum = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

function item(food: Food, qty: number): PlanItem {
  return {
    name: food.name,
    nameFa: food.nameFa,
    label: qty === 1 ? food.serving : `${trimNum(qty)}× ${food.serving}`,
    kcal: Math.round(food.kcal * qty),
    protein: Math.round(food.protein * qty),
    carbs: Math.round(food.carbs * qty),
    fat: Math.round(food.fat * qty),
  };
}
function sumMeal(name: string, items: PlanItem[]): PlanMeal {
  return {
    name,
    items,
    kcal: items.reduce((n, i) => n + i.kcal, 0),
    protein: items.reduce((n, i) => n + i.protein, 0),
    carbs: items.reduce((n, i) => n + i.carbs, 0),
    fat: items.reduce((n, i) => n + i.fat, 0),
  };
}

interface Pools {
  protein: Food[];
  carb: Food[];
  veg: Food[];
  fruit: Food[];
  fat: Food[];
  snack: Food[];
}

function buildMeal(
  name: string,
  kind: "breakfast" | "main" | "snack",
  targetKcal: number,
  targetProtein: number,
  pools: Pools,
  rng: () => number
): PlanMeal {
  const items: PlanItem[] = [];
  let kcal = 0;
  const add = (f: Food, qty: number) => {
    const it = item(f, qty);
    items.push(it);
    kcal += it.kcal;
  };

  if (kind === "snack") {
    const base = pick(pools.snack.length ? pools.snack : pools.protein, rng);
    add(base, clampHalf(targetProtein / Math.max(6, base.protein), 0.5, 2));
    if (kcal < targetKcal * 0.8 && pools.fruit.length) add(pick(pools.fruit, rng), 1);
    return sumMeal(name, items);
  }

  const P = pick(pools.protein, rng);
  add(P, clampHalf(targetProtein / Math.max(8, P.protein), 0.5, 3));
  if (kind === "main" && pools.veg.length) add(pick(pools.veg, rng), 1);
  if (kind === "breakfast" && pools.fruit.length) add(pick(pools.fruit, rng), 1);
  if (pools.carb.length) {
    const C = pick(pools.carb, rng);
    add(C, clampHalf((targetKcal - kcal) / Math.max(60, C.kcal), 0.5, 3));
  }
  if (kcal < targetKcal * 0.85 && pools.fat.length) add(pick(pools.fat, rng), 1);
  return sumMeal(name, items);
}

function mealSlots(n: number) {
  const snackCount = Math.max(0, Math.min(3, n - 3));
  const snackW = 0.1 * snackCount;
  const mainsW = 1 - snackW;
  // kcal and protein are weighted separately: protein is spread more evenly across
  // meals (muscle-protein synthesis responds per-meal, not per-day).
  const snackPW = snackCount ? 0.15 / snackCount : 0;
  const mainsPW = snackCount ? 0.85 : 1;
  const slots: {
    name: string;
    kind: "breakfast" | "main" | "snack";
    weight: number; // kcal share
    proteinW: number; // protein share
  }[] = [
    { name: "Breakfast", kind: "breakfast", weight: mainsW * 0.3, proteinW: mainsPW * 0.3 },
    { name: "Lunch", kind: "main", weight: mainsW * 0.4, proteinW: mainsPW * 0.35 },
    { name: "Dinner", kind: "main", weight: mainsW * 0.3, proteinW: mainsPW * 0.35 },
  ];
  for (let i = 0; i < snackCount; i++) {
    slots.push({
      name: snackCount === 1 ? "Snack" : `Snack ${i + 1}`,
      kind: "snack",
      weight: 0.1,
      proteinW: snackPW,
    });
  }
  return slots;
}

export function generatePlan(
  profile: DietProfile,
  targets: MacroTargets,
  numDays: number,
  seed: number
): DietPlan {
  const foods = availableFoods(profile.style, profile.allergens);
  const pools: Pools = {
    // dairy foods double as protein/snack sources so they get used.
    protein: foods.filter((f) => f.cat === "protein" || f.cat === "dairy"),
    carb: foods.filter((f) => f.cat === "carb"),
    veg: foods.filter((f) => f.cat === "veg"),
    fruit: foods.filter((f) => f.cat === "fruit"),
    fat: foods.filter((f) => f.cat === "fat"),
    snack: foods.filter((f) => f.cat === "snack" || f.cat === "dairy"),
  };
  const rng = mulberry32(seed);
  const slots = mealSlots(profile.mealsPerDay);
  // Per-meal protein floors: mains >=0.4 g/kg (hits the ~2.5-3 g leucine threshold;
  // vegans need ~1/3 more, plant protein is leucine-poorer), snacks >=20 g when few meals.
  const mainFloor = profile.weightKg * (profile.style === "vegan" ? 0.53 : 0.4);
  const snackFloor = profile.mealsPerDay <= 4 ? 20 : 0;
  const days: PlanMeal[][] = [];
  for (let d = 0; d < numDays; d++) {
    days.push(
      slots.map((s) =>
        buildMeal(
          s.name,
          s.kind,
          targets.kcal * s.weight,
          Math.max(
            targets.protein * s.proteinW,
            s.kind === "snack" ? snackFloor : mainFloor
          ),
          pools,
          rng
        )
      )
    );
  }
  return { id: DIET_PLAN_ID, seed, createdAt: 0, days };
}

export function dayTotals(meals: PlanMeal[]): MacroTargets {
  return {
    kcal: meals.reduce((n, m) => n + m.kcal, 0),
    protein: meals.reduce((n, m) => n + m.protein, 0),
    carbs: meals.reduce((n, m) => n + m.carbs, 0),
    fat: meals.reduce((n, m) => n + m.fat, 0),
  };
}

// ---- Supplements (with a Torob search query for live prices) ----

export interface Supplement {
  name: string;
  nameFa: string;
  dose: string;
  why: string;
  whyFa: string;
  query: string; // Persian search term for Torob
  tier: "A" | "B" | "C"; // evidence tier (A = strongly supported)
}

export function recommendSupplements(profile: DietProfile): Supplement[] {
  const s: Supplement[] = [];
  const vegan = profile.style === "vegan";
  const noDairy = vegan || profile.allergens.includes("dairy");
  const hard = profile.activity === "active" || profile.activity === "athlete";

  s.push(
    vegan
      ? { name: "Plant protein", nameFa: "پروتئین گیاهی", dose: "۱–۲ اسکوپ در روز", why: "Convenient way to hit protein.", whyFa: "راه ساده برای رسیدن به پروتئین روزانه.", query: "پروتئین گیاهی", tier: "A" }
      : { name: "Whey protein", nameFa: "پروتئین وی", dose: "۱–۲ اسکوپ در روز", why: "Convenient way to hit protein.", whyFa: "راه ساده برای رسیدن به پروتئین روزانه.", query: "پروتئین وی", tier: "A" }
  );
  // Creatine is NOT gated on goal: it also preserves lean mass in a deficit.
  s.push({ name: "Creatine", nameFa: "کراتین مونوهیدرات", dose: "۳–۵ گرم روزانه (حتی روز استراحت)", why: "Best-proven for strength & muscle; keeps lean mass on a cut.", whyFa: "معتبرترین مکمل برای قدرت و عضله؛ در کات هم عضله را حفظ می‌کند.", query: "کراتین", tier: "A" });
  s.push({ name: "Omega-3", nameFa: "امگا ۳", dose: "۱–۲ گرم EPA+DHA", why: "Recovery, joints, heart.", whyFa: "کمک به ریکاوری، مفاصل و قلب.", query: "امگا 3", tier: "B" });
  s.push({ name: "Vitamin D3", nameFa: "ویتامین D3", dose: "۱۰۰۰–۲۰۰۰ واحد", why: "Commonly low; confirm with a blood test.", whyFa: "معمولاً کمبود دارد؛ با آزمایش خون تأیید کن.", query: "ویتامین D3", tier: "B" });
  if (vegan) {
    s.push({ name: "Vitamin B12", nameFa: "ویتامین B12", dose: "۲۵۰ میکروگرم", why: "Essential on a vegan diet.", whyFa: "برای رژیم کاملاً گیاهی ضروری است.", query: "ویتامین B12", tier: "A" });
  }
  if (noDairy) {
    s.push({ name: "Calcium", nameFa: "کلسیم", dose: "۵۰۰ میلی‌گرم", why: "Covers calcium without dairy.", whyFa: "جبران کلسیم در نبود لبنیات.", query: "کلسیم", tier: "B" });
  }
  if (hard) {
    s.push({ name: "Caffeine", nameFa: "کافئین", dose: "۱۰۰–۲۰۰ میلی‌گرم، ۴۵ دقیقه قبل تمرین", why: "Boosts training performance.", whyFa: "افزایش عملکرد و تمرکز در تمرین.", query: "کافئین", tier: "A" });
  }
  return s;
}

export const DIET_PLAN_ID = "current";
