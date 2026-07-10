import type { Gender, Level, TrainingGoal } from "./types";

export function hoursLeftInDay(now = new Date()): number {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 3_600_000));
}

export function goalWord(goal: TrainingGoal, lang: "fa" | "en") {
  if (lang === "fa") {
    return goal === "strength" ? "قدرت" : goal === "endurance" ? "استقامت" : "عضله";
  }
  return goal === "strength" ? "strength" : goal === "endurance" ? "engine" : "muscle";
}

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length]!;
}

function profileSeed(gender: Gender, level: Level, goal: TrainingGoal, hoursLeft: number) {
  return gender.length * 7 + level.length * 11 + goal.length * 13 + hoursLeft * 17;
}

export function workoutNudge(input: {
  lang: "fa" | "en";
  gender: Gender;
  level: Level;
  goal: TrainingGoal;
  hoursLeft: number;
  isFriday?: boolean;
}) {
  const { lang, gender, level, goal, hoursLeft, isFriday = false } = input;
  const seed = profileSeed(gender, level, goal, hoursLeft);
  if (lang === "fa") {
    if (isFriday) {
      return {
        title: pick(["جمعه‌ست؛ روز خانواده و شارژ دوباره", "جمعه یعنی ریکاوری با اجازه رسمی", "امروز برنامه می‌تونه مهربون‌تر باشه"], seed),
        body: pick(
          [
            "امروز روز خونواده‌ست؛ می‌تونی ریکاوری کنی، یه استخر سبک بری، کشش بزنی و آدم‌تر برگردی. هرچند اگر دلت باشگاه خواست هم برو؛ به من ربطی نداره، فقط فرم رو خراب نکن.",
            "جمعه برای نفس کشیدن بدن ساخته شده: خواب بهتر، غذای درست، پیاده‌روی یا استخر. اگر هم هوس آهن کردی، برو باشگاه؛ من قاضی نیستم، فقط ثبتش کن.",
            "امروز می‌تونی هم کنار خانواده باشی هم بدنت رو از حالت فشرده دربیاری. ریکاوری، استخر، موبیلیتی؛ و اگر خیلی بی‌قرار بودی باشگاه هم هست، من فقط چراغ رو روشن نگه می‌دارم.",
          ],
          seed + 1
        ),
      };
    }
    if (hoursLeft <= 4) {
      return {
        title: pick(["وقت کمه، ولی هنوز بازی تموم نشده", "روز داره جمع می‌شه؛ تو چی؟", "چراغ تمرین هنوز روشنه"], seed),
        body: pick(
          [
            `${hoursLeft} ساعت تا پایان روز مانده. یه همراه لازم داری؟ برنامه آماده‌ست؛ برو به عضله‌ها یادآوری کن صاحب دارن.`,
            `${hoursLeft} ساعت وقت داری. حتی یه ست تمیز هم امروز رو از «بعدا می‌رم» نجات می‌ده.`,
            `تا پایان روز ${hoursLeft} ساعت مانده. بدنت منتظر یه حرکت حسابیه، نه کنفرانس مطبوعاتی با بهانه‌ها.`,
          ],
          seed + 1
        ),
      };
    }
    return {
      title: pick(["بدنت منتظر علامت شروع است", "برنامه امروز آماده است؛ فرار نکن", "وقت ساختن نسخه قوی‌ترته"], seed),
      body: pick(
        [
          `${gender === "female" ? "قهرمان" : "رفیق"}، امروز برای ${goalWord(goal, lang)} ساخته شده. ${level === "beginner" ? "آروم برو، ولی واقعاً برو." : "محکم، تمیز، بدون نمایش اضافه."}`,
          `${level === "beginner" ? "آهسته شروع کن، ولی شروع کن؛ دکمه شروع خودش فشار نمی‌خوره." : "با تمرکز برو سراغ ست اول؛ ست اول لحن کل تمرینه."} هدف امروز: ${goalWord(goal, lang)}.`,
          `برنامه‌ات با پروفایلت هماهنگه؛ اول گرم کن، بعد عضله‌ها رو قانع کن امروز جلسه جدیه نه جلسه آشنایی.`,
        ],
        seed + 1
      ),
    };
  }

  if (isFriday) {
    return {
      title: pick(["Friday can be recovery with benefits", "Family day, body reset", "Today can be softer and still count"], seed),
      body: pick(
        [
          "Family day works too: recover, swim easy, stretch, breathe. If the gym calls anyway, go ahead; I am not the referee, just keep the form clean.",
          "Friday is built for a reset: sleep, food, a light pool session, or mobility. If you still want iron, fine. Log it and behave.",
          "You can be with family and still help your body: recovery, pool, mobility. Gym is optional; your joints get a vote too.",
        ],
        seed + 1
      ),
    };
  }
  if (hoursLeft <= 4) {
    return {
      title: pick(["The day is almost done, not fully escaped", "Still time to make noise", "Workout window is closing"], seed),
      body: pick(
        [
          `${hoursLeft}h left today. Need someone to join? Your plan is ready; go remind the muscles who is in charge.`,
          `${hoursLeft}h on the clock. One clean set still counts, and it makes a surprisingly loud point.`,
          `${hoursLeft}h left today. Future you would like a tiny bit of evidence, not another heroic excuse.`,
        ],
        seed + 1
      ),
    };
  }
  return {
    title: pick(["Your body is waiting for the start signal", "Today has a plan, try not to negotiate with it", "Small start, strong finish"], seed),
    body: pick(
      [
        `${gender === "female" ? "Champion" : "Friend"}, today is built for ${goalWord(goal, lang)}. ${level === "beginner" ? "Start easy, but actually start." : "Sharp, strong, and no extra drama."}`,
        `${level === "beginner" ? "Start easy and keep the promise; the start button will not press itself." : "Bring focus to the first set; it sets the tone."} Today's target is ${goalWord(goal, lang)}.`,
        "Your profile shaped the plan. Warm up, then make the muscles believe this is a real meeting.",
      ],
      seed + 1
    ),
  };
}

export function exitWorkoutCopy(input: {
  lang: "fa" | "en";
  hoursLeft: number;
  doneSets: number;
}) {
  const { lang, hoursLeft, doneSets } = input;
  const seed = doneSets * 19 + hoursLeft * 23;
  if (lang === "fa") {
    return {
      title:
        doneSets > 0
          ? pick(["همین‌جا ولش کنیم؟", "ست‌ها نصفه بمونن؟", "ترمز بکشیم یا ادامه بدیم؟"], seed)
          : pick(["فرار قبل از گرم شدن؟", "هنوز شروع نشده!", "بدنت هنوز منتظرته"], seed),
      body: pick(
        hoursLeft <= 4
          ? [
              `فقط ${hoursLeft} ساعت تا پایان روز مانده. اگر الان بری، پیشرفت این تمرین ذخیره نمی‌شود.`,
              `${hoursLeft} ساعت باقی مانده. یه پایان کوتاه و تمیز بهتر از صفر کامل است.`,
              `وقت زیادی نمانده؛ اگه خارج بشی، این تمرین ذخیره نمی‌شه و فردا دوباره باید قانعش کنیم.`,
            ]
          : [
              "اگه خارج بشی، ست‌های این تمرین ذخیره نمی‌شن. یه ست دیگه؟ بدنت بدش نمیاد.",
              "تمرینت هنوز نفس داره. خروج یعنی این پیشرفت همین‌جا می‌مونه و ذخیره نمی‌شه.",
              "یه مکث کوچیک، یه جرعه آب، بعد ادامه. خروج همیشه گزینه آخره.",
            ],
        seed + 1
      ),
      stay: "ادامه می‌دم",
      leave: "خروج بدون ذخیره",
    };
  }

  return {
    title:
      doneSets > 0
        ? pick(["Call it here?", "Leave the sets hanging?", "Pause or push?"], seed)
        : pick(["Leaving before the warm-up lands?", "Already escaping?", "Your workout is still waiting"], seed),
    body: pick(
      hoursLeft <= 4
        ? [
            `Only ${hoursLeft}h left today. If you leave now, this workout progress will not be saved.`,
            `${hoursLeft}h left. A small finish still beats a perfect excuse.`,
            `The day is nearly closed; leave now and this progress will not be saved.`,
          ]
        : [
            "If you leave, this workout progress will not be saved. One more set? Your future self is weirdly persuasive.",
            "This session still has a pulse. Leave now and the progress stays unsaved.",
            "Take a sip, reset your grip, then decide. The exit can wait one set.",
          ],
      seed + 1
    ),
    stay: "Keep going",
    leave: "Leave without saving",
  };
}

export function workoutDing(
  kind: "setDone" | "skipRest" | "skipExercise",
  lang: "fa" | "en",
  seed = Date.now()
) {
  if (lang === "fa") {
    const messages = {
      setDone: [
        "دینگ! یه ست رفت تو حساب عضله‌ها.",
        "ست ثبت شد؛ عضله‌ها امضا کردن.",
        "همین بود! یه قدم نزدیک‌تر به نسخه قوی‌ترت.",
      ],
      skipRest: [
        "استراحت پرید؛ آماده ضربه بعدی.",
        "اوکی، استراحت کوتاه شد. فرم یادت نره.",
        "زود برگشتی؟ عضله‌ها سورپرایز شدن.",
      ],
      skipExercise: [
        "این حرکت رد شد؛ برو سراغ شکار بعدی.",
        "ردش کردیم. حرکت بعدی منتظرته.",
        "مسیر عوض شد، برنامه هنوز زنده است.",
      ],
    } satisfies Record<typeof kind, string[]>;
    return pick(messages[kind], seed);
  }

  const messages = {
    setDone: [
      "Ding. One set banked for the muscles.",
      "Set logged. The muscles signed the receipt.",
      "That counts. Stronger you just got a vote.",
    ],
    skipRest: [
      "Rest skipped. Keep the form clean.",
      "Back early? The muscles noticed.",
      "Rest trimmed. Next rep gets your full focus.",
    ],
    skipExercise: [
      "Exercise skipped. Next target is up.",
      "We moved on. The plan is still alive.",
      "Route changed. Keep the engine warm.",
    ],
  } satisfies Record<typeof kind, string[]>;
  return pick(messages[kind], seed);
}
