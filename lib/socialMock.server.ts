import { promises as fs } from "node:fs";
import path from "node:path";
export { BODYBUILDING_CELEBRITIES } from "./bodybuildingCelebrities";
import { addSystemPost, listFeed, type Post, type PostType } from "./socialStore";

const DATA_DIR =
  process.env.RAMAGH_DATA ||
  (process.platform === "win32"
    ? path.join(process.cwd(), ".social-data")
    : "/home/ubuntu/ramagh-data");
const STATE_FILE = path.join(DATA_DIR, "social-cron-state.json");
const TEHRAN_TZ = "Asia/Tehran";
const MIN_DELAY_MINUTES = 1;
const MAX_DELAY_MINUTES = 30;
const ACTIVE_START_MINUTES = 11 * 60;
const ACTIVE_END_MINUTES = 23 * 60 + 30;

interface SocialCronState {
  nextRunAt: number;
  lastRunAt: number | null;
  created: number;
}

const AUTHORS = [
  { userId: "mock_amin_azarneshin_vibe", name: "امین آذرنشین فن", avatarId: 1, skin: "#d9a06f" },
  { userId: "mock_arian_cut", name: "آرین کات", avatarId: 1, skin: "#d9a06f" },
  { userId: "mock_niloofar_fit", name: "نیلوفر فیت", avatarId: 3, skin: "#c98764" },
  { userId: "mock_sina_bulk", name: "سینا بالک", avatarId: 4, skin: "#8f5f3d" },
  { userId: "mock_mahsa_power", name: "مهسا پاور", avatarId: 6, skin: "#e2b07d" },
  { userId: "mock_pouya_diet", name: "پویا رژیمی", avatarId: 2, skin: "#b77855" },
  { userId: "mock_reza_natural", name: "رضا نچرال", avatarId: 8, skin: "#a96f4d" },
  { userId: "mock_parsa_coach", name: "پارسا مربی", avatarId: 5, skin: "#cf9468" },
  { userId: "mock_sahar_glutes", name: "سحر گلوئت", avatarId: 7, skin: "#f0bb88" },
  { userId: "mock_yasaman_pose", name: "یاسمن پوزینگ", avatarId: 9, skin: "#f2c08f" },
  { userId: "mock_mani_deadlift", name: "مانی ددلیفت", avatarId: 0, skin: "#c68658" },
  { userId: "mock_samira_bikini", name: "سمیرا بیکینی", avatarId: 3, skin: "#e4aa7a" },
  { userId: "mock_kian_classic", name: "کیان کلاسیک", avatarId: 4, skin: "#9b6845" },
  { userId: "mock_mina_macro", name: "مینا ماکرو", avatarId: 6, skin: "#ddb184" },
  { userId: "mock_hamed_whey", name: "حامد وی", avatarId: 8, skin: "#b77952" },
  { userId: "mock_ladan_lift", name: "لادن لیفت", avatarId: 7, skin: "#efbd91" },
  { userId: "mock_shayan_pump", name: "شایان پامپ", avatarId: 2, skin: "#c88960" },
  { userId: "mock_tara_strong", name: "تارا استرانگ", avatarId: 5, skin: "#e8b489" },
  { userId: "mock_bardia_nutrition", name: "بردیا تغذیه", avatarId: 1, skin: "#a96f4d" },
  { userId: "mock_helia_glutes", name: "هلیا گلوئت", avatarId: 9, skin: "#f0bb88" },
  { userId: "mock_ashkan_shred", name: "اشکان شرد", avatarId: 0, skin: "#8f5f3d" },
  { userId: "mock_sogand_fit", name: "سوگند فیت", avatarId: 3, skin: "#d99a76" },
  { userId: "mock_radin_power", name: "رادین پاور", avatarId: 4, skin: "#b77855" },
  { userId: "mock_ava_mobility", name: "آوا موبیلیتی", avatarId: 6, skin: "#e2b07d" },
  { userId: "mock_navid_coach", name: "نوید کوچ", avatarId: 2, skin: "#cf9468" },
  { userId: "mock_shiva_strength", name: "شیوا قدرت", avatarId: 7, skin: "#efc29a" },
  { userId: "mock_armin_cleanbulk", name: "آرمین کلین‌بالک", avatarId: 5, skin: "#c07d4f" },
  { userId: "mock_dorsa_runner", name: "درسا کاردیو", avatarId: 9, skin: "#e8b489" },
  { userId: "mock_farbod_form", name: "فربد فرم", avatarId: 1, skin: "#b87955" },
  { userId: "mock_rojin_wellness", name: "روژین ولنس", avatarId: 3, skin: "#edbd92" },
  { userId: "mock_erfan_plate", name: "عرفان پلیت", avatarId: 8, skin: "#9f6946" },
  { userId: "mock_nazanin_barbell", name: "نازنین هالتر", avatarId: 6, skin: "#e6ad80" },
  { userId: "mock_mehrdad_competitor", name: "مهرداد مسابقه", avatarId: 0, skin: "#b77855" },
  { userId: "mock_kimia_core", name: "کیمیا کور", avatarId: 7, skin: "#f1c09a" },
  { userId: "mock_soroush_spotter", name: "سروش اسپاتر", avatarId: 2, skin: "#c98b61" },
];

const GYMS = [
  { gymId: "node4687452874", gymName: "باشگاه ۳۶۰°" },
  { gymId: "node369986661", gymName: "باشگاه انقلاب" },
  { gymId: "node12068095592", gymName: "آتیلا ژیم" },
  { gymId: null, gymName: null },
];

const TEXTS: { type: PostType; text: string; data?: Record<string, unknown> }[] = [
  {
    type: "story",
    text: "امروز فقط ۲۰ دقیقه وقت داشتم، ولی همون ۲۰ دقیقه رو مثل آدم حسابی زدم. رکورد ذهنی: تنبلی ۰ - رمق ۱.",
  },
  {
    type: "activity",
    text: "پا رو زدم، الان پله‌ها دارن باهام مذاکره می‌کنن. کسی حرکت جایگزین لانج برای زانو حساس داره؟",
    data: { dayLabel: "Leg day", sets: 18, exercises: 6, when: Date.now() },
  },
  {
    type: "program",
    text: "یه برنامه ۴ روزه هایپرتروفی گذاشتم: سینه/پشت، پا، سرشانه/بازو، فول‌بادی سبک. اگه مبتدی نیستی ولی گیر کردی، خوب جواب می‌ده.",
    data: { daysPerWeek: 4, focuses: ["chest", "back", "legs", "shoulders"] },
  },
  {
    type: "story",
    text: "صبحانه امروز: تخم‌مرغ، نان سنگک، خیارشور ممنوع 😄 برای کات، ساده بودن غذا از خاص بودنش مهم‌تره.",
  },
  {
    type: "program",
    text: "برنامه چربی‌سوزی ۳ روزه برای کارمندها آماده کردم: تمرین کوتاه، قدم روزانه، شام قابل اجرا. دنبال عجیب‌بازی نیستم، دنبال ادامه دادنم.",
    data: { daysPerWeek: 3, focuses: ["fat-loss", "full-body", "cardio"] },
  },
  {
    type: "story",
    text: "امروز یکی تو باشگاه پرسید مکمل اول چی بخرم؟ جواب صادقانه: اول خواب، بعد پروتئین غذا، بعد اگر کم آوردی مکمل.",
  },
  {
    type: "activity",
    text: "پرس سینه سبک‌تر زدم ولی فرم تمیزتر بود. گاهی کم کردن وزنه یعنی بالا رفتن سطح، نه عقب‌گرد.",
    data: { dayLabel: "Push day", sets: 14, exercises: 5, when: Date.now() },
  },
  {
    type: "story",
    text: "یه نفر امروز رکورد ددلیفت زد، کل باشگاه ساکت شد. اون سکوت قشنگ‌ترین موزیک تمرینه.",
  },
  {
    type: "program",
    text: "برای خانم‌هایی که تازه شروع کردن: سه روز فول‌بادی، تمرکز روی اسکوات، هیپ‌تراست، لت و پرس سبک. فرم قبل از فشار.",
    data: { daysPerWeek: 3, focuses: ["glutes", "back", "full-body"] },
  },
  {
    type: "story",
    text: "تبلیغ کوچیک: اگر برنامه‌ت فقط لیست حرکت است و دلیلش را نمی‌دانی، برنامه نیست؛ جدول سردرگمیه. برنامه باید قابل توضیح باشد.",
  },
  {
    type: "activity",
    text: "امروز سرشانه زدم. نشر جانب با وزنه کمتر، درد کمتر، حس عضله بیشتر. غرور رو بذاریم تو کمد.",
    data: { dayLabel: "Shoulder day", sets: 16, exercises: 5, when: Date.now() },
  },
  {
    type: "story",
    text: "حس امروز: نه خیلی انگیزه، نه خیلی انرژی. ولی رفتم باشگاه چون قول داده بودم به نسخه فردای خودم.",
  },
];

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomDelayMs() {
  const minutes = MIN_DELAY_MINUTES + Math.floor(Math.random() * MAX_DELAY_MINUTES);
  return minutes * 60 * 1000;
}

function tehranParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TEHRAN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const hour = get("hour") === 24 ? 0 : get("hour");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
    second: get("second"),
  };
}

function tehranWallTimeToUtcMs(parts: ReturnType<typeof tehranParts>, hour: number, minute: number, addDays = 0) {
  const approx = Date.UTC(parts.year, parts.month - 1, parts.day + addDays, hour, minute, 0);
  const check = tehranParts(new Date(approx));
  const currentWall = Date.UTC(check.year, check.month - 1, check.day, check.hour, check.minute, check.second);
  const targetWall = Date.UTC(parts.year, parts.month - 1, parts.day + addDays, hour, minute, 0);
  return approx + (targetWall - currentWall);
}

export function isTehranActive(now = new Date()) {
  const parts = tehranParts(now);
  const minutes = parts.hour * 60 + parts.minute;
  return minutes >= ACTIVE_START_MINUTES && minutes < ACTIVE_END_MINUTES;
}

function nextActiveStart(now = new Date()) {
  const parts = tehranParts(now);
  const minutes = parts.hour * 60 + parts.minute;
  if (minutes < ACTIVE_START_MINUTES) return tehranWallTimeToUtcMs(parts, 11, 0, 0);
  return tehranWallTimeToUtcMs(parts, 11, 0, 1);
}

function scheduleAfter(nowMs: number) {
  const candidate = nowMs + randomDelayMs();
  if (isTehranActive(new Date(candidate))) return candidate;
  return nextActiveStart(new Date(candidate)) + randomDelayMs();
}

async function readState(): Promise<SocialCronState> {
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, "utf8")) as SocialCronState;
  } catch {
    return { nextRunAt: scheduleAfter(Date.now()), lastRunAt: null, created: 0 };
  }
}

async function writeState(state: SocialCronState) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function mockPost(createdAt = Date.now(), forcedAuthor?: (typeof AUTHORS)[number]): Partial<Post> {
  const author = forcedAuthor ?? pick(AUTHORS);
  const body = pick(TEXTS);
  const place = pick(GYMS);
  return {
    ...author,
    ...place,
    type: body.type,
    text: body.text,
    data: body.data ?? null,
    likes: 2 + Math.floor(Math.random() * 48),
    createdAt,
  };
}

export async function createMockSocialPost(createdAt = Date.now()) {
  return addSystemPost(mockPost(createdAt));
}

export async function seedSocialFeed(minMockPosts = 72) {
  const current = await listFeed(120);
  const mockPosts = current.filter((post) => post.userId.startsWith("mock_"));
  const existingAuthors = new Set(mockPosts.map((post) => post.userId));
  const created: Post[] = [];
  const missingAuthors = AUTHORS.filter((author) => !existingAuthors.has(author.userId));
  for (const author of missingAuthors) {
    created.push(await addSystemPost(mockPost(Date.now() - (missingAuthors.length - created.length) * 11 * 60 * 1000, author)));
  }
  const mockCount = mockPosts.length + created.length;
  for (let index = mockCount; index < minMockPosts; index += 1) {
    created.push(await createMockSocialPost(Date.now() - (minMockPosts - index) * 28 * 60 * 1000));
  }
  return created;
}

export async function runSocialCron(options: { force?: boolean; seed?: boolean } = {}) {
  if (options.seed) await seedSocialFeed();
  const now = Date.now();
  const state = await readState();
  const active = isTehranActive(new Date(now));

  if (!active && !options.force) {
    state.nextRunAt = nextActiveStart(new Date(now)) + randomDelayMs();
    await writeState(state);
    return { ok: true, skipped: "quiet_hours", active, nextRunAt: state.nextRunAt, created: 0 };
  }

  if (!options.force && state.nextRunAt > now) {
    return { ok: true, skipped: "not_due", active, nextRunAt: state.nextRunAt, created: 0 };
  }

  const post = await createMockSocialPost(now);
  state.lastRunAt = now;
  state.nextRunAt = scheduleAfter(now);
  state.created += 1;
  await writeState(state);
  return { ok: true, active, nextRunAt: state.nextRunAt, created: 1, post };
}
