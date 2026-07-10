// Bilingual dictionary (Persian default, English toggle). Values are [fa, en].

export type Lang = "fa" | "en";

type Entry = readonly [string, string];

export const DICT: Record<string, Entry> = {
  // Brand
  "app.name": ["رمق", "Ramagh"],
  "app.tagline": ["تمرین و تغذیه‌ی تو، یکجا", "Your training & nutrition, together"],
  "app.slogan": ["انرژی‌ات را بساز، قوی‌تر از دیروز", "Build your energy — stronger than yesterday"],

  // Common
  "common.loading": ["در حال بارگذاری…", "Loading…"],
  "common.save": ["ذخیره", "Save"],
  "common.edit": ["ویرایش", "Edit"],
  "common.remove": ["حذف", "Remove"],
  "common.done": ["تمام", "Done"],
  "common.cancel": ["انصراف", "Cancel"],
  "common.start": ["شروع", "Start"],
  "common.plan": ["برنامه‌ریزی", "Plan"],
  "common.settings": ["تنظیمات", "Settings"],
  "common.notFound": ["پیدا نشد", "Not found"],
  "common.exercisesN": ["{n} تمرین", "{n} exercises"],
  "common.male": ["مرد", "Male"],
  "common.female": ["زن", "Female"],

  // Nav
  "nav.home": ["خانه", "Home"],
  "nav.train": ["تمرین", "Train"],
  "nav.library": ["کتابخانه", "Library"],
  "nav.diet": ["تغذیه", "Diet"],
  "nav.store": ["بازار", "Store"],
  "nav.history": ["تاریخچه", "History"],

  // Home
  "home.move": ["بزن بریم!", "Let's move."],
  "home.thisWeek": ["تمرین این هفته", "workouts this week"],
  "home.allTime": ["کل تمرین‌ها", "all-time"],
  "home.today": ["امروز · {day}", "Today · {day}"],
  "home.startWorkout": ["شروع تمرین", "Start workout"],
  "home.noToday": ["برای امروز تمرینی تنظیم نشده", "No workout set for today"],
  "home.noTodayHint": [
    "یک روز از برنامه‌ی پایین را انتخاب کن یا برنامه‌ات را بساز.",
    "Pick any day from your split below, or plan your program.",
  ],
  "home.qlLibrary": ["کتابخانه", "Library"],
  "home.qlDiet": ["تغذیه", "Diet"],
  "home.qlPlans": ["پلن‌ها", "Plans"],
  "home.yourWeek": ["هفته‌ی تو", "Your week"],
  "home.buildProgram": ["برنامه‌ات را بساز ←", "Build your program →"],
  "home.rest": ["استراحت / تعیین‌نشده", "Rest / unassigned"],
  "home.todayBadge": ["امروز", "Today"],

  // Onboarding
  "ob.title": ["تنظیم تمرین تو", "Set up your training"],
  "ob.subtitle": [
    "چند انتخاب سریع و ما یک برنامه‌ی علمی برایت می‌سازیم.",
    "A few quick choices and we'll build a science-based plan.",
  ],
  "ob.who": ["چه کسی تمرین می‌کند؟", "Who's training?"],
  "ob.level": ["سطح تجربه", "Experience level"],
  "ob.beginner": ["مبتدی", "Beginner"],
  "ob.advanced": ["پیشرفته", "Advanced"],
  "ob.levelHint": [
    "حالت مبتدی تمرین‌های پیشرفته را پنهان می‌کند. هر زمان قابل تغییر است.",
    "Beginner hides Advanced-level exercises. Change anytime.",
  ],
  "ob.goal": ["هدف اصلی", "Primary goal"],
  "ob.focus": ["تمرکز تمرین", "Training focus"],
  "ob.muscles": ["عضلات", "Muscles"],
  "ob.joints": ["مفاصل", "Joints"],
  "ob.focusHint": [
    "«مفاصل» تمرین‌های کششی و تحرکی را نشان می‌دهد.",
    "“Joints” surfaces stretching & mobility work.",
  ],
  "ob.days": ["روز در هفته", "Days per week"],
  "ob.create": ["ساخت برنامه‌ی من", "Create my program"],
  "ob.building": ["در حال ساخت برنامه…", "Building your plan…"],

  // Goals (training)
  "goal.strength": ["قدرت", "Strength"],
  "goal.strengthHint": ["سنگین، تکرار کم، استراحت زیاد", "Heavy, low reps, long rest"],
  "goal.hypertrophy": ["عضله", "Muscle"],
  "goal.hypertrophyHint": ["تکرار متوسط، استراحت متوسط", "Moderate reps, moderate rest"],
  "goal.endurance": ["استقامت", "Endurance"],
  "goal.enduranceHint": ["تکرار زیاد، استراحت کم", "High reps, short rest"],

  // Library
  "lib.title": ["کتابخانه‌ی تمرین‌ها", "Exercise Library"],
  "lib.subtitle": [
    "کل مجموعه‌ی مسل‌ویکی. بر اساس عضله و ابزار فیلتر کن.",
    "Browse MuscleWiki. Filter by body part and equipment.",
  ],
  "lib.search": ["جستجوی تمرین…", "Search exercises…"],
  "lib.allParts": ["همه", "All parts"],
  "lib.locAll": ["همه‌جا", "Anywhere"],
  "lib.locHome": ["خانه", "Home"],
  "lib.locGym": ["باشگاه", "Gym"],
  "lib.allGear": ["همه‌ی ابزار", "All gear"],
  "lib.equipment": ["ابزار تمرین", "Equipment"],
  "lib.countN": ["{n} تمرین", "{n} exercise(s)"],
  "lib.showMore": ["نمایش بیشتر ({n} مانده)", "Show more ({n} left)"],
  "lib.noMatch": ["تمرینی با این فیلترها پیدا نشد.", "No exercises match these filters."],
  "lib.tapBody": ["روی بدن بزن تا عضله انتخاب شود", "Tap the body to pick a muscle"],
  "lib.loadError": [
    "بارگذاری دیتای تمرین‌ها ناموفق بود. دوباره تلاش کن.",
    "Couldn't load the exercise data. Reload.",
  ],

  // Exercise detail
  "ex.force": ["نیرو", "Force"],
  "ex.type": ["نوع", "Type"],
  "ex.grip": ["گرفتن", "Grip"],
  "ex.musclesWorked": ["عضلات درگیر", "Muscles worked"],
  "ex.howTo": ["روش انجام", "How to"],
  "ex.addToDay": ["افزودن به یک روز تمرین", "Add to a workout day"],
  "ex.alreadyIn": ["قبلاً در {day} هست", "Already in {day}"],
  "ex.addedTo": ["به {day} اضافه شد", "Added to {day}"],
  "ex.noProgram": ["هنوز برنامه‌ای نیست.", "No program yet."],
  "ex.createFirst": ["اول یکی بساز", "Create one first"],
  "ex.noVideo": ["ویدیوی نمایشی ندارد", "No demo video"],

  // Program
  "prog.title": ["برنامه‌ی تو", "Your Program"],
  "prog.subtitle": [
    "به هر روز یک تمرکز بده، بعد تمرین اضافه کن.",
    "Assign a focus to each day, then add exercises.",
  ],
  "prog.create4": ["ساخت برنامه‌ی ۴ روزه", "Create a 4-day program"],
  "prog.editExercises": ["ویرایش", "Edit"],
  "prog.addDay": ["افزودن روز تمرین", "Add a training day"],
  "prog.start": ["شروع", "Start"],
  "prog.kcalEst": ["≈ {n} کالری", "≈ {n} kcal"],
  "prog.noFocus": ["تمرکزی تعیین نشده", "No focus set"],
  "prog.tapAdd": ["برای افزودن / حذف بزن", "Tap to add / remove"],
  "prog.noExercises": ["هنوز تمرینی نیست. از پایین اضافه کن.", "No exercises yet. Add some below."],
  "prog.addExercises": ["افزودن تمرین", "Add exercises"],
  "prog.sets": ["ست", "Sets"],
  "prog.reps": ["تکرار", "Reps"],
  "prog.seconds": ["ثانیه", "Seconds"],
  "prog.rest": ["استراحت", "Rest"],

  // Workout player
  "wo.exerciseOf": ["تمرین {i} از {n}", "Exercise {i} / {n}"],
  "wo.skip": ["رد", "Skip"],
  "wo.rest": ["استراحت", "Rest"],
  "wo.untilNext": ["تا ست بعدی", "until next set"],
  "wo.setOf": ["ست {i} از {n}", "Set {i} of {n}"],
  "wo.repRange": ["{min}–{max} تکرار · {rir} تا ناتوانی", "{min}–{max} reps · RIR {rir}"],
  "wo.reps": ["تکرار", "Reps"],
  "wo.weight": ["وزن", "Weight"],
  "wo.doneSet": ["ست انجام شد", "Done set"],
  "wo.startHold": ["شروع نگه‌داشتن {n} ثانیه", "Start {n}s hold"],
  "wo.pause": ["توقف", "Pause"],
  "wo.resume": ["ادامه", "Resume"],
  "wo.hold": ["نگه‌دار", "hold"],
  "wo.skipRest": ["رد استراحت ←", "Skip rest →"],
  "wo.startNext": ["شروع تمرین بعدی ←", "Start next exercise →"],
  "wo.exerciseDone": ["این تمرین تمام شد!", "Exercise complete!"],
  "wo.upNext": ["بعدی: {x}", "Up next: {x}"],
  "wo.nextSet": ["ست {n} · {x}", "Set {n} · {x}"],
  "wo.finish": ["پایان", "Finish"],
  "wo.complete": ["تمرین تمام شد!", "Workout complete!"],
  "wo.setsDone": ["{day} · {n} ست انجام شد", "{day} · {n} sets done"],
  "wo.kcalBurned": ["حدود {n} کالری سوزاندی", "≈ {n} kcal burned"],
  "wo.saveWorkout": ["ذخیره‌ی تمرین", "Save workout"],
  "wo.discard": ["حذف", "Discard"],
  "wo.leaveConfirm": [
    "از این تمرین خارج می‌شوی؟ پیشرفت ذخیره نمی‌شود.",
    "Leave this workout? Progress won't be saved.",
  ],
  "wo.noExercises": ["این روز هنوز تمرینی ندارد.", "This day has no exercises yet."],
  "wo.notFound": ["تمرین پیدا نشد.", "Workout not found."],

  // History
  "hist.title": ["تاریخچه", "History"],
  "hist.subtitle": ["تمرین‌های کامل‌شده‌ی تو.", "Your completed workouts."],
  "hist.empty": ["هنوز تمرینی نیست", "No workouts yet"],
  "hist.emptyHint": [
    "یک تمرین را کامل کن تا اینجا با ست‌های ثبت‌شده نمایش داده شود.",
    "Finish a workout and it'll show up here with your logged sets.",
  ],
  "hist.minN": ["{n} دقیقه", "{n} min"],
  "hist.setsN": ["{n} ست", "{n} sets"],

  // Diet
  "diet.title": ["رژیم و تغذیه", "Diet & Nutrition"],
  "diet.buildTitle": ["برنامه‌ی تغذیه‌ات را بساز", "Build your nutrition plan"],
  "diet.buildHint": [
    "سن، وزن، قد، هدف و سبک غذایت را بگو تا کالری، درشت‌مغذی‌ها، وعده‌ها و مکمل‌ها را حساب کنیم.",
    "Tell us your age, weight, height, goal and diet style — we'll calculate your calories, macros, meals, and supplements.",
  ],
  "diet.getStarted": ["شروع", "Get started"],
  "diet.subtitle": ["{goal} · پایه ≈ {n} کالری", "{goal} · maintenance ≈ {n} kcal"],
  "diet.dailyTarget": ["هدف روزانه", "Daily target"],
  "diet.kcal": ["کالری", "kcal"],
  "diet.protein": ["پروتئین", "Protein"],
  "diet.carbs": ["کربوهیدرات", "Carbs"],
  "diet.fat": ["چربی", "Fat"],
  "diet.fiber": ["فیبر ≥ {n} گرم", "Fiber ≥ {n} g"],
  "diet.water": ["آب ≈ {n} لیتر", "Water ≈ {n} L"],
  "diet.oneDay": ["۱ روز", "1 day"],
  "diet.week": ["هفته", "Week"],
  "diet.regenerate": ["تولید دوباره", "Regenerate"],
  "diet.dayN": ["روز {n}", "Day {n}"],
  "diet.dayTotal": ["مجموع روز", "Day total"],
  "diet.suppTitle": ["مکمل‌ها", "Supplements"],
  "diet.suppNote": [
    "راهنمایی کلی، نه توصیه‌ی پزشکی. برای نیاز خودت با متخصص مشورت کن.",
    "General guidance, not medical advice. Check with a professional for your needs.",
  ],
  "diet.mealsPerDayN": ["{n} وعده در روز", "{n} meals/day"],
  "diet.style": ["سبک", "Style"],
  "diet.goal": ["هدف", "Goal"],
  "diet.sampleDay": ["نمونه‌ی یک روز", "Sample day"],
  "diet.torobFrom": ["از {p} تومان", "from {p} Toman"],
  "diet.viewTorob": ["ترب", "Torob"],
  "diet.priceNA": ["قیمت لحظه‌ای در دسترس نیست", "Live price unavailable"],
  "diet.estPrice": ["تخمین قیمت", "Est. price"],
  "diet.toman": ["تومان", "Toman"],
  "diet.onTorob": ["دیدن در ترب", "View on Torob"],
  "diet.downloadPdf": ["دانلود برنامه (PDF)", "Download plan (PDF)"],
  "diet.designing": ["در حال طراحی برنامه‌ی تو…", "Designing your plan…"],
  "diet.gen1": ["تحلیل نیازها و هدف تو", "Analyzing your needs & goal"],
  "diet.gen2": ["محاسبه‌ی کالری و درشت‌مغذی‌ها", "Calculating calories & macros"],
  "diet.gen3": ["طراحی وعده‌های غذایی", "Designing your meals"],
  "diet.gen4": ["انتخاب مکمل‌های مناسب", "Selecting the right supplements"],
  "peri.title": ["تغذیه‌ی دور تمرین", "Peri-workout nutrition"],
  "peri.subtitle": ["چی و کِی بخوری تا بیشترین نتیجه را از تمرین بگیری", "What & when to eat to get the most from training"],
  "peri.pre": ["قبل تمرین", "Pre-workout"],
  "peri.post": ["بعد تمرین", "Post-workout"],
  "peri.hydration": ["آب‌رسانی", "Hydration"],
  "pr.title": ["رکوردهای شخصی تو", "Your personal records"],
  "pr.subtitle": ["بهترین رکورد هر حرکت — اضافه‌بار تدریجی را دنبال کن", "Your best lift per move — chase progressive overload"],
  "pr.est1RM": ["یک‌تکرار بیشینه‌ی تخمینی", "Estimated 1-rep max"],
  "diet.livePriceNote": ["قیمت‌ها به‌صورت زنده از ترب گرفته می‌شوند", "Live prices from Torob"],

  // Meals
  "meal.Breakfast": ["صبحانه", "Breakfast"],
  "meal.Lunch": ["ناهار", "Lunch"],
  "meal.Dinner": ["شام", "Dinner"],
  "meal.Snack": ["میان‌وعده", "Snack"],

  // Diet setup
  "ds.title": ["مشخصات تو", "Your details"],
  "ds.subtitle": [
    "کالری، درشت‌مغذی‌ها و یک برنامه‌ی غذایی برایت حساب می‌کنیم.",
    "We'll calculate your calories, macros, and a meal plan.",
  ],
  "ds.sex": ["جنسیت", "Sex"],
  "ds.age": ["سن", "Age"],
  "ds.height": ["قد", "Height"],
  "ds.weight": ["وزن", "Weight"],
  "ds.activity": ["سطح فعالیت", "Activity level"],
  "ds.goal": ["هدف", "Goal"],
  "ds.dietStyle": ["سبک تغذیه", "Diet style"],
  "ds.avoid": ["پرهیز (اختیاری)", "Avoid (optional)"],
  "ds.mealsPerDay": ["وعده در روز", "Meals per day"],
  "ds.generate": ["ساخت برنامه‌ی من", "Generate my plan"],
  "ds.generating": ["در حال ساخت…", "Building plan…"],
  "ds.yr": ["سال", "yr"],
  "ds.cm": ["سانت", "cm"],
  "ds.kg": ["کیلو", "kg"],

  // Activity
  "act.sedentary": ["کم‌تحرک", "Sedentary"],
  "act.sedentaryHint": ["ورزش کم یا هیچ", "Little or no exercise"],
  "act.light": ["سبک", "Light"],
  "act.lightHint": ["۱ تا ۳ روز در هفته", "1–3 days / week"],
  "act.moderate": ["متوسط", "Moderate"],
  "act.moderateHint": ["۳ تا ۵ روز در هفته", "3–5 days / week"],
  "act.active": ["فعال", "Active"],
  "act.activeHint": ["۶ تا ۷ روز در هفته", "6–7 days / week"],
  "act.athlete": ["ورزشکار", "Athlete"],
  "act.athleteHint": ["روزانه سنگین / کار بدنی", "Hard daily / physical job"],

  // Diet goals
  "dgoal.lose": ["کاهش چربی", "Lose fat"],
  "dgoal.loseHint": ["حدود ۲۰٪ کسری کالری", "~20% calorie deficit"],
  "dgoal.maintain": ["نگه‌داری", "Maintain"],
  "dgoal.maintainHint": ["حفظ وزن فعلی", "Stay at your weight"],
  "dgoal.gain": ["عضله‌سازی", "Build muscle"],
  "dgoal.gainHint": ["حدود ۱۲٪ مازاد کالری", "~12% calorie surplus"],

  // Diet styles
  "style.omnivore": ["همه‌چیزخوار", "Omnivore"],
  "style.halal": ["حلال", "Halal"],
  "style.vegetarian": ["گیاه‌خوار", "Vegetarian"],
  "style.vegan": ["وگان", "Vegan"],

  // Allergens
  "alg.dairy": ["لبنیات", "Dairy"],
  "alg.egg": ["تخم‌مرغ", "Egg"],
  "alg.nuts": ["آجیل", "Nuts"],
  "alg.gluten": ["گلوتن", "Gluten"],
  "alg.fish": ["ماهی", "Fish"],

  // Market
  "mkt.title": ["بازار برنامه‌ها", "Marketplace"],
  "mkt.subtitle": ["{n} برنامه‌ی آماده‌ی تمرین و تغذیه", "{n} ready-made training & nutrition plans"],
  "mkt.all": ["همه", "All"],
  "mkt.workouts": ["تمرین‌ها", "Workouts"],
  "mkt.diets": ["رژیم‌ها", "Diets"],
  "mkt.use": ["استفاده از این برنامه", "Use this plan"],
  "mkt.applying": ["در حال اعمال…", "Applying…"],
  "mkt.replaceConfirm": [
    "برنامه‌ی فعلی با «{name}» جایگزین شود؟",
    "Replace your current program with “{name}”?",
  ],
  "mkt.useDietConfirm": [
    "«{name}» به‌عنوان برنامه‌ی تغذیه‌ات استفاده شود؟",
    "Use “{name}” as your nutrition plan?",
  ],
  "mkt.goal": ["هدف", "Goal"],
  "mkt.daysWk": ["روز/هفته", "Days"],
  "mkt.level": ["سطح", "Level"],
  "mkt.prescription": [
    "تجویز: حرکات ترکیبی {cs}×{cr} (استراحت {crest} ثانیه)، تک‌مفصلی {is}×{ir} (استراحت {irest} ثانیه).",
    "Prescription: compounds {cs}×{cr} ({crest}s rest), isolation {is}×{ir} ({irest}s rest).",
  ],
  "mkt.weekly": ["برنامه‌ی هفتگی", "Weekly schedule"],
  "mkt.buildingPreview": ["در حال ساخت پیش‌نمایش…", "Building preview…"],
  "mkt.statsNote": [
    "هدف‌ها بر اساس مشخصات ذخیره‌شده‌ات (یا پیش‌فرض) هستند — بعد از اعمال در تنظیمات تغذیه دقیق‌ترشان کن.",
    "Targets use your saved body stats (or defaults) — refine them in Diet settings after applying.",
  ],

  // Levels
  "level.beginner": ["مبتدی", "Beginner"],
  "level.advanced": ["پیشرفته", "Advanced"],

  // Profile
  "prof.title": ["پروفایل", "Profile"],
  "prof.guest": ["کاربر مهمان", "Guest user"],
  "prof.connected": ["متصل با گوگل", "Connected with Google"],
  "prof.local": ["حساب محلی", "Local account"],
  "prof.signIn": ["ورود / ساخت حساب", "Sign in / create account"],
  "prof.signOut": ["خروج از حساب", "Sign out"],
  "prof.signOutConfirm": ["از حساب خارج می‌شوی؟", "Sign out of your account?"],
  "prof.body": ["مشخصات بدن", "Body stats"],
  "prof.training": ["تنظیمات تمرین", "Training settings"],
  "prof.editTraining": ["ویرایش تمرین", "Edit training"],
  "prof.editDiet": ["ویرایش تغذیه", "Edit nutrition"],
  "prof.stats": ["آمار", "Stats"],
  "prof.workouts": ["تمرین", "workouts"],
  "prof.usage": ["مصرف رایگان", "Free usage"],
  "prof.usageOf": ["{n} از {m} اقدام رایگان", "{n} of {m} free actions"],
  "prof.unlimited": ["نامحدود — حساب متصل است", "Unlimited — account connected"],
  "prof.language": ["زبان", "Language"],
  "prof.age": ["سن", "Age"],
  "prof.height": ["قد", "Height"],
  "prof.weight": ["وزن", "Weight"],
  "prof.notSet": ["ثبت نشده", "Not set"],
  "prof.editName": ["نام جدید را وارد کن:", "Enter a new name:"],

  // Login
  "login.title": ["ورود به رمق", "Sign in to Ramagh"],
  "login.subtitle": [
    "برای ادامه‌ی استفاده‌ی نامحدود، حساب بساز یا وارد شو.",
    "Create an account or sign in to keep using Ramagh without limits.",
  ],
  "login.limitBanner": [
    "سهم استفاده‌ی رایگان تمام شد. با ورود، بدون محدودیت ادامه بده — داده‌هایت همین‌جا روی دستگاهت می‌ماند.",
    "You've used your free quota. Sign in to continue without limits — your data stays on this device.",
  ],
  "login.google": ["ورود با گوگل", "Continue with Google"],
  "login.or": ["یا", "or"],
  "login.name": ["نام", "Name"],
  "login.email": ["ایمیل", "Email"],
  "login.create": ["ساخت حساب", "Create account"],
  "login.later": ["بعداً", "Later"],
  "login.googleUnavailable": [
    "ورود گوگل هنوز پیکربندی نشده (NEXT_PUBLIC_GOOGLE_CLIENT_ID). فعلاً حساب محلی بساز.",
    "Google sign-in isn't configured yet (NEXT_PUBLIC_GOOGLE_CLIENT_ID). Create a local account for now.",
  ],
  "login.invalid": ["نام و ایمیل معتبر وارد کن.", "Enter a valid name and email."],
  "login.gsiSlow": [
    "دکمه‌ی گوگل بارگذاری نشد — اتصال کند است یا آدرس سایت هنوز در Google Console تأیید نشده. فعلاً از حساب محلی استفاده کن.",
    "Google button didn't load — slow connection, or the origin isn't authorized in Google Console yet. Use a local account for now.",
  ],

  // AI coach
  "coach.title": ["مربی هوشمند", "AI Coach"],
  "coach.clear": ["گفتگوی جدید", "New chat"],
  "coach.subtitle": [
    "درباره‌ی تمرین، تغذیه و ریکاوری بپرس — با شناخت برنامه‌ی خودت.",
    "Ask about training, nutrition and recovery — aware of your own plan.",
  ],
  "coach.placeholder": ["سؤالت را بنویس…", "Type your question…"],
  "coach.send": ["ارسال", "Send"],
  "coach.thinking": ["در حال فکر کردن…", "Thinking…"],
  "coach.hello": [
    "سلام! مربی رمق هستم.\nبرای این‌که دقیق راهنمایی‌ات کنم، هر چه‌قدر از این‌ها را بدانم بهتر جواب می‌دهم:\n• سن، قد، وزن و جنسیت\n• سابقه‌ی تمرین و سطح آمادگی\n• آسیب‌دیدگی یا درد مفصلی\n• بیماری (قلب، فشار، دیابت) یا مشکل گوارشی\n• داروها، کیفیت خواب و استرس\n\nحالا بگو: هدف و سؤالت چیست؟",
    "Hi! I'm your Ramagh coach.\nThe more of these I know, the better my advice:\n• Age, height, weight, sex\n• Training history & fitness level\n• Injuries or joint pain\n• Medical conditions (heart, BP, diabetes) or digestive issues\n• Medications, sleep quality, stress\n\nSo — what's your goal and your question?",
  ],
  "coach.error": [
    "پاسخ دریافت نشد. اتصال یا کلید API را بررسی کن.",
    "No response. Check the connection or API key.",
  ],
  "coach.needsKey": [
    "کلید هوش مصنوعی تنظیم نشده. در فایل .env.local مقدار AI_API_KEY را بگذار (راهنما در README).",
    "AI key not configured. Set AI_API_KEY in .env.local (see README).",
  ],
  "coach.disclaimer": [
    "پاسخ‌ها راهنمایی کلی هستند، نه توصیه‌ی پزشکی.",
    "Answers are general guidance, not medical advice.",
  ],
  "home.qlCoach": ["مربی", "Coach"],
  "coach.fab": ["از مربی بپرس", "Ask coach"],
  "home.qlAnalysis": ["آنالیز بدن", "Analysis"],
  "home.qlSupport": ["پشتیبانی", "Support"],

  // Support / feedback
  "sup.title": ["پشتیبانی و بازخورد", "Support & Feedback"],
  "sup.subtitle": [
    "مشکل، پیشنهاد یا نظرت را برایمان بفرست — همه را می‌خوانیم.",
    "Send us bugs, suggestions, or feedback — we read everything.",
  ],
  "sup.typeBug": ["گزارش مشکل", "Bug report"],
  "sup.typeIdea": ["پیشنهاد", "Suggestion"],
  "sup.typeOther": ["نظر / سایر", "Comment / other"],
  "sup.message": ["پیامت را بنویس…", "Write your message…"],
  "sup.contact": ["راه تماس (اختیاری — ایمیل یا تلفن)", "Contact (optional — email or phone)"],
  "sup.send": ["ارسال", "Send"],
  "sup.sent": ["دریافت شد — ممنون!", "Received — thank you!"],
  "sup.history": ["پیام‌های قبلی تو", "Your previous messages"],
  "sup.empty": ["پیام خالی است.", "Message is empty."],
  "sup.contactUs": ["ارتباط با ما", "Contact us"],

  // Body analysis
  "an.title": ["آنالیز بدن", "Body Analysis"],
  "an.subtitle": [
    "عکس بدنت را بفرست؛ آنالیز اختصاصی (متن، تصویر یا PDF) برایت ارسال می‌شود.",
    "Send body photos; you'll receive a personal analysis (text, image, or PDF).",
  ],
  "an.intro": [
    "برای آنالیز دقیق: سه عکس (جلو، پهلو، پشت) با نور خوب و لباس ورزشی بفرست. قد و وزنت را هم بنویس.",
    "For an accurate analysis: send three photos (front, side, back) in good light. Include your height and weight.",
  ],
  "an.attach": ["افزودن عکس", "Add photo"],
  "an.note": ["توضیح (اختیاری)…", "Note (optional)…"],
  "an.send": ["ارسال برای آنالیز", "Send for analysis"],
  "an.pending": ["در انتظار بررسی", "Awaiting review"],
  "an.answered": ["پاسخ داده شد", "Answered"],
  "an.you": ["تو", "You"],
  "an.team": ["تیم آنالیز رمق", "Ramagh analysis team"],
  "an.pdf": ["دریافت PDF آنالیز", "Download analysis PDF"],
  "an.needPhoto": ["حداقل یک عکس اضافه کن.", "Add at least one photo."],

  // Market pro
  "mkt.category": ["دسته‌بندی", "Category"],
  "mkt.by": ["مربی: {name}", "By {name}"],
  "mkt.allCats": ["همه", "All"],

  // Admin
  "adm.title": ["پنل مدیریت", "Admin Panel"],
  "adm.locked": ["دسترسی مدیریت", "Admin access"],
  "adm.code": ["کد دسترسی…", "Access code…"],
  "adm.enter": ["ورود به پنل", "Enter panel"],
  "adm.wrong": ["کد اشتباه است.", "Wrong code."],

  // Login modes
  "login.signin": ["ورود", "Sign in"],
  "login.signup": ["ثبت‌نام", "Sign up"],

  // News bell
  "news.title": ["اخبار و اطلاعیه‌ها", "News & alerts"],
  "news.empty": ["خبر جدیدی نیست.", "Nothing new."],

  // Trainer profile
  "trn.coaches": ["مربیان ما", "Our coaches"],
  "trn.viewAll": ["همه", "All"],
  "trn.about": ["درباره", "About"],
  "trn.specialties": ["تخصص‌ها", "Specialties"],
  "trn.contact": ["راه‌های ارتباط", "Get in touch"],
  "trn.plans": ["برنامه‌ها و تمرین‌های او", "Their plans & workouts"],
  "trn.plansN": ["{n} برنامه", "{n} plans"],
  "trn.news": ["اخبار و به‌روزرسانی‌ها", "News & updates"],
  "trn.clients": ["شاگرد", "clients"],
  "trn.yearsExp": ["سال سابقه", "yrs exp"],
  "trn.rating": ["امتیاز", "rating"],
  "trn.viewProfile": ["مشاهده‌ی پروفایل مربی", "View coach profile"],
  "trn.verified": ["مربی تأییدشده‌ی رمق", "Verified Ramagh coach"],
  "trn.notFound": ["مربی پیدا نشد", "Coach not found"],
  "trn.book": ["درخواست مشاوره", "Request coaching"],

  // Nearby gyms / map
  "nav.gyms": ["باشگاه‌ها", "Gyms"],
  "gym.title": ["باشگاه‌های نزدیک", "Nearby gyms"],
  "gym.subtitle": ["باشگاه‌های تهران روی نقشه — نزدیک‌ترین‌ها به تو", "Tehran gyms on the map — closest to you"],
  "gym.locate": ["نزدیک‌ترین به من", "Nearest to me"],
  "gym.locating": ["در حال یافتن موقعیت…", "Locating…"],
  "gym.permDenied": ["دسترسی به موقعیت داده نشد. می‌توانی روی نقشه بگردی.", "Location access denied. You can browse the map."],
  "gym.geoUnavailable": ["موقعیت‌یابی در دسترس نیست.", "Geolocation unavailable."],
  "gym.km": ["{n} کیلومتر", "{n} km"],
  "gym.m": ["{n} متر", "{n} m"],
  "gym.route": ["مسیریابی", "Directions"],
  "gym.call": ["تماس", "Call"],
  "gym.site": ["وب‌سایت", "Website"],
  "gym.search": ["جستجوی باشگاه یا محله…", "Search gym or area…"],
  "gym.countN": ["{n} باشگاه", "{n} gyms"],
  "gym.kind.gym": ["باشگاه بدنسازی", "Gym"],
  "gym.kind.pool": ["استخر", "Pool"],
  "gym.kind.sports": ["مجموعه ورزشی", "Sports centre"],
  "gym.women": ["بانوان", "Women"],
  "gym.myLocation": ["موقعیت من", "You"],
  "gym.noMatch": ["باشگاهی پیدا نشد.", "No gyms found."],
  "gym.attribution": ["داده‌ها © OpenStreetMap", "Data © OpenStreetMap"],
  "gym.offline": ["دانلود نقشه‌ی آفلاین تهران", "Download offline Tehran map"],
  "gym.offlineHint": ["نقشه را برای استفاده بدون اینترنت ذخیره کن (~۸ مگابایت).", "Save the map for offline use (~8 MB)."],
  "gym.offlineDl": ["در حال دانلود نقشه… {n}٪", "Downloading map… {n}%"],
  "gym.offlineDone": ["نقشه‌ی تهران آفلاین ذخیره شد ✓", "Tehran map saved offline ✓"],
  "gym.routeVia": ["مسیریابی با", "Route via"],
  "gym.neshan": ["نشان", "Neshan"],
  "gym.gmaps": ["گوگل‌مپ", "Google Maps"],
  "gym.directionsTo": ["مسیر به «{name}»", "Directions to “{name}”"],
  "gym.mapLoading": ["در حال بارگذاری نقشه…", "Loading map…"],

  // Stores (pharmacies / supplement / sports shops) — mirrors the gyms feature
  "nav.stores": ["فروشگاه‌ها", "Stores"],
  "store.title": ["فروشگاه‌ها", "Stores"],
  "store.subtitle": ["داروخانه، مکمل و فروشگاه ورزشی نزدیک تو", "Pharmacies, supplement & sports stores near you"],
  "store.countN": ["{n} فروشگاه", "{n} stores"],
  "store.kind.pharmacy": ["داروخانه", "Pharmacy"],
  "store.kind.supplement": ["فروشگاه مکمل", "Supplement store"],
  "store.kind.sports": ["فروشگاه ورزشی", "Sports store"],
  "store.kind.medical": ["تجهیزات پزشکی", "Medical supply"],
  "store.all": ["همه", "All"],
  "store.noMatch": ["فروشگاهی پیدا نشد.", "No stores found."],
  "store.search": ["جستجوی فروشگاه یا محله…", "Search store or area…"],

  // Social account
  "soc.account": ["حساب اجتماعی", "Social account"],
  "soc.setup": ["ساخت حساب اجتماعی", "Create your social profile"],
  "soc.setupHint": ["برای نظر دادن به باشگاه‌ها و اشتراک عکس روزانه، یک نام کاربری و آواتار انتخاب کن.", "Pick a username & avatar to review gyms and share daily photos."],
  "soc.username": ["نام کاربری", "Username"],
  "soc.usernamePh": ["مثلاً: علی_فیت", "e.g. ali_fit"],
  "soc.pickAvatar": ["انتخاب آواتار", "Choose your avatar"],
  "soc.skin": ["رنگ پوست", "Skin tone"],
  "soc.userId": ["شناسه کاربری", "User ID"],
  "soc.save": ["ذخیره حساب", "Save profile"],
  "soc.saved": ["ذخیره شد ✓", "Saved ✓"],
  "soc.edit": ["ویرایش حساب اجتماعی", "Edit social profile"],
  "soc.needAccount": ["برای مشارکت در جامعه، اول حساب اجتماعی‌ات را بساز.", "Set up your social profile to join the community."],
  "soc.goProfile": ["ساخت حساب در پروفایل", "Set up in Profile"],
  "soc.nameRequired": ["یک نام کاربری وارد کن.", "Enter a username."],
  "soc.member": ["عضو جامعه‌ی رمق", "Ramagh community member"],

  // Reviews
  "rev.title": ["نظرات کاربران", "Community reviews"],
  "rev.countN": ["{n} نظر", "{n} reviews"],
  "rev.write": ["ثبت نظر", "Write a review"],
  "rev.yourRating": ["امتیاز تو", "Your rating"],
  "rev.placeholder": ["تجربه‌ات از این باشگاه را بنویس…", "Share your experience at this gym…"],
  "rev.addPhoto": ["افزودن عکس", "Add photo"],
  "rev.submit": ["ارسال نظر", "Post review"],
  "rev.sending": ["در حال ارسال…", "Posting…"],
  "rev.none": ["هنوز نظری ثبت نشده — اولین نفر باش!", "No reviews yet — be the first!"],
  "rev.needText": ["یک نظر بنویس یا امتیاز بده.", "Add a rating or a comment."],

  // Social feed (in market)
  "feed.title": ["فید جامعه", "Community feed"],
  "feed.subtitle": ["عکس امروزت را از باشگاه با بقیه به اشتراک بگذار.", "Share today's gym photo with everyone."],
  "feed.share": ["اشتراک عکس امروز", "Share today's photo"],
  "feed.caption": ["یک توضیح بنویس…", "Write a caption…"],
  "feed.atGym": ["باشگاه (اختیاری)", "Gym (optional)"],
  "feed.post": ["انتشار", "Post"],
  "feed.posting": ["در حال انتشار…", "Posting…"],
  "feed.empty": ["هنوز پستی نیست — اولین عکس را تو بگذار!", "No posts yet — share the first!"],
  "feed.needContent": ["یک عکس یا متن اضافه کن.", "Add a photo or some text."],
  "feed.addPhoto": ["انتخاب عکس", "Choose photo"],
  "feed.at": ["در {gym}", "at {gym}"],

  // Market sections
  "mkt.secPlans": ["برنامه‌ها", "Plans"],
  "mkt.secGyms": ["باشگاه‌ها", "Gyms"],
  "mkt.secSocial": ["اجتماعی", "Social"],
  "mkt.secExercise": ["تمرین", "Exercise"],
  "mkt.secNutrition": ["تغذیه", "Nutrition"],
  "mkt.gymsCta": ["یافتن باشگاه‌های نزدیک تو روی نقشه", "Find gyms near you on the map"],
  "mkt.gymsCtaBtn": ["باز کردن نقشه‌ی باشگاه‌ها", "Open gym map"],
  "mkt.secStores": ["فروشگاه‌ها", "Stores"],
  "mkt.storesCtaBtn": ["باز کردن نقشه‌ی فروشگاه‌ها", "Open store map"],

  // Feed composer / post types
  "feed.tab.story": ["استوری", "Story"],
  "feed.tab.photo": ["عکس", "Photo"],
  "feed.tab.activity": ["فعالیت", "Activity"],
  "feed.tab.program": ["برنامه", "Program"],
  "feed.storyPh": ["چی تو ذهنته؟ تجربه، انگیزه یا مسیرت را بنویس…", "What's on your mind? Share a win, tip or your journey…"],
  "feed.pickActivity": ["یک تمرین را برای اشتراک انتخاب کن:", "Pick a workout to share:"],
  "feed.noActivity": ["هنوز تمرینی ثبت نکرده‌ای. یک تمرین کامل کن.", "No workouts logged yet. Finish one first."],
  "feed.shareProgram": ["برنامه‌ی فعلی من", "My current program"],
  "feed.noProgram": ["هنوز برنامه‌ای نساخته‌ای.", "You have no program yet."],
  "feed.likeN": ["{n}", "{n}"],
  "post.didActivity": ["یک تمرین را کامل کرد", "completed a workout"],
  "post.sharedProgram": ["برنامه‌اش را به اشتراک گذاشت", "shared a program"],
  "post.setsN": ["{n} ست", "{n} sets"],
  "post.exercisesN": ["{n} حرکت", "{n} exercises"],
  "post.daysWeek": ["{n} روز در هفته", "{n} days/week"],
  "post.workoutOn": ["تمرین {day}", "{day} workout"],

  // Coach registration panel
  "coachreg.title": ["پنل مربیان", "Coach panel"],
  "coachreg.subtitle": ["به‌عنوان مربی ثبت‌نام کن و برنامه‌هایت را در رمق منتشر کن.", "Register as a coach and publish your programs on Ramagh."],
  "coachreg.menu": ["پنل مربیان — ثبت‌نام و ارسال برنامه", "Coach panel — register & submit"],
  "coachreg.reg": ["ثبت‌نام مربی", "Coach registration"],
  "coachreg.name": ["نام و نام خانوادگی", "Full name"],
  "coachreg.cred": ["مدرک / تخصص", "Credential / expertise"],
  "coachreg.credPh": ["مثلاً مربی رسمی بدنسازی، ۱۰ سال سابقه", "e.g. certified S&C coach, 10y"],
  "coachreg.city": ["شهر", "City"],
  "coachreg.phone": ["تلفن", "Phone"],
  "coachreg.instagram": ["اینستاگرام (بدون @)", "Instagram (no @)"],
  "coachreg.email": ["ایمیل", "Email"],
  "coachreg.bio": ["درباره‌ی تو و روش کارت…", "About you and your coaching…"],
  "coachreg.specialties": ["تخصص‌ها (با ویرگول جدا کن)", "Specialties (comma-separated)"],
  "coachreg.photo": ["عکس پروفایل", "Profile photo"],
  "coachreg.submit": ["ثبت‌نام", "Register"],
  "coachreg.registered": ["ثبت‌نام تو دریافت شد ✓ بعد از تأیید، پروفایل مربی‌ات فعال می‌شود.", "Received ✓ Your coach profile goes live after review."],
  "coachreg.progTitle": ["ارسال برنامه", "Submit a program"],
  "coachreg.progHint": ["برنامه‌ی تمرین یا تغذیه‌ات را برای انتشار در بازار بفرست.", "Send a training or nutrition program to publish in the market."],
  "coachreg.progName": ["عنوان برنامه", "Program title"],
  "coachreg.progKind": ["نوع", "Type"],
  "coachreg.progGoal": ["هدف", "Goal"],
  "coachreg.progLevel": ["سطح", "Level"],
  "coachreg.progDays": ["روز در هفته", "Days/week"],
  "coachreg.progDesc": ["توضیح کامل برنامه…", "Full program description…"],
  "coachreg.progSubmit": ["ارسال برنامه", "Submit program"],
  "coachreg.progSent": ["برنامه‌ات ارسال شد ✓ در انتظار تأیید.", "Program submitted ✓ pending review."],
  "coachreg.privateChat": ["چت خصوصی و برنامه مشتری", "Private customer chat & plan"],
  "coachreg.needName": ["نام و مدرک را وارد کن.", "Enter your name and credential."],
  "coachreg.needTitle": ["عنوان و توضیح برنامه را وارد کن.", "Enter a program title and description."],
  "coachreg.gymKind": ["تمرینی", "Training"],
  "coachreg.dietKind": ["تغذیه‌ای", "Nutrition"],

  // Admin: coach submissions
  "adm.coaches": ["مربیان و برنامه‌ها", "Coaches & programs"],
  "adm.coachApps": ["ثبت‌نام مربیان", "Coach registrations"],
  "adm.coachProgs": ["برنامه‌های ارسالی", "Submitted programs"],
  "adm.pending": ["در انتظار", "pending"],
  "adm.noSubs": ["هنوز موردی ثبت نشده.", "Nothing submitted yet."],
};

const FA_INDEX = 0;
const EN_INDEX = 1;

// ---- Persian (Eastern Arabic-Indic) digits ----
const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

/** Convert Latin 0-9 in a string to Persian digits (leaves everything else). */
export function faDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
}

/** Format a number for display: Persian digits in fa, plain in en. */
export function faNum(lang: Lang, v: string | number): string {
  return lang === "fa" ? faDigits(v) : String(v);
}

export function translate(
  lang: Lang,
  key: string,
  params?: Record<string, string | number>
): string {
  const entry = DICT[key];
  let s = entry ? entry[lang === "fa" ? FA_INDEX : EN_INDEX] : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  // In Persian, render every Latin digit (from params or the phrase itself) as a
  // Persian numeral so the whole UI reads natively.
  if (lang === "fa") s = faDigits(s);
  return s;
}

// ---- Value maps (for data-derived strings) ----

const WEEKDAY_FA: Record<string, string> = {
  Saturday: "شنبه",
  Sunday: "یکشنبه",
  Monday: "دوشنبه",
  Tuesday: "سه‌شنبه",
  Wednesday: "چهارشنبه",
  Thursday: "پنجشنبه",
  Friday: "جمعه",
};

export function tWeekday(lang: Lang, en: string): string {
  return lang === "fa" ? WEEKDAY_FA[en] ?? en : en;
}

const FOCUS_FA: Record<string, string> = {
  Chest: "سینه",
  Back: "پشت",
  Shoulders: "شانه",
  Arms: "بازو",
  Core: "میان‌تنه",
  Legs: "پا",
  Neck: "گردن",
};

export function tFocus(lang: Lang, en: string): string {
  return lang === "fa" ? FOCUS_FA[en] ?? en : en;
}

const EQUIP_FA: Record<string, string> = {
  Featured: "منتخب",
  Barbell: "هالتر",
  Dumbbells: "دمبل",
  Machine: "دستگاه",
  Kettlebells: "کتل‌بل",
  Cables: "سیم‌کش",
  Plate: "وزنه",
  Bodyweight: "وزن بدن",
  "Medicine-Ball": "توپ طبی",
  Medicineball: "توپ طبی",
  Stretches: "کشش",
  Band: "کش",
  TRX: "تی‌آر‌اکس",
  "Bosu-Ball": "بوسو",
  "Smith-Machine": "اسمیت",
  Yoga: "یوگا",
  Pilates: "پیلاتس",
  Cardio: "هوازی",
  Recovery: "ریکاوری",
  Vitruvian: "ویترووین",
};

export function tEquip(lang: Lang, en: string): string {
  return lang === "fa" ? EQUIP_FA[en] ?? en : en;
}

const TAG_FA: Record<string, string> = {
  "Full body": "فول‌بادی",
  "2 days": "۲ روزه",
  "3 days": "۳ روزه",
  "4 days": "۴ روزه",
  "5 days": "۵ روزه",
  "6 days": "۶ روزه",
  Strength: "قدرت",
  Conditioning: "آمادگی",
  Athletic: "ورزشی",
  "Upper/Lower": "بالا/پایین",
  PPL: "پوش‌پول‌لگ",
  "Push/Pull": "هل/کشش",
  Bodybuilding: "بدن‌سازی",
  Toning: "فرم‌دهی",
  Powerlifting: "پاورلیفتینگ",
  Hybrid: "ترکیبی",
  Cut: "کاهش وزن",
  Bulk: "افزایش حجم",
  Maintain: "نگه‌داری",
  "High protein": "پرپروتئین",
  Balanced: "متعادل",
  "Low carb": "کم‌کربوهیدرات",
  "High carb": "پرکربوهیدرات",
  Keto: "کتو",
  Wholefood: "غذای کامل",
  Recomp: "ری‌کامپ",
  Performance: "عملکردی",
  Halal: "حلال",
  Vegetarian: "گیاه‌خوار",
  Vegan: "وگان",
};

export function tTag(lang: Lang, en: string): string {
  return lang === "fa" ? TAG_FA[en] ?? en : en;
}
