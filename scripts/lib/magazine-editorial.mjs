const clean = text => String(text ?? '').replace(/[\[\]()<>]/g, '').trim();
const link = (title, href) => `[${clean(title)}](${href})`;
const decks = {
  'imdb-trends-watch-guide': 'ترند با امتیاز یکی نیست. با خواندن محبوبیت، رأی کاربران و وضعیت نسخه‌ها، از موج خبرها به یک انتخاب مناسب برای امشب برسیم.',
  'new-series-episode-guide': 'قسمت تازه، فصل تازه یا فقط کیفیت بهتر؟ راهنمای دنبال‌کردن به‌روزرسانی‌های سریال، بدون لو رفتن داستان و سردرگمی میان نسخه‌ها.',
  'new-music-tags-playlists': 'تگ‌های واقعی آهنگ‌ها، مسیر تازه‌ای برای کشف موسیقی‌اند. از آرشیو جدید سرونما به پلی‌لیست، خواننده و شنیدن پیوسته برسیم.',
  'mobile-watch-party-guide': 'یک فیلم، چند دوست و چند صفحهٔ موبایل؛ راهنمای انتخاب نسخه و ساختن یک شب سینمایی از راه دور.',
  'listen-together-remote-guide': 'فاصله مانع یک تجربهٔ مشترک نیست. انتخاب آهنگ، تنظیم صف پخش و شروع یک اتاق شنیدن همزمان را قدم‌به‌قدم مرور می‌کنیم.',
  'imdb-top-250-guide': '۲۵۰ فیلم برتر IMDb نقطهٔ شروع خوبی است، نه نسخهٔ قطعی سلیقه. امتیازها و فیلم‌های کلاسیک را با نگاه دقیق‌تری انتخاب کنیم.',
  'shawshank-hope-story': 'شاوشنک چگونه امید را از شعار به تجربه تبدیل می‌کند؟ نگاهی به روایت، دوستی و نقش صدا در اثری که دوباره تماشایی می‌شود.',
  'godfather-acting-guide': 'قدرت همیشه با صدای بلند حرف نمی‌زند. پدرخوانده را از مسیر سکوت، بازیگری و روابط خانوادگی دوباره ببینیم.',
  'christopher-nolan-time-sound': 'در سینمای نولان، زمان و موسیقی فقط همراه داستان نیستند؛ بخشی از شیوهٔ روایت‌اند. چند مسیر برای تماشای دقیق‌تر آثار او.',
  'breaking-bad-character-guide': 'تغییر والتر وایت ناگهانی نیست. بریکینگ بد را از مسیر تصمیم‌های کوچک، بازیگری و پیامدهای شخصیت دنبال کنیم.',
  'house-hugh-laurie-guide': 'چرا دکتر هاوس فراتر از معمای پزشکی جذاب است؟ طنز تلخ، بازی هیو لوری و رابطهٔ شخصیت با حقیقت را مرور می‌کنیم.',
  'chernobyl-mini-series-guide': 'روایت کوتاه الزاماً روایت ساده نیست. چرنوبیل و مینی‌سریال‌ها را از مسیر ریتم، فضا و مسئولیت روایت ببینیم.',
  'cannes-palme-dor-guide': 'پشت تصویر فرش قرمز، انتخاب‌ها و بحث‌های سینمایی جریان دارد. نخل طلا چه معنایی دارد و چگونه از کن به کشف فیلم برسیم؟',
  'venice-golden-lion-guide': 'ونیز فقط یک جایزه نیست؛ مسیری برای کشف سینماست. تاریخ جشنواره و نسبت انتخاب‌هایش با سلیقهٔ تماشاگر را مرور کنیم.',
  'oscars-film-craft-guide': 'فیلم را فقط با جایزهٔ بهترین فیلم نسنجیم. صدا، تدوین و بازیگری، راه‌های دیگری برای خواندن اسکار و انتخاب آثارند.',
  'iranian-classic-cinema-guide': 'فیلم‌های قدیمی ایرانی، رد شهرها، زبان و خاطره را نگه داشته‌اند. راهنمای شروعی کنجکاوانه و انتخاب نسخهٔ کامل.',
  'abbas-kiarostami-cinema': 'جاده، سکوت و نگاه در سینمای کیارستمی چه می‌کنند؟ راهی برای ورود به آثار او، بدون انتظار پاسخ‌های آماده.',
  'asghar-farhadi-moral-drama': 'درام فرهادی از موقعیت‌هایی شروع می‌شود که قضاوت آسان نیست. جزئیات، روابط و تعلیق اخلاقی را دقیق‌تر ببینیم.',
  'korean-cinema-parasite': 'از انگل به مسیرهای دیگر سینمای کره برویم؛ جایی که ژانر، طبقه و طنز تلخ می‌توانند در یک داستان کنار هم قرار بگیرند.',
  'japanese-cinema-kurosawa': 'حرکت، قاب و چندصدایی روایت؛ چند نقطهٔ شروع برای آشنایی با کوروساوا و کشف مسیرهای سینمای ژاپن.',
  'indian-cinema-beyond-bollywood': 'سینمای هند را به یک زبان یا یک الگوی داستانی محدود نکنیم. راهنمای شروعی متنوع، از قصه‌های روزمره تا روایت‌های پرانرژی.',
  'french-cinema-new-wave': 'شهر، دوربین و آزادی روایت؛ موج نو چگونه عادت‌های تماشای فیلم را به پرسش کشید و از کجا می‌توان شروع کرد؟',
  'italian-neorealism-guide': 'قصه‌های بزرگ همیشه به قهرمان‌های بزرگ نیاز ندارند. از آدم‌های معمولی و خیابان‌های نئورئالیسم، به سینمای ایتالیا برسیم.',
  'film-score-listening-guide': 'یک بار تصویر را ببین، یک بار صدا را بشنو. موسیقی متن چگونه انتظار، خاطره و برداشت ما از شخصیت‌ها را شکل می‌دهد؟',
  'hans-zimmer-music-guide': 'تکرار، بافت و حجم صدا در موسیقی هانس زیمر؛ راهنمای شنیدن دقیق‌تر، فراتر از صرفاً بلندتر کردن صدا.',
  'john-williams-film-themes': 'ملودی‌هایی که همراه شخصیت‌ها می‌مانند؛ به موسیقی جان ویلیامز از مسیر تم، حافظه و رابطه‌اش با تصویر گوش بدهیم.',
  'ebi-persian-pop-listening': 'یک صدای آشنا در چند دوره؛ برای شنیدن آهنگ‌های ابی، این بار به اجرا، تنظیم و رابطهٔ صدا با ترانه توجه کنیم.',
  'googoosh-pop-memory': 'صدا، اجرا و خاطره در موسیقی گوگوش؛ راهی برای شنیدن دوباره، فراتر از دسته‌بندی سادهٔ آهنگ‌های قدیمی و تازه.',
  'focus-chill-music-playlist': 'برای کار و تمرکز، یک نسخهٔ واحد برای همه وجود ندارد. با تگ‌ها و چند آزمون کوتاه، صف شنیدن مناسب خودمان را پیدا کنیم.',
  'personal-music-playlist-guide': 'از یک قطعهٔ محبوب تا یک مسیر شنیدنی؛ ترتیب آهنگ‌ها، تنوع و حال‌وهوای مشترک را در پلی‌لیست شخصی کنار هم بگذاریم.',
};

/** Contextual links are built from real catalog matches, never guessed IDs. */
export function enrichEditorial(seed, body, media, collections = { playlists: [] }) {
  const music = seed.category === 'music' || seed.selectors?.some(s => s.startsWith('music-'));
  const library = music
    ? [{ title: 'پلی‌لیست‌های موسیقی', href: '/music/collections' }, { title: 'خوانندگان و هنرمندان', href: '/music/artists' }]
    : seed.category === 'series' || seed.selectors?.includes('updates')
      ? [{ title: 'سریال‌های آرشیو', href: '/browse?section=best-series' }, { title: 'به‌روزرسانی فیلم و سریال', href: '/updates' }]
      : seed.slug === 'iranian-classic-cinema-guide'
        ? [{ title: 'فیلم‌های قدیمی ایرانی', href: '/browse?section=old-iranian-films' }]
        : [{ title: 'فیلم‌های برتر IMDb', href: '/browse?section=top-imdb' }, { title: 'فیلم‌های جدید آرشیو', href: '/browse?section=recent-films' }];
  if (music) {
    const artists = new Map(media.filter(m => m.artistHref && m.artistName).map(m => [m.artistHref, m.artistName]));
    for (const [href, title] of [...artists].slice(0, 2)) library.push({ title: `آهنگ‌های ${clean(title)}`, href });
    const candidates = (collections.playlists ?? []).filter(p => p.trackIds?.length && p.scope === 'tags');
    const selected = seed.slug === 'focus-chill-music-playlist'
      ? candidates.filter(p => /chill|تمرکز/i.test(p.title)).slice(0, 2)
      : candidates.slice(0, 2);
    for (const p of selected) library.push({ title: `پلی‌لیست ${clean(p.title)}`, href: `/music/collections/${encodeURIComponent(p.id)}` });
  }
  const sections = body.sections.map(s => ({ ...s, paragraphs: [...s.paragraphs] }));
  const last = sections.at(-1);
  const paths = library.map(item => link(item.title, item.href)).join(' و ');
  last.paragraphs.push(music
    ? `برای ادامهٔ شنیدن، از ${paths} شروع کنید. برچسب‌ها راهی برای پیدا کردن حال‌وهوای نزدیک‌اند، نه تضمین سلیقهٔ یکسان؛ چند قطعه را امتحان کنید و انتخاب‌های دلخواهتان را در صف پخش نگه دارید.`
    : `برای مقایسهٔ انتخاب‌ها، ${paths} را ببینید. این فهرست‌ها به آرشیو موجود وصل‌اند؛ حضور یک عنوان در خبرها یا جشنواره به معنی آماده‌بودن نسخهٔ قابل پخش آن نیست.`);
  if (media.length) {
    const selected = media.slice(0, 3).map(m => link(m.title, m.detail)).join('، ');
    // Put relevant works in the reading flow, before the generic archive CTA.
    sections[Math.min(2, sections.length - 1)].paragraphs.push(`اگر می‌خواهید این بحث را با یک نمونهٔ موجود ادامه بدهید، ${selected} در آرشیو سرونما ثبت شده‌اند. صفحهٔ هر اثر، اطلاعات و نسخه‌های موجود را کنار هم می‌آورد؛ پیش از شروع، زبان، کیفیت و وضعیت منبع را بررسی کنید.`);
    const first = media[0];
    last.paragraphs.push(`برای ${clean(first.title)} می‌توانید ${link(music ? 'شنیدن آنلاین' : 'پخش آنلاین', first.play)} را باز کنید، از ${link('دانلود و انتخاب کیفیت', first.download)} نسخهٔ دلخواه را بردارید یا با ${link(music ? 'شنیدن همزمان با دوستان' : 'تماشای همزمان با دوستان', first.together)} یک تجربهٔ مشترک بسازید.`);
  }
  last.paragraphs.push(music
    ? `اگر انتخاب آهنگ را در تلگرام راحت‌تر انجام می‌دهید، ${link('بات تلگرام سرونما', 'https://t.me/Sarvnema_bot')} راه دیگر رسیدن به همین آرشیو است: نام آهنگ یا خواننده را جست‌وجو کنید و از نتیجه به صفحهٔ اثر بروید. لینک دانلود شما را به صفحهٔ سرونما می‌برد؛ بعد از شمارش پنج‌ثانیه‌ای، فایل انتخاب‌شده باز می‌شود.`
    : `برای پیدا کردن انتخاب بعدی لازم نیست همیشه مرورگر را باز کنید. در ${link('بات تلگرام سرونما', 'https://t.me/Sarvnema_bot')} نام فیلم یا سریال را جست‌وجو کنید و با دسته‌بندی‌ها انتخاب را محدود کنید. برای سریال، فصل و قسمت را هم مشخص کنید؛ لینک‌های پخش و دانلود به همان صفحهٔ سرونما می‌رسند و کیفیت را خودتان انتخاب می‌کنید.`);
  return { ...body, description: decks[seed.slug] || body.intro.split(/[.!؟]/u)[0], sections, libraryLinks: library };
}

export function publicArticle(draft, publishedAt, modifiedAt) {
  const article = { ...draft, publishedAt, modifiedAt };
  for (const key of ['manuscript', 'manuscriptHash', 'preparedAt', 'selectors', 'primaryKeyword']) delete article[key];
  return article;
}

export function revisionFingerprint(article) {
  const copy = { ...article };
  for (const key of ['publishedAt', 'modifiedAt', 'preparedAt', 'manuscriptHash', 'manuscript', 'selectors', 'primaryKeyword']) delete copy[key];
  return JSON.stringify(copy);
}
