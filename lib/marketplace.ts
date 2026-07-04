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

export interface Trainer {
  id: string;
  name: string;
  nameFa: string;
  cred: string;
  credFa: string;
  color: string; // avatar gradient seed
}

export const TRAINERS: Trainer[] = [
  { id: "t1", name: "Amir Rostami", nameFa: "امیر رستمی", cred: "IFBB-certified coach · 12y", credFa: "مربی رسمی فدراسیون بدنسازی · ۱۲ سال سابقه", color: "#7bd93a" },
  { id: "t2", name: "Sara Mohammadi", nameFa: "سارا محمدی", cred: "MSc Exercise Physiology", credFa: "کارشناس ارشد فیزیولوژی ورزشی", color: "#56b8ff" },
  { id: "t3", name: "Dr. Reza Karimi", nameFa: "دکتر رضا کریمی", cred: "PhD Strength & Conditioning", credFa: "دکترای علوم تمرین و قدرت", color: "#a78bfa" },
  { id: "t4", name: "Maryam Ahmadi", nameFa: "مریم احمدی", cred: "Sports Nutritionist", credFa: "متخصص تغذیه‌ی ورزشی", color: "#ff8fb0" },
  { id: "t5", name: "Hossein Ghasemi", nameFa: "حسین قاسمی", cred: "CrossFit L2 Trainer", credFa: "مربی کراس‌فیت سطح ۲", color: "#ffc94d" },
  { id: "t6", name: "Dr. Negar Mousavi", nameFa: "دکتر نگار موسوی", cred: "PhD Clinical Nutrition", credFa: "دکترای تغذیه‌ی بالینی", color: "#3ee08f" },
  { id: "t7", name: "Ali Nazari", nameFa: "علی نظری", cred: "Athletic Performance Coach", credFa: "مربی آمادگی جسمانی", color: "#b8f24a" },
  { id: "t8", name: "Shima Rahimi", nameFa: "شیما رحیمی", cred: "Corrective Exercise Specialist", credFa: "متخصص حرکات اصلاحی و یوگا", color: "#ee5f7b" },
];

const GYM_POOL = ["t1", "t2", "t3", "t5", "t7", "t8"];
const DIET_POOL = ["t4", "t6", "t2", "t8"];

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
