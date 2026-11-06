import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { reviewSelections } from '../content/magazine/dossiers/review-selections.mjs';
import { biographySelections } from '../content/magazine/dossiers/biography-selections.mjs';
import { biographyInsights } from '../content/magazine/dossiers/biography-insights.mjs';
import { seriesBatchOne, seriesGuideData, seriesRatingsCheckedAt } from '../content/magazine/dossiers/series-batch-one.mjs';
import { parseManuscript, countWords } from './blog-agent.mjs';
import { writeJsonAtomic } from './atomic-json.mjs';

const safeTitle = value => String(value ?? '').replace(/^دانلود\s+(?:فیلم|سریال|انیمه)(?:\s+سریالی)?\s*/u, '').replace(/[\[\]()<>]/g, '').trim();
const link = (name, href) => `[${safeTitle(name)}](${href})`;
const read = file => readFile(file, 'utf8').then(JSON.parse);

function media(item, name) {
  const id = item.imdbCode;
  return { id, title: name || safeTitle(item.persianTitle) || item.title, kind: item.type === 'series' ? 'series' : 'movie', year: item.year, rating: item.imdbRating, image: item.posterUrl || item.backdropUrl, description: `اطلاعات و نسخه‌های ثبت‌شدهٔ ${item.title} در آرشیو؛ کیفیت و زبان را پیش از شروع بررسی کنید.`, detail: `/${id}`, play: `/watch/${id}`, together: `/watch/${id}?together=1`, download: `/${id}#downloads` };
}

export function validateDossier(article) {
  if (!/^review-|^life-/.test(article.slug)) throw new Error('Invalid dossier namespace');
  if (article.sections.length < 6 || article.sources.length < 3) throw new Error(`${article.slug}: incomplete structure/references`);
  const words = countWords([article.intro, ...article.sections.flatMap(s => s.paragraphs), ...(article.critics ?? []).map(c => c.summary)].join(' '));
  // Reading time counts prose, not hundreds of filmography labels or schema.
  const minimum = article.seriesGuide?.batch === 1 ? 3000 : 850;
  if (words < minimum) throw new Error(`${article.slug}: ${words} words; at least ${minimum} original/attributed prose words required`);
  if (article.sections.some(s => !s.paragraphs.length) || /TODO|PLACEHOLDER|lorem ipsum/i.test(JSON.stringify(article))) throw new Error(`${article.slug}: unfinished manuscript`);
  if (article.dossier.kind === 'review' && (!article.sections.some(s => s.spoiler) || !article.critics?.length || article.media.length !== 1)) throw new Error(`${article.slug}: spoiler/critic/title missing`);
  if (article.dossier.kind === 'biography' && !article.filmography?.length) throw new Error(`${article.slug}: no verified filmography`);
  for (const s of article.sources) {
    const u = new URL(s.url); if (u.protocol !== 'https:' || u.username || u.password) throw new Error('Unsafe reference');
  }
  for (const c of article.critics ?? []) if (!article.sources.some(s => s.url === c.url)) throw new Error(`${article.slug}: unattributed critic`);
  if (!/^https:\/\//.test(article.image || '') && !/^\/media\/[^\\\u0000-\u0020]+$/.test(article.image || '')) throw new Error(`${article.slug}: unsafe/missing cover`);
  if (!Array.isArray(article.faqs) || article.faqs.length < 2) throw new Error(`${article.slug}: FAQs missing`);
  if (new Set(article.sections.map(s => s.id)).size !== article.sections.length) throw new Error('Duplicate section IDs');
  return { ...article, wordCount: words, readingMinutes: Math.ceil(words / 180) };
}

export async function buildDossiers({ dataDir = process.env.VOD_DATA_DIR || 'public/data', now = new Date(), validate = true } = {}) {
  const [vod, people, previous, titleMap] = await Promise.all([
    read(path.join(dataDir, 'vod-index.json')), read(path.join(dataDir, 'vod-people.json')),
    read(path.join(dataDir, 'magazine-dossiers.json')).catch(e => { if (e.code === 'ENOENT') return { articles: [] }; throw e; }),
    read(path.join(dataDir, 'title-map.json')).catch(() => ({})),
  ]);
  const catalog = new Map();
  for (const item of vod.items) if (!catalog.has(item.imdbCode) || item.linksCount > catalog.get(item.imdbCode).linksCount) catalog.set(item.imdbCode, item);
  const articles = [];
  for (const seed of [...reviewSelections, ...biographySelections]) {
    const bio = seed.slug.startsWith('life-');
    const person = bio ? people.people[seed.id] : null;
    const subject = bio ? person : catalog.get(seed.id);
    if (!subject) throw new Error(`${seed.slug}: subject missing from archive`);
    if (!bio && (!(subject.imdbRating >= 7.5) || !(subject.year >= 2025) || !(subject.linksCount > 0))) throw new Error(`${seed.slug}: no longer meets selection criteria`);
    const title = !bio ? await read(path.join(dataDir, 'titles', `${titleMap[seed.id] || seed.id}.json`)).catch(() => null) : null;
    const coverStill = [...(title?.imdbImages ?? []), ...(title?.movieshoImages ?? [])].find(i => i.width >= 960 && i.width > i.height && !/at an event|premiere|anniversary experience/i.test(i.caption || '') && (/^https:\/\//.test(i.url) || /^\/media\//.test(i.url)));
    const cover = bio ? person.imageUrl : coverStill?.url || subject.backdropUrl || subject.posterUrl;
    const portrait = bio || (!coverStill && (!subject.backdropUrl || subject.backdropUrl === subject.posterUrl));
    const body = parseManuscript(await readFile(path.join('content/magazine/dossiers', bio ? 'biographies' : 'reviews', seed.manuscript), 'utf8'));
    const seriesConfig = seriesBatchOne[seed.slug];
    if (seriesConfig) {
      const manuscriptWords = countWords([body.intro, ...body.sections.flatMap(section => section.paragraphs)].join(' ').replace(/\[([^\]]+)\]\([^\s)]+\)/gu, '$1'));
      if (manuscriptWords < 3000) throw new Error(`${seed.slug}: manuscript has only ${manuscriptWords} prose words`);
    }
    const episodeSnapshot = seriesConfig ? await read(path.join(dataDir, 'episode-metadata', `${seed.id}.json`)).catch(() => null) : null;
    const guide = seriesConfig ? seriesGuideData(seed, title, episodeSnapshot?.episodes || [], people.people) : null;
    if (guide && (!guide.cast.length || !guide.episodes.length)) throw new Error(`${seed.slug}: cast or episode data missing`);
    for (const section of body.sections) if (section.title.startsWith('[spoiler] ')) { section.spoiler = true; section.title = section.title.slice(10); }
    const related = bio ? [...new Map(person.items.filter(w => catalog.has(w.imdbCode)).map(w => [w.imdbCode, catalog.get(w.imdbCode)])).values()] : [subject];
    const primary = bio ? seed.works.map(id => related.find(w => w.imdbCode === id)).filter(Boolean) : [subject];
    if (bio && primary.length < Math.min(2, related.length)) throw new Error(`${seed.slug}: selected career works missing`);
    const selected = primary.map(w => media(w, !bio ? seed.name : undefined));
    const paths = selected.slice(0, 5).map(m => link(m.title, m.detail)).join('، ');
    if (bio) {
      const insight = biographyInsights[seed.slug.slice(5)];
      if (!insight) throw new Error(`${seed.slug}: individual career insight missing`);
      body.sections.push({ id: `section-${body.sections.length + 1}`, title: insight[0], paragraphs: [insight[1]] });
      const years = related.map(w => w.year).filter(y => Number.isInteger(y) && y > 1880).sort((a, b) => a - b);
      body.sections.push({ id: `section-${body.sections.length + 1}`, title: 'مسیرِ عملیِ مرورِ آثار در سرونما', paragraphs: [
        `در دادهٔ این پرونده، ${related.length.toLocaleString('fa-IR')} عنوانِ مرتبط با ${seed.name} در آرشیو شناسایی شده است${years.length ? `؛ سال‌های ثبت‌شده از ${years[0].toLocaleString('fa-IR', { useGrouping: false })} تا ${years.at(-1).toLocaleString('fa-IR', { useGrouping: false })} گسترده‌اند` : ''}. این بازه، آغاز و پایانِ واقعیِ حرفهٔ هنرمند را تعیین نمی‌کند. برای مرورِ پیشنهادی، ${selected.map(m => `${link(m.title, m.detail)}${m.year ? ` (${m.year})` : ''}`).join('، ')} را کنار هم بگذارید و نقشِ دقیقِ هنرمند را در شناسنامهٔ هر اثر بخوانید. مقایسهٔ مفید، فقط اختلافِ امتیاز نیست: اندازهٔ نقش، گروهِ همکاران، دورهٔ تولید و نوعِ مخاطب را هم در نظر بگیرید. می‌توانید نخست یک اثرِ آشنا و سپس انتخابی دورتر از تصویرِ مشهورِ او ببینید؛ این ترتیب کمک می‌کند کارنامه به تکرارِ یک نقش یا یک سبک تقلیل پیدا نکند.`,
      ] });
    }
    const lastSection = body.sections.at(-1);
    lastSection.paragraphs.push(bio
      ? `مسیر این پرونده را می‌توانید با ${paths} ادامه بدهید. ${link(`صفحهٔ اختصاصی ${seed.name}`, `/person/${seed.id}`)} آثار مرتبط در آرشیو را یک‌جا نشان می‌دهد. در این فهرست ممکن است بازیگری، نویسندگی، کارگردانی یا حضور مستند کنار هم باشند؛ ثبت ارتباط با هنرمند به معنای کارگردانی همهٔ عنوان‌ها نیست. فهرست پایین نیز محدود به داده‌های موجود سرونماست، نه تمام کارنامهٔ جهانی او. برای نقش دقیق و گروه سازندگان، شناسنامهٔ هر اثر را باز کنید.`
      : `برای رفتن از نقد به خود اثر، ${link(`صفحهٔ ${seed.name}`, `/${seed.id}`)} نقطهٔ شروع است. ${link('پخش آنلاین', `/watch/${seed.id}`)} و ${link('تماشای همزمان با دوستان', `/watch/${seed.id}?together=1`)} به همان عنوان متصل‌اند. در ${link('بخش دانلود و انتخاب کیفیت', `/${seed.id}#downloads`)} می‌توانید زبان و نسخهٔ موجود را ببینید. کیفیت تصویر با امتیاز هنری یکسان نیست: ۱۰۸۰ یا ۲۱۶۰ به فایل اشاره دارد، در حالی که دوبله، زیرنویس چسبیده و زیرنویس قابل انتخاب تجربهٔ زبانی را تغییر می‌دهند. برای سریال، فصل و قسمت را پیش از شروع یکسان انتخاب کنید.`);
    body.sections.push({ id: `section-${body.sections.length + 1}`, title: 'یادداشت منابع و حدود این پرونده', paragraphs: [bio
      ? `برای بررسی جزئیات زندگی ${seed.name}، ${link('منبع زندگی و کارنامه', seed.sources[1].url)} را کنار ${link('مرجع دوم', seed.sources[2].url)} بخوانید. خوانش سبک و پیشنهاد مسیر تماشا در این مقاله، تحلیل تحریریه است؛ از آن نباید انگیزهٔ خصوصی یا تشخیص روان‌شناختی هنرمند را نتیجه گرفت. خاطرهٔ پشت صحنه تنها وقتی به‌عنوان واقعه آمده که به مرجع مشخص متصل باشد. شمار آثار پایین با آرشیو سرونما تغییر می‌کند و معیار کامل‌بودن تاریخ سینما نیست. ترتیب زمانی فیلم‌ها نیز معادل رتبه‌بندی کیفیت آن‌ها نیست؛ تفاوت دوره‌ها و نقش هنرمند را در مقایسه حفظ کنید.`
      : `در ${link('IMDb', seed.sources[0].url)} رأی کاربران و شناسنامه را می‌بینید؛ ${link('صفحهٔ نقدهای Rotten Tomatoes', seed.sources[1].url)} مسیر مقایسهٔ دیدگاه‌هاست${seed.sources[2] ? ` و ${link('متن اصلی نقد', seed.sources[2].url)} استدلال کامل منتقد را در اختیار می‌گذارد` : ''}. این سرویس‌ها معیار یکسانی ندارند: میانگین رأی تماشاگر با سهم نقدهای مثبت یا میانگین وزنی نقدها قابل جایگزینی نیست. برای ${seed.name} عدد تازه‌ای از سرویس‌های خارجی حدس نزده‌ایم. تعبیرهای این مقاله از رابطه و فرم، خوانش تحریریه‌اند؛ نقل نظر منتقدان در بخش جدا و با نام منبع آمده است. اگر پس از انتشار امتیاز یا نسخه تغییر کند، تاریخ ثبت داده را در تفسیر اختلاف در نظر بگیرید.`] });
    if (!bio && seed.kind === 'series') body.sections.push({ id: `section-${body.sections.length + 1}`, title: 'راهنمای فصل، قسمت و زبان نسخه', paragraphs: [
      `برای ${seed.name}، کیفیت‌های ثبت‌شده هنگام آماده‌سازیِ پرونده عبارت‌اند از: ${(subject.qualities ?? []).join('، ') || 'اطلاعاتِ جزئی در صفحهٔ اثر'}. این فهرست، وضعیتِ دادهٔ آرشیو است، نه وعدهٔ موجودبودنِ همهٔ قسمت‌ها با همهٔ کیفیت‌ها. فهرستِ بازشدنیِ پایین، قسمت‌هایی را نشان می‌دهد که لینکِ مشخص دارند؛ نبودِ یک شماره به معنیِ پخش‌نشدنِ رسمیِ آن نیست. برای تماشای همزمان، فصل و قسمت را مشترک انتخاب کنید. اگر یک منبع در کشور شما باز نمی‌شود، نسخهٔ دیگری را از همان صفحه امتحان کنید؛ تغییرِ دوبله و زیرنویس ممکن است منبعِ فایل را هم عوض کند. از رویِ نامِ کیفیت، دربارهٔ زبان یا دسترسیِ جغرافیایی نتیجه نگیرید.`,
    ] });
    const old = previous.articles.find(a => a.slug === seed.slug);
    const article = {
      slug: seed.slug, title: seed.title, description: body.intro.split(/[.!؟]/u)[0].slice(0, 220), ...body,
      category: bio ? 'legends' : 'reviews', categoryLabel: bio ? 'اسطوره‌های سینما' : 'نقد و بررسی تازه‌ها',
      author: 'تحریریه سرونما', keywords: [seed.name, bio ? 'زندگینامه' : 'نقد و بررسی', bio ? 'فیلم شناسی' : 'داستان و تحلیل', 'سرونما'],
      image: cover,
      imageLayout: portrait ? 'portrait' : 'landscape',
      imageAlt: bio ? `تصویر ${seed.name} از پروفایل آرشیو سرونما` : `تصویر اصلی ${seed.name} از صفحهٔ اثر`,
      imageCaption: bio ? `عکس آرشیوی ${seed.name}؛ منبع تصویر، پروفایل هنرمند در آرشیو سرونما / IMDb.` : `${portrait ? 'پوستر' : 'عکس'} اصلی ${seed.name} از شناسنامه و گالریِ اثر در سرونما؛ تصویرسازی با هوش مصنوعی نیست.`,
      sources: seed.sources.map(s => ({ ...s })),
      critics: seed.critics,
      dossier: { kind: bio ? 'biography' : 'review', subjectId: seed.id, subjectName: seed.name, checkedAt: (bio ? people.generatedAt : vod.generatedAt),
        ...(!bio ? { rating: subject.imdbRating, votes: subject.imdbVotes } : {}),
        selectionNote: bio ? 'روایت تحلیلی زندگی حرفه‌ای، با تفکیک اطلاعات مستند از خوانش تحریریه؛ حکایت‌های بی‌منبع و شایعات شخصی حذف شده‌اند.' : 'انتخاب تحریریه از انتشارهای ۲۰۲۵ و ۲۰۲۶ با IMDb حداقل ۷٫۵ و حضور در گفت‌وگوی نقد حرفه‌ای. این انتخاب، ادعای رتبهٔ زندهٔ MovieMeter نیست. مقاله حاصل بررسی منابع و خوانش تحلیلی است، نه ادعای تماشای اختصاصی یا بازنشر کامل نقد منتقدان.' },
      media: selected, ...(bio ? { filmography: related.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.title.localeCompare(b.title)).map(w => ({ id: w.imdbCode, title: safeTitle(w.persianTitle) || w.title, year: w.year, kind: w.type, rating: w.imdbRating })) } : {}),
      faqs: bio ? [
        { question: `برای آشنایی با آثار ${seed.name} از کجا شروع کنم؟`, answer: `آثار منتخبِ این پرونده و لینکِ صفحهٔ اختصاصی هنرمند نقطهٔ شروع‌اند. پیشنهادها مسیرِ تماشا هستند، نه رتبه‌بندیِ قطعیِ تمام کارنامه. نقشِ دقیق هنرمند را در شناسنامهٔ هر عنوان بررسی کنید.` },
        { question: 'آیا فهرستِ پایین همهٔ آثارِ هنرمند در جهان را دارد؟', answer: 'خیر. فقط آثارِ مرتبطِ موجود در دادهٔ سرونما نمایش داده می‌شوند. برای فیلم‌شناسیِ بیرون از آرشیو، به منابعِ مرجع و شناسنامهٔ IMDb مراجعه کنید.' },
      ] : [
        { question: `می‌توانم نقد ${seed.name} را بدون اسپویل بخوانم؟`, answer: 'بخش‌های معرفی و نقدِ فرم بدون بازگوییِ نتیجه نوشته شده‌اند. تحلیلِ حساسِ داستان با نشانِ «خطر اسپویل» بسته است و فقط با انتخابِ خودتان باز می‌شود. تریلر و متنِ منابعِ خارجی ممکن است اطلاعاتِ بیشتری آشکار کنند.' },
        { question: 'لینکِ قسمت‌ها و کیفیت‌ها کجاست؟', answer: 'بخشِ نسخه‌های ثبت‌شده از دادهٔ فعلیِ اثر خوانده می‌شود. لینکِ هر قسمت به همان قسمتِ پلیر می‌رود؛ برای دانلود و انتخاب زبان یا کیفیت، صفحهٔ خودِ اثر را باز کنید. موجودیِ آرشیو تضمینِ دسترسیِ همهٔ منابع در هر کشور نیست.' },
      ],
      libraryLinks: bio ? [{ title: `آثار ${seed.name}`, href: `/person/${seed.id}` }, { title: 'پرونده‌های اسطوره‌های سینما', href: '/mag/topics/legends' }] : [{ title: 'نقد و بررسی تازه‌ها', href: '/mag/topics/reviews' }, { title: `نسخه‌های ${seed.name}`, href: `/${seed.id}#downloads` }],
      relatedSlugs: [], publishedAt: old?.publishedAt || now.toISOString(), modifiedAt: now.toISOString(),
    };
    if (!article.image) throw new Error(`${seed.slug}: no real image`);
    if (guide) {
      article.seriesGuide = guide;
      // Register manuscript citations so the inline renderer can safely link them.
      const referenced = [...new Set([seriesConfig.ratingSource, seriesConfig.additionalRatingSource,
        ...Object.values(seriesConfig.extraEpisodeSources || {}), guide.audienceUrl, guide.audienceSample?.url,
        ...[body.intro, ...body.sections.flatMap(s => s.paragraphs)].join(' ').matchAll(/\]\((https:\/\/[^\s)]+)\)/gu)].map(value => typeof value === 'string' ? value : value?.[1]).filter(Boolean))];
      for (const url of referenced) if (!article.sources.some(source => source.url === url)) article.sources.push({
        title: `${new URL(url).hostname.replace(/^www\./, '')} · ${decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).at(-1) || 'منبع')}`,
        url, checkedAt: seriesRatingsCheckedAt,
      });
    }
    const checked = validate ? validateDossier(article) : { ...article, wordCount: countWords([article.intro, ...article.sections.flatMap(s => s.paragraphs), ...(article.critics ?? []).map(c => c.summary)].join(' ')) };
    articles.push(checked);
  }
  // Related biographies and reviews are resolved by actual shared archive works.
  for (const a of articles) {
    const ids = new Set([...a.media, ...(a.filmography ?? [])].map(w => w.id));
    a.relatedSlugs = articles.filter(b => b.slug !== a.slug).map(b => ({ article: b,
      score: [...b.media, ...(b.filmography ?? [])].some(w => ids.has(w.id)) ? 10
        : a.category === b.category ? (a.category === 'reviews' && a.media[0]?.kind === b.media[0]?.kind ? 2 : 1) : 0,
    })).filter(b => b.score > 0).sort((a, b) => b.score - a.score || a.article.slug.localeCompare(b.article.slug)).slice(0, 4).map(b => b.article.slug);
  }
  const fingerprint = a => { const copy = { ...a }; delete copy.modifiedAt; return createHash('sha256').update(JSON.stringify(copy)).digest('hex'); };
  for (const a of articles) {
    const old = previous.articles.find(b => b.slug === a.slug);
    if (old && fingerprint(old) === fingerprint(a)) a.modifiedAt = old.modifiedAt;
  }
  return { version: 1, updatedAt: articles.map(a => a.modifiedAt).sort().at(-1) || now.toISOString(), articles };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const inspect = process.argv.includes('--inspect');
  const index = await buildDossiers({ validate: !inspect });
  if (process.argv.includes('--publish') && !inspect) await writeJsonAtomic(path.join(process.env.VOD_DATA_DIR || 'public/data', 'magazine-dossiers.json'), index);
  console.log(JSON.stringify({ articles: index.articles.length, reviews: index.articles.filter(a => a.category === 'reviews').length, biographies: index.articles.filter(a => a.category === 'legends').length,
    wordRange: [Math.min(...index.articles.map(a => a.wordCount)), Math.max(...index.articles.map(a => a.wordCount))],
    ...(inspect ? { words: index.articles.map(a => ({ slug: a.slug, words: a.wordCount })) } : {}),
    published: process.argv.includes('--publish') && !inspect }, null, 2));
}
