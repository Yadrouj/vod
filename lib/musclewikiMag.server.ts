import { promises as fs } from "node:fs";
import path from "node:path";
import { imageForCategory, type MagArticle, type MagVideo } from "./mag";

interface ExerciseRecord {
  slug: string;
  name: string;
  category: string;
  difficulty: string;
  primaryMuscles: string[];
  thumbnail?: string;
  videos: {
    male: { url: string; localUrl?: string; angle?: string }[];
    female: { url: string; localUrl?: string; angle?: string }[];
  };
}

interface VideoManifestItem {
  url: string;
  localUrl?: string;
}

type Topic = {
  slug: string;
  sourceSlug: string;
  originalTitle: string;
  title: string;
  category: MagArticle["category"];
  focus: string;
  keywords: string[];
  angle: string;
  match?: RegExp;
};

const today = "2026-07-09";
const dataDir = path.join(process.cwd(), "public", "data");

const topics: Topic[] = [
  topic("beginners-guide-to-exercise-selection", "راهنمای انتخاب حرکت برای مبتدی‌ها", "برنامه تمرین", "انتخاب حرکت", "به مبتدی کمک می‌کند حرکت‌های ساده‌تر، قابل پیشرفت و کم‌ریسک‌تر را قبل از مدل‌های نمایشی انتخاب کند.", /Chest|Back|Quads|Glutes|Shoulders|Abs/i),
  topic("building-a-custom-full-body-worrkout", "ساخت برنامه فول‌بادی اختصاصی", "برنامه تمرین", "فول‌بادی", "برای کاربرانی مناسب است که هفته شلوغ دارند و می‌خواهند با تعداد جلسه کمتر کل بدن را پوشش دهند.", /Chest|Back|Quads|Hamstrings|Shoulders/i),
  topic("how-to-create-the-perfect-routine", "چطور یک روتین تمرینی کامل بسازیم؟", "برنامه تمرین", "طراحی برنامه", "روی هدف‌گذاری، حجم تمرین، پیشرفت تدریجی و استراحت بین جلسات تمرکز دارد.", /Chest|Back|Quads|Biceps|Triceps/i),
  topic("the-key-to-building-muscle", "اصل پیشرفت تدریجی در عضله‌سازی", "برنامه تمرین", "پروگرسیو اورلود", "یادآوری می‌کند که رشد عضله از ثبت، اندازه‌گیری و افزایش منطقی فشار تمرین می‌آید.", /Chest|Back|Quads|Biceps|Shoulders/i),
  topic("2026-training-blueprint", "نقشه تمرین ۲۰۲۶ برای عضله‌سازی هوشمند", "برنامه تمرین", "برنامه سالانه", "یک چارچوب به‌روز برای انتخاب حرکت، کنترل حجم و تمرکز روی حرکات موثرتر می‌سازد.", /Chest|Back|Quads|Glutes|Shoulders/i),
  topic("bodybuilding-for-beginners", "بدنسازی برای مبتدی‌ها؛ از روز اول درست شروع کن", "برنامه تمرین", "شروع بدنسازی", "به جای برنامه‌های شلوغ، روی عادت تمرین، فرم و پیشرفت آهسته تاکید دارد.", /Chest|Back|Quads|Abs|Shoulders/i),
  topic("ultimate-chest-training-guide", "راهنمای کامل تمرین سینه", "برنامه تمرین", "سینه", "آناتومی سینه، انتخاب زاویه پرس و نقش کنترل دامنه را به زبان کاربردی توضیح می‌دهد.", /Chest|Pectoral/i),
  topic("chest-workout-masterclass", "مسترکلاس تمرین سینه؛ تکنیک‌هایی که معمولا جا می‌افتد", "برنامه تمرین", "تکنیک سینه", "برای ساخت جلسه سینه با ترکیب پرس، فلای و کنترل کتف‌ها مناسب است.", /Chest|Pectoral/i),
  topic("99-of-chest-exercises-miss-this-one-technique", "۹۹٪ تمرین‌های سینه این تکنیک را جا می‌اندازند", "برنامه تمرین", "تکنیک پرس سینه", "روی کیفیت اجرای حرکت و حس عضله هدف تمرکز می‌کند، نه فقط سنگین کردن وزنه.", /Chest|Pectoral/i),
  topic("mastering-the-pec-fly-reverse-fly", "راهنمای فلای سینه و ریورس فلای", "برنامه تمرین", "فلای", "تفاوت هدف‌گیری سینه و پشت شانه را با کنترل آرنج، شانه و دامنه توضیح می‌دهد.", /Chest|Shoulders|Deltoid/i),
  topic("mastering-the-bench-press", "تسلط روی پرس سینه", "برنامه تمرین", "پرس سینه", "روی گریپ، مسیر میله، قوس بدن و ثبات کتف برای پیشرفت امن‌تر تاکید دارد.", /Chest|Triceps|Shoulders/i),
  topic("how-i-benched-315-pounds-at-45-years-old", "چطور در ۴۵ سالگی پرس سینه ۳۱۵ پوندی بسازیم؟", "برنامه تمرین", "قدرت سینه", "برای ورزشکاران باتجربه‌تر، اهمیت تکنیک، ریکاوری و صبر در قدرت‌سازی را برجسته می‌کند.", /Chest|Triceps|Shoulders/i),
  topic("ultimate-bicep-workout-guide", "راهنمای کامل تمرین جلو بازو", "برنامه تمرین", "جلو بازو", "با نگاه به سرهای مختلف جلو بازو، انتخاب زاویه‌های کشش و انقباض را کاربردی می‌کند.", /Biceps/i),
  topic("unlock-your-bicep-potential-with-coach-tys-ultimat", "باز کردن پتانسیل جلو بازو با تمرین در کشش", "برنامه تمرین", "جلو بازو در کشش", "ایده اصلی این است که بعضی حرکات وقتی عضله در طول بلندتر تمرین می‌کند خروجی بهتری می‌دهند.", /Biceps/i),
  topic("two-exercises-you-need-for-huge-triceps", "دو حرکت ضروری برای پشت بازوی بزرگ‌تر", "برنامه تمرین", "پشت بازو", "روی انتخاب کم‌حجم اما دقیق برای سرهای مختلف پشت بازو تمرکز دارد.", /Triceps/i),
  topic("the-ultimate-guide-to-forearm-training-with-coach", "راهنمای کامل تمرین ساعد", "برنامه تمرین", "ساعد", "چهار الگوی اصلی ساعد، یعنی فلکشن، اکستنشن، پرونیشن و سوپینیشن را وارد برنامه می‌کند.", /Forearms/i),
  topic("how-to-improve-grip-strength-free-program-included", "چطور قدرت گریپ را بهتر کنیم؟", "برنامه تمرین", "گریپ", "برای ددلیفت، بارفیکس و حرکات کششی، قدرت گرفتن دست را مثل یک مهارت جدا تمرین می‌دهد.", /Forearms|Back|Lats/i),
  topic("ultimate-glute-training-guide", "راهنمای تمرین باسن و گلوت", "برنامه تمرین", "باسن", "به جای تکرار بی‌هدف، روی هیپ‌هینج، اسکوات، لانج و کنترل لگن تمرکز می‌کند.", /Glutes|Hamstrings/i),
  topic("top-quad-exercises-you-havent-tried-yet", "حرکات چهارسر ران که احتمالا کمتر امتحان کرده‌ای", "برنامه تمرین", "چهارسر ران", "گزینه‌های جایگزین برای روز پا معرفی می‌کند تا فشار فقط روی اسکوات کلاسیک نماند.", /Quads/i),
  topic("the-lunge-bible", "کتابچه لانج؛ فوروارد، ریورس، لترال و کرتسی", "برنامه تمرین", "لانج", "لانج را به عنوان حرکت یک‌طرفه برای پا، باسن، تعادل و اصلاح عدم تقارن توضیح می‌دهد.", /Quads|Glutes|Hamstrings/i),
  topic("mastering-the-stiff-leg-deadlift", "تسلط روی ددلیفت پا صاف", "برنامه تمرین", "ددلیفت پا صاف", "روی هیپ‌هینج، کشش همسترینگ و جلوگیری از گرد شدن کمر تمرکز دارد.", /Hamstrings|Glutes|Back/i),
  topic("the-ultimate-guide-to-squatting", "راهنمای اسکوات؛ درس‌هایی از سال‌ها زیر میله", "برنامه تمرین", "اسکوات", "تفاوت ساختار بدن، عمق مناسب و مسیر زانو را برای اسکوات بهتر توضیح می‌دهد.", /Quads|Glutes|Hamstrings/i),
  topic("the-s-tier-back-exercise-youve-never-tried", "حرکت سطح S برای پشت که شاید امتحان نکرده‌ای", "برنامه تمرین", "پشت", "برای تنوع در روز پشت، روی زاویه کشش و تماس بهتر عضلات پشت تاکید دارد.", /Back|Lats|Rhomboids|Traps/i),
  topic("the-ultimate-guide-to-ab-training-unveiling-your-c", "راهنمای تمرین شکم و میان‌تنه", "برنامه تمرین", "شکم", "شکم را فقط کرانچ نمی‌بیند؛ ضدچرخش، ثبات و کنترل لگن هم وارد برنامه می‌شود.", /Abs|Obliques|Core/i),
  topic("how-to-pushup", "چطور شنا سوئدی را درست اجرا کنیم؟", "برنامه تمرین", "شنا سوئدی", "برای کسانی که در خانه تمرین می‌کنند، مسیر ساده‌ای از فرم پایه تا نسخه‌های سخت‌تر می‌سازد.", /Chest|Triceps|Shoulders/i),
  topic("the-ultimate-push-up-guide", "راهنمای کامل پوش‌آپ", "برنامه تمرین", "پوش‌آپ", "فاصله دست، مسیر آرنج و نسخه‌های پیشرفته‌تر شنا را به برنامه قابل اجرا تبدیل می‌کند.", /Chest|Triceps|Shoulders/i),
  topic("plan-to-go-from-0-to-20-pushups", "برنامه قدم‌به‌قدم از صفر تا ۲۰ شنا", "برنامه تمرین", "شنا برای مبتدی", "با پیشرفت‌های کوچک، تمرین مکرر و تکرارهای تمیز، شنا را از صفر قابل دسترس می‌کند.", /Chest|Triceps|Shoulders/i),
  topic("the-ultimate-guide-to-warming-up-keep-it-simple", "گرم کردن ساده و موثر قبل از تمرین", "سلامت", "گرم کردن", "گرم کردن را کوتاه، هدفمند و متناسب با حرکت اصلی نگه می‌دارد.", /Chest|Back|Quads|Shoulders/i),
  topic("how-long-to-rest-for-muscle-growth", "برای رشد عضله چقدر استراحت کنیم؟", "برنامه تمرین", "استراحت بین ست", "استراحت را به هدف ست، سنگینی وزنه و کیفیت تکرار بعدی وصل می‌کند.", /Chest|Back|Quads|Biceps|Triceps/i),
  topic("heavy-vs-light-weights", "وزنه سنگین یا سبک؛ کدام برای رشد بهتر است؟", "برنامه تمرین", "شدت تمرین", "نشان می‌دهد بازه‌های مختلف تکرار اگر نزدیک ناتوانی مدیریت شوند می‌توانند موثر باشند.", /Chest|Back|Quads|Shoulders/i),
  topic("max-volume", "حجم تمرین چقدر باید باشد؟", "برنامه تمرین", "حجم تمرین", "به کاربر کمک می‌کند بین تمرین کافی و تمرین بیش از حد تعادل پیدا کند.", /Chest|Back|Quads|Biceps|Triceps/i),
  topic("max-reps", "چند تکرار برای عضله‌سازی بهتر است؟", "برنامه تمرین", "تکرار", "تکرار را ابزار تنظیم فشار تمرین می‌بیند، نه یک عدد جادویی ثابت.", /Chest|Back|Quads|Shoulders/i),
  topic("max-rest", "استراحت و ریکاوری؛ بخش فراموش‌شده برنامه", "سلامت", "ریکاوری", "یادآوری می‌کند که رشد بین جلسات رخ می‌دهد و خواب، تغذیه و استراحت برنامه را کامل می‌کنند.", /Chest|Back|Quads|Glutes/i),
  topic("toning-the-myth-that-wont-die", "افسانه تونینگ؛ چرا این واژه گمراه‌کننده است؟", "چربی‌سوزی", "تونینگ", "توضیح می‌دهد ظاهر عضلانی‌تر معمولا ترکیبی از عضله‌سازی و کاهش چربی است.", /Chest|Back|Quads|Glutes/i),
  topic("ultimate-guide-to-effective-body-fat-loss", "راهنمای کاربردی کاهش چربی بدن؛ بخش اول", "چربی‌سوزی", "چربی‌سوزی", "روی کسری کالری قابل دوام، اندازه‌گیری درست و حفظ تمرین مقاومتی تاکید می‌کند.", /Chest|Back|Quads|Glutes/i),
  topic("how-to-track-body-fat-loss-effectively", "چطور کاهش چربی را درست پیگیری کنیم؟", "چربی‌سوزی", "پیگیری چربی‌سوزی", "به جای وسواس روزانه روی وزن، میانگین هفتگی، دور کمر و عکس روند را پیشنهاد می‌دهد.", /Abs|Quads|Glutes|Chest/i),
  topic("10-cheapest-low-calorie-most-filling-foods", "۱۰ غذای ارزان، کم‌کالری و سیرکننده", "تغذیه", "غذای سیرکننده", "برای رژیم اقتصادی، سراغ مواد غذایی با حجم بالا، فیبر و پروتئین مناسب می‌رود."),
  topic("how-much-protein-is-best", "چه مقدار پروتئین برای بدنسازی بهتر است؟", "تغذیه", "پروتئین", "پروتئین روزانه را با وزن بدن، هدف و کیفیت وعده‌ها هماهنگ می‌کند."),
  topic("the-truth-about-fats-calculating-macros", "حقیقت درباره چربی‌ها و محاسبه ماکروها", "تغذیه", "چربی غذایی", "چربی را حذف‌کردنی نمی‌داند؛ درباره نقش آن در هورمون‌ها، سیری و کالری توضیح می‌دهد."),
  topic("do-pre-workouts-work", "آیا پری‌ورک‌اوت‌ها واقعا جواب می‌دهند؟", "مکمل", "پری‌ورک‌اوت", "به ترکیباتی مثل کافئین، سیترولین و آب چغندر با نگاه عملی و محتاطانه نگاه می‌کند."),
  topic("how-to-blood-flow-restriction", "تمرین محدودیت جریان خون یا BFR چیست؟", "سلامت", "BFR", "BFR را به عنوان ابزار پیشرفته معرفی می‌کند که باید با فشار کنترل‌شده و احتیاط اجرا شود.", /Quads|Biceps|Triceps|Calves/i),
  topic("5-fitness-myths-busted", "۵ باور غلط رایج در تمرین و تغذیه", "سلامت", "باورهای غلط", "باورهای جذاب اما کم‌پشتوانه را با نگاه عملی برای کاربر عادی باز می‌کند.", /Chest|Back|Quads|Abs/i),
  topic("nuobell-dumbbells-review-with-discount-code", "بررسی دمبل‌های Nuobell برای تمرین خانگی", "مکمل", "تجهیزات خانگی", "برای کسی که می‌خواهد خانه را به باشگاه کوچک تبدیل کند، مزایا و محدودیت دمبل قابل تنظیم را بررسی می‌کند.", /Chest|Biceps|Shoulders|Quads/i),
  topic("are-the-nuobell-s5100-dumbbells-worth-1100-a-bruta", "آیا دمبل‌های Nuobell S5100 ارزش خرید دارند؟", "مکمل", "دمبل قابل تنظیم", "روی دقت وزن، دوام، حس تمرین و ارزش خرید برای تمرین خانگی تمرکز دارد.", /Chest|Biceps|Shoulders|Quads/i),
];

function topic(
  sourceSlug: string,
  title: string,
  category: MagArticle["category"],
  focus: string,
  angle: string,
  match?: RegExp
): Topic {
  return {
    slug: `musclewiki-${sourceSlug}`,
    sourceSlug,
    originalTitle: sourceSlug.replace(/-/g, " "),
    title,
    category,
    focus,
    keywords: [focus, "MuscleWiki", "مجله رمق", "بدنسازی", title],
    angle,
    match,
  };
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(dataDir, file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

function localVideoMap(manifest: VideoManifestItem[]) {
  return new Map(
    manifest
      .filter((item) => item.localUrl)
      .map((item) => [item.url, item.localUrl!])
  );
}

function videosForTopic(topic: Topic, exercises: ExerciseRecord[], localByUrl: Map<string, string>): MagVideo[] {
  if (!topic.match) return [];
  return exercises
    .filter((exercise) => {
      const muscles = exercise.primaryMuscles.join(" ");
      const clip = exercise.videos.male[0] ?? exercise.videos.female[0];
      return Boolean(clip) && topic.match?.test(muscles);
    })
    .slice(0, 3)
    .map((exercise) => {
      const clip = exercise.videos.male[0] ?? exercise.videos.female[0];
      const videoUrl = localByUrl.get(clip.url) ?? clip.localUrl ?? clip.url;
      return {
        title: exercise.name,
        slug: `${topic.slug}-${exercise.slug}`,
        href: `/library/${exercise.slug}`,
        videoUrl,
        thumbnail: exercise.thumbnail,
        explanation: `${exercise.name} برای موضوع ${topic.focus} انتخاب شده است. ویدیو را ببینید، دامنه حرکت را کنترل کنید و اگر فرم شما به‌هم می‌ریزد وزن را سبک‌تر کنید.`,
      };
    });
}

function bodyForTopic(topic: Topic, hasVideos: boolean) {
  const sourceUrl = `https://musclewiki.com/articles/${topic.sourceSlug}`;
  return [
    `این مطلب یک بازنویسی و ترجمه آزاد فارسی بر اساس موضوع مقاله MuscleWiki با محور «${topic.focus}» است. هدف این نسخه کپی کردن متن اصلی نیست؛ ما نکته‌های قابل اجرا را برای کاربر ایرانی رمق خلاصه، بومی‌سازی و به مسیر تمرین داخل اپ وصل کرده‌ایم.`,
    topic.angle,
    `برای استفاده عملی، اول سطح خود را مشخص کنید. اگر مبتدی هستید، نسخه ساده‌تر حرکت یا برنامه را انتخاب کنید و فقط وقتی سراغ فشار بیشتر بروید که فرم، تنفس و کنترل دامنه ثابت مانده باشد. اگر باتجربه‌تر هستید، پیشرفت را با وزن، تکرار، ست، سرعت اجرا یا کیفیت دامنه بسنجید، نه فقط با حس خستگی آخر تمرین.`,
    `در رمق پیشنهاد می‌شود این مقاله را کنار برنامه هفتگی خود بخوانید: یک نکته از آن را همین هفته امتحان کنید، نتیجه را در ست‌های تمرینی ثبت کنید و بعد از چند جلسه تصمیم بگیرید آیا باید حرکت، حجم یا استراحت را تغییر دهید. این روش از برنامه‌های شلوغ و تصمیم‌های هیجانی بهتر جواب می‌دهد.`,
    hasVideos
      ? "برای این موضوع چند ویدیوی تمرینی از کتابخانه محلی رمق هم اضافه شده است تا کاربر فقط متن نخواند و بتواند فرم حرکت را ببیند. این ویدیوها از دیتای تمرینی داخلی اپ انتخاب شده‌اند و بعد از آپلود روی سرور نیز با لینک محلی اجرا می‌شوند."
      : "این موضوع بیشتر آموزشی و تغذیه‌ای است، بنابراین به جای ویدیو، روی چک‌لیست تصمیم‌گیری تمرکز کنید: هدف، مقدار قابل اجرا، بودجه، وضعیت سلامتی و امکان ادامه دادن در هفته‌های آینده.",
    `منبع اصلی برای مطالعه بیشتر: ${sourceUrl}. اگر متن اصلی در آینده تغییر کند، این نسخه همچنان به عنوان خلاصه فارسی و کاربردی برای کاربران رمق باقی می‌ماند و می‌تواند توسط ادمین به‌روزرسانی شود.`,
  ];
}

export async function muscleWikiMagArticles(): Promise<MagArticle[]> {
  const [exercises, manifest] = await Promise.all([
    readJson<ExerciseRecord[]>("exercises.json", []),
    readJson<VideoManifestItem[]>("musclewiki-video-manifest.json", []),
  ]);
  const localByUrl = localVideoMap(manifest);

  return topics.map((topic) => {
    const videos = videosForTopic(topic, exercises, localByUrl);
    const sourceUrl = `https://musclewiki.com/articles/${topic.sourceSlug}`;
    const article: MagArticle = {
      id: `musclewiki_${topic.sourceSlug}`,
      slug: topic.slug,
      title: `${topic.title} | ترجمه و خلاصه فارسی MuscleWiki`,
      excerpt: `خلاصه فارسی و کاربردی از مقاله MuscleWiki درباره ${topic.focus}، همراه با نکته‌های اجرایی برای تمرین، تغذیه یا ریکاوری در رمق.`,
      category: topic.category,
      keywords: topic.keywords,
      publishedAt: today,
      status: "published",
      image: imageForCategory(topic.category),
      imageAlt: topic.title,
      body: bodyForTopic(topic, videos.length > 0),
      sources: [{ label: `MuscleWiki: ${topic.sourceSlug}`, url: sourceUrl }],
    };
    if (videos.length) article.videos = videos;
    return article;
  });
}
