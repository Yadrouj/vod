// A catalog of 50 ready-made plans — 25 training programs + 25 nutrition plans.
// "Apply" turns a plan into a concrete Program (real exercises) or a DietProfile + meal plan.

import type { ExerciseIndex } from "./exercises";
import { buildProgram, buildSplit, type SplitKind } from "./programming";
import type { Level, Program, TrainingGoal } from "./types";
import {
  DIET_PROFILE_ID,
  type ActivityLevel,
  type DietProfile,
  type DietStyle,
  type Goal,
  type MacroBias,
} from "./nutrition";

export interface GymPlan {
  id: string;
  kind: "gym";
  name: string;
  nameFa: string;
  desc: string;
  descFa: string;
  goal: TrainingGoal;
  level: Level;
  days: number;
  split: SplitKind;
  tags: string[];
  equip?: string[]; // restrict exercise selection (home / dumbbell-only plans)
}

export interface DietPlanTpl {
  id: string;
  kind: "diet";
  name: string;
  nameFa: string;
  desc: string;
  descFa: string;
  style: DietStyle;
  goal: Goal;
  bias: MacroBias;
  mealsPerDay: number;
  tags: string[];
}

export type MarketPlan = GymPlan | DietPlanTpl;

const gym = (
  id: string,
  name: string,
  nameFa: string,
  goal: TrainingGoal,
  level: Level,
  days: number,
  split: SplitKind,
  desc: string,
  descFa: string,
  tags: string[],
  equip?: string[]
): GymPlan => ({ id, kind: "gym", name, nameFa, goal, level, days, split, desc, descFa, tags, equip });

const HOME_EQUIP = ["Bodyweight", "Band", "TRX"];
const DUMBBELL_EQUIP = ["Dumbbells", "Bodyweight"];

export const GYM_PLANS: GymPlan[] = [
  gym("g-fb2-beg", "Minimalist Full-Body", "فول‌بادی مینیمال", "hypertrophy", "beginner", 2, "fullbody", "Two efficient full-body sessions a week.", "دو جلسه‌ی کارآمد فول‌بادی در هفته — عالی برای وقت کم.", ["Full body", "2 days"]),
  gym("g-fb3-beg", "Beginner Full-Body", "فول‌بادی مبتدی", "hypertrophy", "beginner", 3, "fullbody", "Classic 3-day full-body to build a base.", "برنامه‌ی کلاسیک ۳ روزه‌ی فول‌بادی برای ساخت پایه‌ی عضلانی.", ["Full body", "3 days"]),
  gym("g-fb3-str", "Starting Strength", "قدرت پایه", "strength", "beginner", 3, "fullbody", "Heavy compounds, 5×5 style, 3 days.", "حرکات ترکیبی سنگین، ۵×۵، سه روز در هفته برای قوی‌شدن.", ["Strength", "3 days"]),
  gym("g-fb3-end", "Fat-Loss Circuit", "سیرکویت چربی‌سوزی", "endurance", "beginner", 3, "fullbody", "High-rep full-body conditioning.", "فول‌بادی پرتکرار برای سوزاندن کالری و افزایش استقامت.", ["Conditioning", "3 days"]),
  gym("g-fb4-ath", "Athletic Conditioning", "آمادگی ورزشی", "endurance", "advanced", 4, "fullbody", "Four full-body days for work capacity.", "چهار روز فول‌بادی برای ظرفیت کاری و آمادگی جسمانی.", ["Athletic", "4 days"]),
  gym("g-ul4-hyp", "Upper/Lower Hypertrophy", "هایپرتروفی بالا/پایین", "hypertrophy", "advanced", 4, "upperlower", "The 4-day upper/lower standard.", "اسپلیت استاندارد ۴ روزه‌ی بالا/پایین برای رشد عضله.", ["Upper/Lower", "4 days"]),
  gym("g-ul4-str", "Powerbuilding U/L", "پاوربیلدینگ بالا/پایین", "strength", "advanced", 4, "upperlower", "Upper/lower with a strength bias.", "بالا/پایین با تمرکز قدرت — حرکات سنگین و لیفت‌های بزرگ.", ["Strength", "4 days"]),
  gym("g-ul6-hyp", "High-Volume Upper/Lower", "بالا/پایین حجم‌بالا", "hypertrophy", "advanced", 6, "upperlower", "Six days of upper/lower for volume.", "شش روز بالا/پایین برای پیشرفته‌ها با حجم زیاد.", ["Upper/Lower", "6 days"]),
  gym("g-ul2-hyp", "Busy-Week Upper/Lower", "بالا/پایین کم‌وقت", "hypertrophy", "beginner", 2, "upperlower", "One upper, one lower.", "یک بالا، یک پایین — کل بدن دو بار در دو روز.", ["Upper/Lower", "2 days"]),
  gym("g-ppl3-hyp", "PPL Lite", "پوش‌پول‌لگ سبک", "hypertrophy", "advanced", 3, "ppl", "Push, pull, legs once each.", "هل، کشش، پا هرکدام یک‌بار — رشد متعادل در سه روز.", ["PPL", "3 days"]),
  gym("g-ppl6-hyp", "Push/Pull/Legs", "پوش‌پول‌لگ", "hypertrophy", "advanced", 6, "ppl", "Each muscle twice a week.", "محبوب‌ترین اسپلیت هایپرتروفی — هر عضله دو بار در هفته.", ["PPL", "6 days"]),
  gym("g-ppl6-str", "PPL Power", "پوش‌پول‌لگ قدرتی", "strength", "advanced", 6, "ppl", "PPL run heavy for strength.", "پوش‌پول‌لگ سنگین برای قدرت و توان.", ["Strength", "6 days"]),
  gym("g-ppl3-end", "PPL Endurance", "پوش‌پول‌لگ استقامتی", "endurance", "advanced", 3, "ppl", "Higher reps, short rest, pump.", "تکرار بالا و استراحت کوتاه — تمرکز روی پمپ.", ["PPL", "3 days"]),
  gym("g-pp4-hyp", "Push/Pull Split", "اسپلیت هل/کشش", "hypertrophy", "advanced", 4, "pushpull", "Alternating push and pull days.", "روزهای متناوب هل و کشش برای رشد متعادل بالاتنه.", ["Push/Pull", "4 days"]),
  gym("g-pp4-str", "Push/Pull Strength", "هل/کشش قدرتی", "strength", "advanced", 4, "pushpull", "Push/pull around heavy strength.", "هل/کشش با محوریت کار قدرتی سنگین.", ["Strength", "4 days"]),
  gym("g-bro5-hyp", "Classic Bro Split", "برو اسپلیت کلاسیک", "hypertrophy", "advanced", 5, "brosplit", "One muscle group per day.", "هر روز یک گروه عضلانی — سینه، پشت، پا، شانه، بازو.", ["Bodybuilding", "5 days"]),
  gym("g-bro5-adv", "Advanced Volume Split", "اسپلیت حجم پیشرفته", "hypertrophy", "advanced", 5, "brosplit", "High-volume body-part split.", "اسپلیت بدن‌سازی حجم‌بالا برای باتجربه‌ها.", ["Bodybuilding", "5 days"]),
  gym("g-fb3-str2", "Strong Beginner", "مبتدی قدرتی", "strength", "beginner", 3, "fullbody", "Build strength safely, full-body.", "افزایش قدرت ایمن با تمرین ترکیبی فول‌بادی.", ["Strength", "3 days"]),
  gym("g-ul4-end", "Lean & Toned U/L", "فرم‌دهی بالا/پایین", "endurance", "beginner", 4, "upperlower", "Higher-rep upper/lower for tone.", "بالا/پایین پرتکرار برای فرم و استقامت عضله.", ["Toning", "4 days"]),
  gym("g-ppl6-adv", "Hypertrophy Blast", "انفجار هایپرتروفی", "hypertrophy", "advanced", 6, "ppl", "Maximum weekly volume.", "بیشترین حجم هفتگی در شش جلسه‌ی پوش‌پول‌لگ.", ["PPL", "6 days"]),
  gym("g-fb2-str", "Two-Day Strength", "قدرت دو روزه", "strength", "beginner", 2, "fullbody", "Get strong on two full-body days.", "قوی‌شدن فقط با دو روز فول‌بادی قدرتی در هفته.", ["Strength", "2 days"]),
  gym("g-ul4-pl", "Powerlifter U/L", "پاورلیفتر بالا/پایین", "strength", "advanced", 4, "upperlower", "Squat, bench, deadlift focus.", "تمرکز اسکات، پرس، ددلیفت با حرکات کمکی.", ["Powerlifting", "4 days"]),
  gym("g-pp4-end", "Conditioning Push/Pull", "هل/کشش آمادگی", "endurance", "advanced", 4, "pushpull", "Push/pull with endurance focus.", "هل/کشش با تأکید بر استقامت و آمادگی.", ["Conditioning", "4 days"]),
  gym("g-fb3-hyp", "Full-Body Hypertrophy", "هایپرتروفی فول‌بادی", "hypertrophy", "advanced", 3, "fullbody", "Three quality full-body sessions.", "سه جلسه‌ی باکیفیت فول‌بادی برای رشد متعادل.", ["Full body", "3 days"]),
  gym("g-ppl5-hyp", "PPL + Upper/Lower Hybrid", "ترکیبی پوش‌پول‌لگ + بالا/پایین", "hypertrophy", "advanced", 5, "ppl", "Five days blending volume + frequency.", "پنج روز ترکیب حجم و تناوب.", ["Hybrid", "5 days"]),
  // ---- equipment-constrained & specialty programs ----
  gym("g-home3-body", "Home Bodyweight", "بدنسازی خانگی بدون وسیله", "hypertrophy", "beginner", 3, "fullbody", "Full-body muscle at home — no equipment.", "عضله‌سازی فول‌بادی در خانه، بدون هیچ وسیله‌ای.", ["Home", "3 days"], HOME_EQUIP),
  gym("g-home4-band", "Home Band Training", "تمرین خانگی با کش", "hypertrophy", "beginner", 4, "upperlower", "Upper/lower at home with bands & bodyweight.", "بالا/پایین در خانه با کش و وزن بدن.", ["Home", "4 days"], HOME_EQUIP),
  gym("g-home3-fat", "Home Fat-Burn", "چربی‌سوزی خانگی", "endurance", "beginner", 3, "fullbody", "High-rep home circuits for fat loss.", "سیرکویت پرتکرار خانگی برای چربی‌سوزی.", ["Home", "Conditioning"], HOME_EQUIP),
  gym("g-db3-full", "Dumbbell-Only Full-Body", "فول‌بادی فقط دمبل", "hypertrophy", "beginner", 3, "fullbody", "A pair of dumbbells is all you need.", "فقط با یک جفت دمبل، کل بدن را بساز.", ["Dumbbell", "3 days"], DUMBBELL_EQUIP),
  gym("g-db4-ul", "Dumbbell Upper/Lower", "بالا/پایین دمبلی", "hypertrophy", "advanced", 4, "upperlower", "4-day dumbbell-only muscle plan.", "برنامه‌ی ۴ روزه‌ی عضله‌سازی فقط با دمبل.", ["Dumbbell", "4 days"], DUMBBELL_EQUIP),
  gym("g-w-glute4", "Glute & Leg Sculpt", "فرم‌دهی باسن و پا", "hypertrophy", "beginner", 4, "upperlower", "Lower-body-focused shaping for women.", "تمرکز پایین‌تنه برای فرم‌دهی — محبوب بانوان.", ["Women", "4 days"]),
  gym("g-w-tone3", "Women's Total Tone", "تناسب کامل بانوان", "endurance", "beginner", 3, "fullbody", "Light-load, high-rep full-body toning.", "فول‌بادی پرتکرار و سبک برای تناسب اندام بانوان.", ["Women", "3 days"]),
  gym("g-over40", "Strong Over 40", "قدرتمند بالای ۴۰ سال", "strength", "beginner", 3, "fullbody", "Joint-friendly strength for 40+.", "قدرت با ملاحظه‌ی مفاصل برای بالای ۴۰ سال.", ["Health", "3 days"]),
  gym("g-office", "Desk-Worker Reset", "برنامه‌ی کارمندی", "hypertrophy", "beginner", 3, "fullbody", "Undo sitting: posture-focused training.", "جبران نشستن طولانی — تمرکز بر عضلات وضعیتی.", ["Health", "3 days"]),
  gym("g-athlete5", "Hybrid Athlete", "ورزشکار هیبریدی", "endurance", "advanced", 5, "ppl", "Strength + engine for all-round athletes.", "ترکیب قدرت و استقامت برای ورزشکار همه‌جانبه.", ["Athletic", "5 days"]),
];

const diet = (
  id: string,
  name: string,
  nameFa: string,
  style: DietStyle,
  goal: Goal,
  bias: MacroBias,
  meals: number,
  desc: string,
  descFa: string,
  tags: string[]
): DietPlanTpl => ({ id, kind: "diet", name, nameFa, style, goal, bias, mealsPerDay: meals, desc, descFa, tags });

export const DIET_PLANS: DietPlanTpl[] = [
  diet("d-hp-cut", "High-Protein Cut", "کاهش وزن پرپروتئین", "omnivore", "lose", "high-protein", 4, "Max fat loss, protect muscle.", "حداکثر چربی‌سوزی با حفظ عضله و پروتئین بالا.", ["Cut", "High protein"]),
  diet("d-lean-bulk", "Lean Bulk", "حجم تمیز", "omnivore", "gain", "high-protein", 5, "Steady muscle gain.", "افزایش عضله‌ی تدریجی با مازاد کالری کنترل‌شده.", ["Bulk", "High protein"]),
  diet("d-maintain", "Balanced Maintenance", "نگه‌داری متعادل", "omnivore", "maintain", "balanced", 4, "Even macros to hold weight.", "درشت‌مغذی متعادل برای حفظ وزن و تمرین خوب.", ["Maintain", "Balanced"]),
  diet("d-lowcarb-cut", "Low-Carb Cut", "کاهش کم‌کربوهیدرات", "omnivore", "lose", "low-carb", 3, "Lower carbs, higher fat/protein.", "کربوهیدرات کمتر، چربی و پروتئین بیشتر برای کنترل اشتها.", ["Cut", "Low carb"]),
  diet("d-athlete-hc", "Athlete Fuel", "سوخت ورزشکار", "omnivore", "maintain", "high-carb", 5, "Carb-forward for hard training.", "تغذیه‌ی پرکربوهیدرات برای تمرین سنگین و ریکاوری.", ["Performance", "High carb"]),
  diet("d-recomp", "Body Recomposition", "بازترکیب بدن", "omnivore", "maintain", "high-protein", 4, "Build and trim at once.", "کالری نگه‌داری با پروتئین بالا برای ساخت و کاهش هم‌زمان.", ["Recomp", "High protein"]),
  diet("d-keto", "Keto-Style Low Carb", "کتوژنیک کم‌کربوهیدرات", "omnivore", "lose", "low-carb", 3, "Very low carb, high fat.", "کربوهیدرات خیلی کم و چربی بالا برای چربی‌سوزی.", ["Cut", "Keto"]),
  diet("d-med", "Mediterranean", "مدیترانه‌ای", "omnivore", "maintain", "balanced", 4, "Whole foods, healthy fats, fish.", "غذای کامل، چربی سالم و ماهی — دوستدار قلب.", ["Maintain", "Wholefood"]),
  diet("d-aggr-cut", "Aggressive Cut", "کاهش سریع", "omnivore", "lose", "high-protein", 3, "Steeper deficit, very high protein.", "کسری کالری بیشتر با پروتئین خیلی بالا برای نتیجه‌ی سریع‌تر.", ["Cut", "High protein"]),
  diet("d-clean-bulk", "Clean Bulk", "حجم پرکربوهیدرات", "omnivore", "gain", "high-carb", 5, "Carb-heavy surplus for size.", "مازاد پرکربوهیدرات برای حجم و قدرت.", ["Bulk", "High carb"]),
  diet("d-hp-maintain", "High-Protein Maintenance", "نگه‌داری پرپروتئین", "omnivore", "maintain", "high-protein", 4, "Protein-forward maintenance.", "حفظ وزن با وعده‌های پرپروتئین و سیرکننده.", ["Maintain", "High protein"]),
  diet("d-halal-cut", "Halal High-Protein Cut", "کاهش وزن حلال پرپروتئین", "halal", "lose", "high-protein", 4, "Halal fat-loss, lean proteins.", "برنامه‌ی چربی‌سوزی حلال با پروتئین کم‌چرب.", ["Halal", "Cut"]),
  diet("d-halal-bulk", "Halal Lean Bulk", "حجم تمیز حلال", "halal", "gain", "high-protein", 5, "Halal muscle-building surplus.", "مازاد عضله‌سازی حلال با پروتئین باکیفیت.", ["Halal", "Bulk"]),
  diet("d-halal-maintain", "Halal Maintenance", "نگه‌داری حلال", "halal", "maintain", "balanced", 4, "Balanced halal eating.", "تغذیه‌ی حلال متعادل برای حفظ و عملکرد.", ["Halal", "Maintain"]),
  diet("d-halal-endur", "Halal Endurance Fuel", "سوخت استقامتی حلال", "halal", "maintain", "high-carb", 5, "Carb-forward halal for endurance.", "برنامه‌ی حلال پرکربوهیدرات برای ورزشکاران استقامتی.", ["Halal", "Performance"]),
  diet("d-veg-cut", "Vegetarian Cut", "کاهش وزن گیاه‌خواری", "vegetarian", "lose", "high-protein", 4, "Meat-free fat loss.", "چربی‌سوزی بدون گوشت با لبنیات، تخم‌مرغ و حبوبات.", ["Vegetarian", "Cut"]),
  diet("d-veg-bulk", "Vegetarian Bulk", "حجم گیاه‌خواری", "vegetarian", "gain", "high-protein", 5, "Vegetarian lean-muscle surplus.", "مازاد گیاه‌خواری برای رشد عضله‌ی خالص.", ["Vegetarian", "Bulk"]),
  diet("d-veg-maintain", "Vegetarian Maintenance", "نگه‌داری گیاه‌خواری", "vegetarian", "maintain", "balanced", 4, "Balanced vegetarian eating.", "تغذیه‌ی گیاه‌خواری متعادل برای سلامت روزانه.", ["Vegetarian", "Maintain"]),
  diet("d-veg-lowcarb", "Low-Carb Vegetarian", "گیاه‌خواری کم‌کربوهیدرات", "vegetarian", "lose", "low-carb", 3, "Lower-carb vegetarian fat loss.", "برنامه‌ی گیاه‌خواری کم‌کربوهیدرات برای چربی‌سوزی.", ["Vegetarian", "Low carb"]),
  diet("d-vegan-cut", "Vegan Cut", "کاهش وزن وگان", "vegan", "lose", "high-protein", 4, "Plant-based fat loss.", "چربی‌سوزی گیاهی با پروتئین بالا از حبوبات و سویا.", ["Vegan", "Cut"]),
  diet("d-vegan-bulk", "Vegan Bulk", "حجم وگان", "vegan", "gain", "high-protein", 5, "Plant-based muscle gain.", "عضله‌سازی گیاهی با مازاد هوشمند.", ["Vegan", "Bulk"]),
  diet("d-vegan-maintain", "Vegan Maintenance", "نگه‌داری وگان", "vegan", "maintain", "balanced", 4, "Balanced fully plant-based.", "تغذیه‌ی کاملاً گیاهی و متعادل.", ["Vegan", "Maintain"]),
  diet("d-vegan-perf", "Plant-Based Performance", "عملکرد گیاهی", "vegan", "maintain", "high-carb", 5, "Carb-forward vegan fuelling.", "سوخت‌رسانی وگان پرکربوهیدرات برای تمرین و ریکاوری.", ["Vegan", "Performance"]),
  diet("d-vegan-lowcarb", "Vegan Low-Carb", "وگان کم‌کربوهیدرات", "vegan", "lose", "low-carb", 3, "Lower-carb plant-based fat loss.", "چربی‌سوزی گیاهی با کربوهیدرات کمتر و چربی بیشتر.", ["Vegan", "Low carb"]),
  diet("d-endur-hc", "Endurance High-Carb", "استقامتی پرکربوهیدرات", "omnivore", "maintain", "high-carb", 5, "High-carb for runners/cyclists.", "سوخت پرکربوهیدرات برای دوندگان و دوچرخه‌سواران.", ["Performance", "High carb"]),
  diet("d-student", "Student Budget Cut", "کاهش وزن دانشجویی", "omnivore", "lose", "high-protein", 3, "Cheap Iranian staples, high protein.", "با ارزان‌ترین غذاهای ایرانی — تخم‌مرغ، عدس، نان.", ["Cut", "Budget"]),
  diet("d-over40h", "40+ Healthy Plate", "بشقاب سالم بالای ۴۰", "omnivore", "maintain", "balanced", 4, "Heart- & joint-friendly maintenance.", "نگه‌داری با ملاحظه‌ی قلب و مفاصل برای ۴۰ سال به بالا.", ["Health", "Balanced"]),
  diet("d-gut", "Gut-Friendly Fiber", "گوارش‌دوست پرفیبر", "omnivore", "maintain", "balanced", 4, "High-fiber, easy-digest eating.", "پر فیبر و سبک برای گوارش راحت.", ["Health", "Wholefood"]),
  diet("d-women-tone", "Women's Toning Diet", "تغذیه‌ی تناسب بانوان", "omnivore", "lose", "high-protein", 4, "Gentle deficit + iron-aware foods.", "کسری ملایم با غذاهای آهن‌دار — مناسب بانوان.", ["Women", "Cut"]),
  diet("d-bulk-budget", "Budget Bulk", "حجم اقتصادی", "omnivore", "gain", "high-carb", 5, "Size on a small budget: rice, eggs, legumes.", "حجم با هزینه‌ی کم — برنج، تخم‌مرغ و حبوبات.", ["Bulk", "Budget"]),
];

// ---- Expert personas (each plan is authored by a coach) ----

/** Illustrated-portrait appearance knobs (rendered by <TrainerAvatar>). */
export interface AvatarSpec {
  skin: string; // face fill
  hair: string; // hair fill
  hairStyle: "short" | "buzz" | "quiff" | "bun" | "pony" | "wavy" | "bob" | "hijab";
  beard?: "none" | "stubble" | "beard";
  top: string; // athletic top color
}

export interface TrainerNews {
  date: string; // ISO — formatted per-locale in the UI
  title: string;
  titleFa: string;
  body: string;
  bodyFa: string;
}

export interface TrainerContacts {
  instagram?: string; // handle without @
  telegram?: string; // username without @
  phone?: string; // tel: number
  email?: string;
  website?: string;
  youtube?: string;
  x?: string;
}

export interface Specialty {
  icon: string; // Icon name
  fa: string;
  en: string;
}

export interface Trainer {
  id: string;
  name: string;
  nameFa: string;
  gender: "male" | "female";
  cred: string;
  credFa: string;
  color: string; // avatar gradient / accent seed
  photo?: string; // optional real photo at /trainers/<id>.jpg — used if present, else the illustrated avatar
  city: string;
  cityFa: string;
  years: number; // experience
  rating: number; // 0–5
  clients: number;
  bio: string;
  bioFa: string;
  specialties: Specialty[];
  avatar: AvatarSpec;
  contacts: TrainerContacts;
  news: TrainerNews[];
  isPartner?: boolean;
  sourceUrl?: string;
}

const SP = {
  hypertrophy: { icon: "dumbbell", fa: "عضله‌سازی", en: "Hypertrophy" },
  strength: { icon: "barbell", fa: "قدرت", en: "Strength" },
  contest: { icon: "trophy", fa: "آماده‌سازی مسابقه", en: "Contest prep" },
  nutrition: { icon: "diet", fa: "تغذیه‌ی ورزشی", en: "Sports nutrition" },
  women: { icon: "heart", fa: "تمرین بانوان", en: "Women's training" },
  fatloss: { icon: "flame", fa: "چربی‌سوزی", en: "Fat loss" },
  programming: { icon: "calendar", fa: "برنامه‌ریزی تمرین", en: "Programming" },
  powerlifting: { icon: "plate", fa: "پاورلیفتینگ", en: "Powerlifting" },
  athletes: { icon: "target", fa: "ورزشکاران", en: "Athletes" },
  conditioning: { icon: "timer", fa: "آمادگی جسمانی", en: "Conditioning" },
  clinical: { icon: "pill", fa: "تغذیه‌ی بالینی", en: "Clinical nutrition" },
  gut: { icon: "heart", fa: "سلامت گوارش", en: "Gut health" },
  performance: { icon: "flame", fa: "عملکرد ورزشی", en: "Performance" },
  mobility: { icon: "yoga", fa: "تحرک و اصلاحی", en: "Mobility & corrective" },
  rehab: { icon: "heart", fa: "بازتوانی", en: "Rehab" },
} as const;

const RAW_TRAINERS: Trainer[] = [
  {
    id: "t1", name: "Amir Rostami", nameFa: "امیر رستمی", gender: "male",
    cred: "IFBB-certified coach · 12y", credFa: "مربی رسمی فدراسیون بدنسازی · ۱۲ سال سابقه",
    color: "#7bd93a", city: "Tehran", cityFa: "تهران", years: 12, rating: 4.9, clients: 1240,
    bio: "IFBB-certified bodybuilding coach. I've prepped 30+ athletes for national stages and specialise in drug-free hypertrophy and contest prep.",
    bioFa: "مربی رسمی بدنسازی فدراسیون. بیش از ۳۰ ورزشکار را برای صحنه‌ی مسابقات ملی آماده کرده‌ام و تخصصم عضله‌سازی طبیعی و آماده‌سازی مسابقه است. تمرکزم روی تکنیک درست، اضافه‌بار تدریجی و برنامه‌ی قابل‌اجرا برای زندگی واقعی است.",
    specialties: [SP.hypertrophy, SP.contest, SP.nutrition, SP.strength],
    avatar: { skin: "#e0a878", hair: "#231a14", hairStyle: "short", beard: "beard", top: "#2e7d32" },
    contacts: { instagram: "amir.rostami.coach", telegram: "amirrostami", phone: "+989121110011", email: "amir@ramagh.app" },
    news: [
      { date: "2026-06-28", title: "New 6-week hypertrophy block released", titleFa: "بلوک ۶ هفته‌ای عضله‌سازی منتشر شد", body: "A push/pull/legs progression with auto-regulated volume.", bodyFa: "یک برنامه‌ی پوش‌پول‌لگ با حجم تنظیم‌شونده و تمرکز روی رشد سینه و پشت." },
      { date: "2026-06-10", title: "Free posing workshop in Tehran", titleFa: "کارگاه رایگان پوزینگ در تهران", body: "Sat 10am — bring your routine.", bodyFa: "شنبه ساعت ۱۰ صبح — روتین‌تان را بیاورید و اصلاح می‌کنیم." },
    ],
  },
  {
    id: "t2", name: "Sara Mohammadi", nameFa: "سارا محمدی", gender: "female",
    cred: "MSc Exercise Physiology", credFa: "کارشناس ارشد فیزیولوژی ورزشی",
    color: "#56b8ff", city: "Isfahan", cityFa: "اصفهان", years: 8, rating: 4.8, clients: 960,
    bio: "MSc in Exercise Physiology. I write evidence-based programs for women and beginners — smart progressions, no gimmicks.",
    bioFa: "کارشناس ارشد فیزیولوژی ورزشی. برنامه‌های علمی و بدون شعار برای بانوان و مبتدی‌ها می‌نویسم؛ پیشرفت هوشمند، تمرکز روی فرم و پایداری در بلندمدت. باور دارم تمرین باید با زندگی‌ات جور باشد نه برعکس.",
    specialties: [SP.programming, SP.women, SP.fatloss, SP.hypertrophy],
    avatar: { skin: "#e8b48c", hair: "#2a2018", hairStyle: "pony", top: "#1e88e5" },
    contacts: { instagram: "sara.physio", telegram: "saramohammadi", email: "sara@ramagh.app" },
    news: [
      { date: "2026-06-22", title: "Women's strength cycle updated", titleFa: "دوره‌ی قدرت بانوان به‌روزرسانی شد", body: "Added a deload week and hip-focused accessories.", bodyFa: "یک هفته‌ی دیلود و حرکات کمکی تمرکز باسن اضافه شد." },
      { date: "2026-05-30", title: "Q&A: training around your cycle", titleFa: "پرسش و پاسخ: تمرین در دوران قاعدگی", body: "Saved highlights on my page.", bodyFa: "هایلایت پاسخ‌ها در صفحه‌ام ذخیره شده است." },
    ],
  },
  {
    id: "t3", name: "Dr. Reza Karimi", nameFa: "دکتر رضا کریمی", gender: "male",
    cred: "PhD Strength & Conditioning", credFa: "دکترای علوم تمرین و قدرت",
    color: "#a78bfa", city: "Tehran", cityFa: "تهران", years: 15, rating: 4.9, clients: 1520,
    bio: "PhD in Strength & Conditioning. I coach powerlifters and team-sport athletes and teach barbell technique that lasts.",
    bioFa: "دکترای علوم تمرین و قدرت. پاورلیفترها و ورزشکاران تیمی را مربی‌گری می‌کنم و تکنیک لیفت‌های بزرگ (اسکات، پرس، ددلیفت) را ماندگار آموزش می‌دهم. برنامه‌هایم بر پایه‌ی پژوهش و پریودایزیشن اصولی است.",
    specialties: [SP.strength, SP.powerlifting, SP.athletes, SP.programming],
    avatar: { skin: "#d69a6c", hair: "#3a3a3a", hairStyle: "short", beard: "stubble", top: "#5e35b1" },
    contacts: { instagram: "dr.karimi.sc", telegram: "rezakarimi", phone: "+989121110033", email: "reza@ramagh.app", website: "karimisc.ir" },
    news: [
      { date: "2026-06-18", title: "Peaking guide for meet day", titleFa: "راهنمای پیکینگ برای روز مسابقه", body: "How to taper the last 10 days.", bodyFa: "چطور ۱۰ روز آخر را تیپر کنیم تا در مسابقه اوج بگیریم." },
    ],
  },
  {
    id: "t4", name: "Maryam Ahmadi", nameFa: "مریم احمدی", gender: "female",
    cred: "Sports Nutritionist", credFa: "متخصص تغذیه‌ی ورزشی",
    color: "#ff8fb0", city: "Shiraz", cityFa: "شیراز", years: 9, rating: 4.8, clients: 1100,
    bio: "Sports nutritionist. I build realistic Iranian meal plans that hit your macros with foods you actually eat.",
    bioFa: "متخصص تغذیه‌ی ورزشی. برنامه‌های غذایی واقع‌بینانه با غذاهای ایرانی می‌نویسم که هم درشت‌مغذی‌هایت را بزند و هم قابل‌اجرا و کم‌هزینه باشد. تغذیه‌ی خوب یعنی چیزی که بتوانی ادامه‌اش بدهی.",
    specialties: [SP.nutrition, SP.fatloss, SP.women, SP.clinical],
    avatar: { skin: "#eebf9a", hair: "#1f1a16", hairStyle: "hijab", top: "#ec407a" },
    contacts: { instagram: "maryam.nutrition", telegram: "maryamahmadi", email: "maryam@ramagh.app" },
    news: [
      { date: "2026-06-25", title: "Budget high-protein grocery list", titleFa: "لیست خرید پرپروتئین اقتصادی", body: "Under 1M toman/week.", bodyFa: "زیر یک میلیون تومان در هفته — تخم‌مرغ، عدس، مرغ و لبنیات." },
      { date: "2026-06-05", title: "Ramadan fueling plan", titleFa: "برنامه‌ی تغذیه‌ی ماه رمضان", body: "Sahur & iftar macro split.", bodyFa: "تقسیم درشت‌مغذی سحری و افطار برای حفظ عضله." },
    ],
  },
  {
    id: "t5", name: "Hossein Ghasemi", nameFa: "حسین قاسمی", gender: "male",
    cred: "CrossFit L2 Trainer", credFa: "مربی کراس‌فیت سطح ۲",
    color: "#ffc94d", city: "Tabriz", cityFa: "تبریز", years: 7, rating: 4.7, clients: 720,
    bio: "CrossFit L2. Conditioning, HIIT and metcons that build a real engine without wrecking your joints.",
    bioFa: "مربی کراس‌فیت سطح ۲. آمادگی جسمانی، اینتروال و متکان‌هایی که موتور بدنت را می‌سازد بدون آسیب به مفاصل. عاشق تمرین‌های کوتاه، شدید و پرانرژی‌ام.",
    specialties: [SP.conditioning, SP.performance, SP.fatloss, SP.athletes],
    avatar: { skin: "#c98a5e", hair: "#17130f", hairStyle: "buzz", beard: "stubble", top: "#f9a825" },
    contacts: { instagram: "hossein.wod", telegram: "hosseinghasemi", phone: "+989121110055" },
    news: [
      { date: "2026-06-20", title: "New 20-min metcon pack", titleFa: "پک متکان ۲۰ دقیقه‌ای جدید", body: "Minimal equipment, max sweat.", bodyFa: "با کمترین وسیله، بیشترین کالری — مناسب خانه و باشگاه." },
    ],
  },
  {
    id: "t6", name: "Dr. Negar Mousavi", nameFa: "دکتر نگار موسوی", gender: "female",
    cred: "PhD Clinical Nutrition", credFa: "دکترای تغذیه‌ی بالینی",
    color: "#3ee08f", city: "Tehran", cityFa: "تهران", years: 11, rating: 4.9, clients: 1330,
    bio: "PhD in Clinical Nutrition. I specialise in gut-friendly, whole-food plans and nutrition for health conditions.",
    bioFa: "دکترای تغذیه‌ی بالینی. تخصصم برنامه‌های گوارش‌دوست و غذای کامل، و تغذیه برای شرایط خاص (دیابت، فشار، کبد چرب) است. غذا را دارو می‌بینم، نه محدودیت.",
    specialties: [SP.clinical, SP.gut, SP.nutrition, SP.women],
    avatar: { skin: "#ecc2a0", hair: "#241c17", hairStyle: "bob", top: "#43a047" },
    contacts: { instagram: "dr.negar.nutrition", telegram: "negarmousavi", email: "negar@ramagh.app", website: "negarclinic.ir" },
    news: [
      { date: "2026-06-15", title: "Fiber & the microbiome — free guide", titleFa: "فیبر و میکروبیوم — راهنمای رایگان", body: "How to reach 30g/day gently.", bodyFa: "چطور بدون نفخ به ۳۰ گرم فیبر روزانه برسیم." },
    ],
  },
  {
    id: "t7", name: "Ali Nazari", nameFa: "علی نظری", gender: "male",
    cred: "Athletic Performance Coach", credFa: "مربی آمادگی جسمانی",
    color: "#b8f24a", city: "Mashhad", cityFa: "مشهد", years: 10, rating: 4.8, clients: 890,
    bio: "Performance coach. Speed, power and hybrid training for athletes who want to run faster and lift heavier.",
    bioFa: "مربی آمادگی جسمانی. تمرین سرعت، توان و هیبرید برای ورزشکارانی که می‌خواهند هم سریع‌تر بدوند و هم سنگین‌تر بزنند. ترکیب هوشمند قدرت و استقامت، بدون فرسودگی.",
    specialties: [SP.performance, SP.athletes, SP.conditioning, SP.strength],
    avatar: { skin: "#d9a273", hair: "#211a13", hairStyle: "quiff", top: "#9ccc2b" },
    contacts: { instagram: "ali.performance", telegram: "alinazari", phone: "+989121110077" },
    news: [
      { date: "2026-06-12", title: "Off-season speed block", titleFa: "بلوک سرعت فصل آماده‌سازی", body: "Sprint mechanics + plyos.", bodyFa: "مکانیک دو سرعت و پلایومتریک برای انفجار بیشتر." },
    ],
  },
  {
    id: "t8", name: "Shima Rahimi", nameFa: "شیما رحیمی", gender: "female",
    cred: "Corrective Exercise Specialist", credFa: "متخصص حرکات اصلاحی و یوگا",
    color: "#ee5f7b", city: "Karaj", cityFa: "کرج", years: 8, rating: 4.9, clients: 1050,
    bio: "Corrective exercise & yoga specialist. Mobility, posture and pain-free movement — great for desk workers and returners.",
    bioFa: "متخصص حرکات اصلاحی و یوگا. تحرک، اصلاح وضعیت بدن و حرکت بدون درد — عالی برای کارمندان پشت‌میزنشین و کسانی که بعد از مدت‌ها به تمرین برمی‌گردند. بدن سالم از حرکت درست شروع می‌شود.",
    specialties: [SP.mobility, SP.rehab, SP.women, SP.conditioning],
    avatar: { skin: "#eabf9c", hair: "#2b211a", hairStyle: "wavy", top: "#e91e63" },
    contacts: { instagram: "shima.mobility", telegram: "shimarahimi", email: "shima@ramagh.app" },
    news: [
      { date: "2026-06-19", title: "10-min desk mobility routine", titleFa: "روتین ۱۰ دقیقه‌ای تحرک پشت‌میز", body: "Undo the sitting slump.", bodyFa: "برای جبران قوز و خشکی ناشی از نشستن طولانی." },
    ],
  },
];

const REAL_PUBLIC_TRAINERS: Trainer[] = [
  {
    id: "t1", name: "Masoud Zatparvar", nameFa: "جاویدنام مسعود ذات‌پرور", gender: "male",
    cred: "late bodybuilding champion · memorial AI profile", credFa: "قهرمان فقید پرورش‌اندام · صفحه یادبود هوش مصنوعی",
    color: "#7bd93a", photo: "/trainers/t1.jpg", city: "Rasht", cityFa: "رشت", years: 25, rating: 5, clients: 1404,
    bio: "Memorial public profile for Masoud (Mehdi) Zatparvar, a Rasht-born bodybuilding champion and coach with a master's degree in sports physiology. According to public reports, he was killed in Rasht on January 8, 2026 / 18 Dey 1404 after being shot during protests. This page is managed by AI in his memory and is not an official family or coaching account.",
    bioFa: "پروفایل یادبود جاویدنام مسعود (مهدی) ذات‌پرور؛ قهرمان پرورش‌اندام اهل رشت، مربی بدنسازی و دانش‌آموخته کارشناسی ارشد فیزیولوژی ورزشی. بر اساس گزارش‌های عمومی، او پنج‌شنبه ۱۸ دی ۱۴۰۴ در جریان اعتراضات شهر رشت بر اثر اصابت گلوله جنگی جان باخت. این صفحه توسط هوش مصنوعی رمق به یاد جاویدنام مسعود ذات‌پرور اداره می‌شود و حساب رسمی خانواده یا همکاری مربیگری نیست.",
    specialties: [SP.hypertrophy, SP.contest, SP.strength, SP.programming],
    avatar: { skin: "#d69a6c", hair: "#1f1712", hairStyle: "quiff", beard: "beard", top: "#2e7d32" },
    contacts: { website: "fa.wikipedia.org/wiki/مسعود_ذات‌پرور" },
    news: [
      { date: "2026-07-10", title: "Memorial AI profile", titleFa: "پروفایل یادبود جاویدنام", body: "This AI-managed page preserves Masoud Zatparvar's public sports legacy with source links.", bodyFa: "این صفحه با هوش مصنوعی و با لینک به منابع عمومی، برای زنده نگه داشتن یاد و میراث ورزشی جاویدنام مسعود ذات‌پرور ساخته شده است." },
      { date: "2026-01-10", title: "Reported killed in Rasht protests", titleFa: "گزارش جان‌باختن در اعتراضات رشت", body: "Public reports say he was killed by gunfire during protests in Rasht.", bodyFa: "منابع عمومی گزارش کرده‌اند که او در اعتراضات رشت با اصابت گلوله جان باخت." },
    ],
    isPartner: false,
    sourceUrl: "https://fa.wikipedia.org/wiki/مسعود_ذات‌پرور",
  },
  {
    id: "t2", name: "Mahsa Akbarimehr", nameFa: "مهسا اکبری‌مهر", gender: "female",
    cred: "First Iranian IFBB Bikini Pro · online fitness coach", credFa: "اولین بانوی ایرانی IFBB Bikini Pro · مربی آنلاین فیتنس",
    color: "#56b8ff", photo: "https://www.girlswithmuscle.com/images/full/820229.jpg", city: "United States", cityFa: "آمریکا", years: 10, rating: 4.8, clients: 115000,
    bio: "Public profile for Mahsa Akbarimehr, an Iranian IFBB Bikini Pro and online fitness, fat-loss, and posing coach. Official social links are shown for contact.",
    bioFa: "پروفایل عمومی مهسا اکبری‌مهر، IFBB Bikini Pro ایرانی و مربی آنلاین فیتنس، کاهش چربی و پوزینگ. برای ارتباط از لینک‌های رسمی استفاده کنید.",
    specialties: [SP.women, SP.fatloss, SP.hypertrophy, SP.contest],
    avatar: { skin: "#e8b48c", hair: "#2a2018", hairStyle: "pony", top: "#1e88e5" },
    contacts: { instagram: "mahsa_ifbbpro" },
    news: [{ date: "2026-07-10", title: "IFBB Bikini Pro profile", titleFa: "پروفایل IFBB Bikini Pro", body: "Public directory entry with official Instagram.", bodyFa: "معرفی عمومی با لینک اینستاگرام رسمی." }],
    isPartner: false,
    sourceUrl: "https://www.instagram.com/mahsa_ifbbpro/",
  },
  {
    id: "t3", name: "Hany Rambod", nameFa: "هانی رامبد", gender: "male",
    cred: "25x Olympia-winning coach · FST-7 creator", credFa: "مربی قهرمانان المپیا · خالق سیستم FST-7",
    color: "#a78bfa", photo: "https://www.hanyrambod.com/wp-content/uploads/2025/07/Hany-TheTruthPodcast.png", city: "Dallas", cityFa: "دالاس", years: 20, rating: 4.9, clients: 3000000,
    bio: "Public profile for Hany Rambod, the Iranian-rooted bodybuilding coach known as The Pro Creator, with official FST-7 and social links.",
    bioFa: "پروفایل عمومی هانی رامبد، مربی بدنسازی ایرانی‌تبار معروف به Pro Creator و خالق FST-7، همراه با لینک‌های رسمی.",
    specialties: [SP.contest, SP.hypertrophy, SP.strength, SP.programming],
    avatar: { skin: "#d69a6c", hair: "#2a2018", hairStyle: "short", beard: "stubble", top: "#5e35b1" },
    contacts: { instagram: "hanyrambod", website: "hanyrambod.com", youtube: "@hanyrambod" },
    news: [{ date: "2026-07-10", title: "FST-7 public profile", titleFa: "پروفایل عمومی FST-7", body: "Official website and Instagram are linked.", bodyFa: "سایت رسمی و اینستاگرام در بخش ارتباط قرار گرفت." }],
    isPartner: false,
    sourceUrl: "https://www.hanyrambod.com/",
  },
  {
    id: "t4", name: "Damoon Ashtary", nameFa: "دامون اشتری", gender: "male",
    cred: "sports nutrition specialist · Fitamoon founder", credFa: "متخصص تغذیه ورزشی · بنیان‌گذار فیتامون",
    color: "#ff8fb0", photo: "/trainers/t4.png", city: "Dubai", cityFa: "دبی", years: 15, rating: 4.8, clients: 30000,
    bio: "Public profile for Damoon Ashtary, a sports nutrition specialist and fitness coach associated with Fitamoon. Official website and Instagram are shown.",
    bioFa: "پروفایل عمومی دامون اشتری، متخصص تغذیه ورزشی و مربی بدنسازی مرتبط با فیتامون. لینک رسمی سایت و اینستاگرام در صفحه آمده است.",
    specialties: [SP.nutrition, SP.fatloss, SP.hypertrophy, SP.performance],
    avatar: { skin: "#d9a273", hair: "#211a13", hairStyle: "quiff", beard: "stubble", top: "#ec407a" },
    contacts: { instagram: "damoon_ashtary", website: "fitamoon.com" },
    news: [{ date: "2026-07-10", title: "Fitamoon public profile", titleFa: "پروفایل عمومی فیتامون", body: "Official Fitamoon website is linked.", bodyFa: "سایت رسمی فیتامون در بخش ارتباط اضافه شد." }],
    isPartner: false,
    sourceUrl: "https://fitamoon.com/",
  },
  {
    id: "t5", name: "Dr. Omid Salehian", nameFa: "دکتر امید صالحیان", gender: "male",
    cred: "sports nutrition and fitness specialist", credFa: "متخصص تغذیه ورزشی و تناسب اندام",
    color: "#ffc94d", photo: "https://drsalehian.ir/wp-content/uploads/2025/02/%D8%AF%DA%A9%D8%AA%D8%B1-%D8%A7%D9%85%DB%8C%D8%AF-%D8%B5%D8%A7%D9%84%D8%AD%DB%8C%D8%A7%D9%86-%D9%85%D8%AA%D8%AE%D8%B5%D8%B5-%D8%AA%D8%BA%D8%B0%DB%8C%D9%87-%D9%88%D8%B1%D8%B2%D8%B4%DB%8C.jpg", city: "Tehran", cityFa: "تهران", years: 20, rating: 4.8, clients: 50000,
    bio: "Public profile for Dr. Omid Salehian, sports nutrition and fitness specialist, author, translator, and educator with official website links.",
    bioFa: "پروفایل عمومی دکتر امید صالحیان، متخصص تغذیه ورزشی و تناسب اندام، مدرس و مولف/مترجم، همراه با لینک‌های رسمی.",
    specialties: [SP.nutrition, SP.clinical, SP.performance, SP.programming],
    avatar: { skin: "#c98a5e", hair: "#17130f", hairStyle: "short", beard: "stubble", top: "#f9a825" },
    contacts: { instagram: "dr.salehian", website: "drsalehian.ir" },
    news: [{ date: "2026-07-10", title: "Sports nutrition profile", titleFa: "پروفایل تغذیه ورزشی", body: "Official website and Instagram are linked.", bodyFa: "سایت و اینستاگرام رسمی در صفحه قرار گرفت." }],
    isPartner: false,
    sourceUrl: "https://drsalehian.ir/",
  },
  {
    id: "t6", name: "Dr. Mohammad Sadegh Kermany", nameFa: "دکتر محمد صادق کرمانی", gender: "male",
    cred: "weight management and online diet brand", credFa: "رژیم درمانی و مدیریت وزن آنلاین",
    color: "#3ee08f", photo: "/trainers/t6.jpg", city: "Iran", cityFa: "ایران", years: 25, rating: 4.8, clients: 1000000,
    bio: "Public profile for Dr. Kermany and the Behandam/Kermany online diet ecosystem. This page links to the official Kermany website and Instagram.",
    bioFa: "پروفایل عمومی دکتر کرمانی و مجموعه رژیم آنلاین به‌اندام/کرمانی. لینک سایت رسمی و اینستاگرام در صفحه قرار دارد.",
    specialties: [SP.clinical, SP.nutrition, SP.fatloss, SP.gut],
    avatar: { skin: "#ecc2a0", hair: "#241c17", hairStyle: "short", top: "#43a047" },
    contacts: { instagram: "drkermany", website: "kermany.com", phone: "02532143", email: "info@kermany.com" },
    news: [{ date: "2026-07-10", title: "Official diet ecosystem", titleFa: "اکوسیستم رسمی رژیم آنلاین", body: "Official Kermany website and app links are used.", bodyFa: "لینک رسمی سایت کرمانی و اطلاعات عمومی آن استفاده شده است." }],
    isPartner: false,
    sourceUrl: "https://kermany.com/",
  },
  {
    id: "t7", name: "Sattar Mirlohi", nameFa: "ستار میرلوحی", gender: "male",
    cred: "personal trainer · exercise physiologist", credFa: "مربی خصوصی · فیزیولوژیست ورزشی",
    color: "#b8f24a", photo: "https://ipanel.istgah.com/images/2022/11/21/-2592458_7ce4Df_r.jpg", city: "Tehran", cityFa: "تهران", years: 12, rating: 4.7, clients: 700000,
    bio: "Public profile for Sattar Mirlohi, a Tehran-based personal and online fitness trainer known publicly as Sattar Fit.",
    bioFa: "پروفایل عمومی ستار میرلوحی، مربی خصوصی و آنلاین فیتنس در تهران که با نام ستار فیت شناخته می‌شود.",
    specialties: [SP.fatloss, SP.hypertrophy, SP.programming, SP.strength],
    avatar: { skin: "#d9a273", hair: "#211a13", hairStyle: "quiff", top: "#9ccc2b" },
    contacts: { instagram: "sattar.fit" },
    news: [{ date: "2026-07-10", title: "Sattar Fit profile", titleFa: "پروفایل ستار فیت", body: "Official Instagram is linked for updates.", bodyFa: "اینستاگرام رسمی برای پیگیری قرار گرفت." }],
    isPartner: false,
    sourceUrl: "https://www.instagram.com/sattar.fit/",
  },
  {
    id: "t8", name: "Reza Eftekhar", nameFa: "رضا افتخار", gender: "male",
    cred: "nutrition and diet therapy specialist", credFa: "متخصص تغذیه و رژیم‌درمانی",
    color: "#ee5f7b", photo: "/trainers/t8.jpg", city: "Mashhad", cityFa: "مشهد", years: 10, rating: 4.7, clients: 5000,
    bio: "Public profile for Reza Eftekhar, nutrition and diet therapy specialist in Mashhad, with public booking and Instagram references.",
    bioFa: "پروفایل عمومی رضا افتخار، متخصص تغذیه و رژیم‌درمانی در مشهد، با ارجاع به منابع نوبت‌دهی و اینستاگرام عمومی.",
    specialties: [SP.clinical, SP.nutrition, SP.fatloss, SP.gut],
    avatar: { skin: "#eabf9c", hair: "#2b211a", hairStyle: "short", top: "#e91e63" },
    contacts: { instagram: "eftekhar_diet", website: "eftekhardiet.ir" },
    news: [{ date: "2026-07-10", title: "Nutrition directory profile", titleFa: "پروفایل عمومی تغذیه", body: "Public booking sources list the Instagram handle.", bodyFa: "منابع نوبت‌دهی عمومی آیدی اینستاگرام را ذکر کرده‌اند." }],
    isPartner: false,
    sourceUrl: "https://drdr.ir/dr/73822/%D8%B1%D8%B6%D8%A7-%D8%A7%D9%81%D8%AA%D8%AE%D8%A7%D8%B1/",
  },
  {
    id: "t9", name: "Arash Rahbar", nameFa: "آرش رهبر", gender: "male",
    cred: "IFBB Classic Physique Pro · 4x Olympian", credFa: "بدنساز حرفه‌ای IFBB Classic Physique · چهار بار حضور در Olympia",
    color: "#4fd1c5", photo: "https://www.greatestphysiques.com/wp-content/uploads/2017/06/Arash-Rahbar.09.jpg", city: "United States", cityFa: "آمریکا", years: 15, rating: 4.8, clients: 614000,
    bio: "Public profile for Arash Rahbar, an Iranian IFBB Classic Physique Pro and Olympia athlete known for training, physique education, and the Arash Method app.",
    bioFa: "پروفایل عمومی آرش رهبر، بدنساز ایرانی IFBB Classic Physique Pro و ورزشکار المپیا که برای آموزش تمرین، فیزیک کلاسیک و Arash Method شناخته می‌شود. این صفحه معرفی عمومی است و به معنی همکاری رسمی با رمق نیست.",
    specialties: [SP.hypertrophy, SP.contest, SP.strength, SP.programming],
    avatar: { skin: "#d69a6c", hair: "#17130f", hairStyle: "short", beard: "beard", top: "#00897b" },
    contacts: { instagram: "arashrahbar", website: "arashrahbar.com", youtube: "@ArashRahbar" },
    news: [{ date: "2026-07-10", title: "Classic Physique public profile", titleFa: "پروفایل عمومی Classic Physique", body: "Official Instagram and public sources identify him as an IFBB Classic Physique Pro and Olympia athlete.", bodyFa: "اینستاگرام رسمی و منابع عمومی او را به عنوان IFBB Classic Physique Pro و ورزشکار Olympia معرفی می‌کنند." }],
    isPartner: false,
    sourceUrl: "https://www.instagram.com/arashrahbar/",
  },
];

// Public figures use real public photos from official or directory sources; the
// illustrated portrait in <TrainerAvatar> stays only as an error fallback.
const ACTIVE_TRAINERS = REAL_PUBLIC_TRAINERS.length > 0 ? REAL_PUBLIC_TRAINERS : RAW_TRAINERS;

export const TRAINERS: Trainer[] = ACTIVE_TRAINERS.map((t) => ({
  ...t,
  photo: t.photo ?? `/trainers/${t.id}.jpg`,
}));

export const GYM_TRAINER_IDS = ["t1", "t2", "t3", "t9"] as const;
export const DIET_TRAINER_IDS = ["t4", "t5", "t6", "t8"] as const;

const GYM_POOL = [...GYM_TRAINER_IDS];
const DIET_POOL = [...DIET_TRAINER_IDS];

export function trainersForPlanKind(kind: MarketPlan["kind"]): Trainer[] {
  const ids = kind === "gym" ? GYM_TRAINER_IDS : DIET_TRAINER_IDS;
  return ids
    .map((id) => TRAINERS.find((trainer) => trainer.id === id))
    .filter((trainer): trainer is Trainer => Boolean(trainer));
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic author per plan (stable across sessions). */
export function trainerOf(plan: MarketPlan): Trainer {
  const pool = plan.kind === "gym" ? GYM_POOL : DIET_POOL;
  const id = pool[hash(plan.id) % pool.length];
  return TRAINERS.find((t) => t.id === id)!;
}

export function getTrainer(id: string): Trainer | undefined {
  return TRAINERS.find((t) => t.id === id);
}

/** All plans authored by a given trainer (stable, via trainerOf). */
export function plansByTrainer(id: string): MarketPlan[] {
  return ALL_PLANS.filter((p) => trainerOf(p).id === id);
}

// ---- Categories ----

export const CATEGORIES = [
  "strength",
  "muscle",
  "fatloss",
  "home",
  "women",
  "performance",
  "health",
  "halal",
  "plant",
] as const;
export type MarketCategory = (typeof CATEGORIES)[number];

export const CATEGORY_FA: Record<MarketCategory, string> = {
  strength: "قدرت",
  muscle: "عضله و حجم",
  fatloss: "چربی‌سوزی",
  home: "خانگی",
  women: "بانوان",
  performance: "عملکردی",
  health: "سلامتی",
  halal: "حلال",
  plant: "گیاهی",
};

export const CATEGORY_EN: Record<MarketCategory, string> = {
  strength: "Strength",
  muscle: "Muscle",
  fatloss: "Fat loss",
  home: "Home",
  women: "Women",
  performance: "Performance",
  health: "Health",
  halal: "Halal",
  plant: "Plant-based",
};

const CAT_OVERRIDES: Record<string, MarketCategory> = {
  "g-home3-body": "home",
  "g-home4-band": "home",
  "g-home3-fat": "home",
  "g-db3-full": "home",
  "g-db4-ul": "home",
  "g-w-glute4": "women",
  "g-w-tone3": "women",
  "g-over40": "health",
  "g-office": "health",
  "d-over40h": "health",
  "d-gut": "health",
  "d-med": "health",
  "d-women-tone": "women",
};

export function categoryOf(plan: MarketPlan): MarketCategory {
  const o = CAT_OVERRIDES[plan.id];
  if (o) return o;
  if (plan.kind === "gym") {
    if (plan.goal === "strength") return "strength";
    if (plan.goal === "endurance") return "performance";
    return "muscle";
  }
  if (plan.style === "halal") return "halal";
  if (plan.style === "vegan" || plan.style === "vegetarian") return "plant";
  if (plan.goal === "lose") return "fatloss";
  if (plan.goal === "gain") return "muscle";
  return "health";
}

export const ALL_PLANS: MarketPlan[] = [...GYM_PLANS, ...DIET_PLANS];

export function getPlan(id: string): MarketPlan | undefined {
  return ALL_PLANS.find((p) => p.id === id);
}

// ---- Apply ----

export function applyGymPlan(plan: GymPlan, index: ExerciseIndex): Program {
  return buildProgram(
    buildSplit(plan.split, plan.days),
    index,
    plan.goal,
    plan.level,
    plan.equip
  );
}

const DEFAULT_STATS = {
  age: 28,
  heightCm: 175,
  weightKg: 75,
  activity: "moderate" as ActivityLevel,
};

export function dietProfileFromPlan(
  plan: DietPlanTpl,
  base: DietProfile | undefined,
  sex: "male" | "female"
): DietProfile {
  return {
    id: DIET_PROFILE_ID,
    sex: base?.sex ?? sex,
    age: base?.age ?? DEFAULT_STATS.age,
    heightCm: base?.heightCm ?? DEFAULT_STATS.heightCm,
    weightKg: base?.weightKg ?? DEFAULT_STATS.weightKg,
    activity: base?.activity ?? DEFAULT_STATS.activity,
    allergens: base?.allergens ?? [],
    goal: plan.goal,
    style: plan.style,
    bias: plan.bias,
    mealsPerDay: plan.mealsPerDay,
  };
}
