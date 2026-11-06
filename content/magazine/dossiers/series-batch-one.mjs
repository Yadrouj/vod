// IMDb values observed in indexed public IMDb pages on 2026-11-06.
// Snapshot values are deliberately distinct from the live series aggregate.
export const seriesBatchOne = {
  'review-adolescence': { id: 'tt31806037', seasons: { 1: [8.8, 8.0, 9.1, 8.4] }, ratingSource: 'https://www.imdb.com/title/tt31806037/episodes/?year=2025' },
  'review-the-pitt': { id: 'tt31938062', seasons: { 1: [8.2, 8.5, 8.3, 8.4, 8.2, 8.1, 8.2, 9.2, 8.6, 8.9, 8.7, 9.6, 9.6, 8.8, 9.1], 2: [8.2, 8.1, 8.1, 8.1, 8.2, 8.9, 8.6, 8.3, 8.5, 8.7, 8.7, 8.7, 8.6, 8.9, 9.1] }, ratingSource: 'https://www.imdb.com/title/tt31938062/ratings/' },
  'review-dept-q': { id: 'tt27995114', seasons: { 1: [7.6, 7.7, 7.7, 7.7, 7.9, 8.0, 8.0, 8.1, 8.6] }, ratingSource: 'https://www.imdb.com/title/tt27995114/episodes/' },
  'review-the-studio': { id: 'tt23649128', seasons: { 1: [8.4, 9.0, 8.3, 7.8, 7.4, 7.9, 8.2, 8.5, 8.6, 8.6] }, ratingSource: 'https://www.imdb.com/title/tt23649128/episodes/' },
  'review-pluribus': { id: 'tt22202452', seasons: { 1: [8.9, 8.3, 7.8, 8.1, 7.8, 7.8, 7.5, 7.7, 8.2] }, ratingSource: 'https://www.imdb.com/title/tt22202452/episodes/' },
  'review-mobland': { id: 'tt31510819', seasons: { 1: [8.0, 8.2, 8.0, 7.9, 8.4, 8.3, 8.5, 8.3, 8.2, 8.6], 2: [8.2, 8.4, 8.3, 8.5, 8.3, 7.7, 8.7] }, ratingSource: 'https://www.imdb.com/title/tt31510819/ratings', additionalRatingSource: 'https://www.imdb.com/title/tt31510819/episodes/?season=2', extraEpisodeSources: { '2:5': 'https://shevato.com/apps/rising-shows/shows/mobland-tt31510819/', '2:6': 'https://shevato.com/apps/rising-shows/shows/mobland-tt31510819/', '2:7': 'https://shevato.com/apps/rising-shows/shows/mobland-tt31510819/' } },
  'review-paradise': { id: 'tt27444205', seasons: { 1: [8.2, 7.6, 7.5, 8.1, 8.1, 8.0, 9.5, 8.1], 2: [8.4, 7.3, 7.6, 8.7, 8.3, 7.1, 8.4, 8.4] }, ratingSource: 'https://www.imdb.com/title/tt27444205/episodes/', additionalRatingSource: 'https://episodes.cool/title/tt27444205/paradise/' },
  'review-task': { id: 'tt28013708', seasons: { 1: [7.8, 8.0, 8.0, 8.1, 8.7, 9.0, 8.7] }, ratingSource: 'https://www.imdb.com/title/tt28013708/episodes/' },
  'review-when-life-gives-you-tangerines': { id: 'tt26471411', seasons: { 1: [8.4, 8.5, 9.0, 9.0, 8.8, 9.3, 8.0, 8.6, 8.3, 8.7, 8.8, 8.9, 9.2, 9.0, 9.1, 9.5] }, ratingSource: 'https://www.imdb.com/title/tt26471411/' },
  'review-dexter-resurrection': { id: 'tt33043892', seasons: { 1: [8.9, 8.7, 9.2, 9.7, 9.1, 9.5, 9.5, 9.0, 9.7, 9.5], 2: [9.0] }, ratingSource: 'https://www.imdb.com/title/tt33043892/episodes/', extraEpisodeSources: { '1:7': 'https://tvshows.denialof.services/dexter-resurrection-33043892', '1:10': 'https://www.imdb.com/title/tt36332569/ratings/', '1:9': 'https://www.imdb.com/title/tt36351486/ratings/', '1:8': 'https://www.imdb.com/title/tt36351483/', '2:1': 'https://www.imdb.com/title/tt38162679/ratings/' } },
};

export const seriesRatingsCheckedAt = '2026-11-06T00:00:00.000Z';

// Small, attributed qualitative samples; these are not representative surveys.
export const seriesAudienceSamples = {
  'review-adolescence': { url: 'https://www.reddit.com/r/television/comments/1jm6puh', summary: 'در این گفت‌وگو، چند مخاطب بازی‌ها و برداشت پیوسته را عامل درگیرشدن با داستان می‌دانند؛ در همان بحث، دیدگاهی هم مطرح است که نمایش توانایی بازیگران و کارگردان را پررنگ‌تر از خود قصه می‌بیند.' },
  'review-the-pitt': { url: 'https://www.reddit.com/r/ThePittTVShow/comments/1uritwz/medical_people_is_this_show_too_real/', summary: 'در این بحث، برخی مشارکت‌کنندگان که خود را آشنا با کار درمان معرفی می‌کنند، از بازنمایی کمبود نیرو و فشار شغلی استقبال کرده‌اند. در کنار آن، دربارهٔ آزادی‌های نمایشی سریال و سنگینی عاطفی تماشایش نیز اختلاف‌نظر وجود دارد؛ هویت و حرفهٔ نویسندگان نظرها مستقلاً تأیید نشده است.' },
  'review-dept-q': { url: 'https://www.reddit.com/r/netflix/comments/1uesfn2/i_just_started_dept_q/', summary: 'موضوع مشترک این گفت‌وگو، ریتم شروع است. بعضی مخاطبان توصیه می‌کنند برای جاافتادن گروه تحقیق چند قسمت فرصت بدهیم؛ عده‌ای دیگر همین کندی را دلیل رهاکردن مجموعه می‌دانند. تعریف از بازی متیو گود نیز در میان پاسخ‌ها دیده می‌شود.' },
  'review-the-studio': { url: 'https://www.reddit.com/r/television/comments/1nz8lbj/just_finished_the_studio_and_honestly_didnt/', summary: 'در این بحث، مخاطبانی که از نتیجه غافلگیر شده‌اند، به قوس کمدی و رابطهٔ عاشقانه و انتقادی سریال با صنعت سینما اشاره می‌کنند. این نمونه نشان می‌دهد آشنایی یا علاقهٔ قبلی به ست روگن، تنها مسیر ارتباط با مجموعه نیست.' },
  'review-pluribus': { url: 'https://www.reddit.com/r/television/comments/1p2m5e6/pluribus_1x04_please_carol_episode_discussion/', summary: 'در گفت‌وگوی قسمت چهارم، اختلاف بر سر ریتم روشن است: برخی تمرکز بر تجربهٔ کارول و فرصت فکرکردن را دوست دارند؛ برخی دیگر انتظار دارند سازوکار جهان زودتر روشن شود. این نمونه، تفاوت انتظار از علمی‌تخیلی معمایی و مطالعهٔ شخصیت را نشان می‌دهد.' },
  'review-mobland': { url: 'https://www.reddit.com/r/Mobland/comments/1l16fh3', summary: 'نویسندهٔ این بحث با توجه به حضور تام هاردی و امتیاز بالا وارد سریال شده، اما از ادامهٔ تجربه ناراضی است. پاسخ‌هایی هم تصمیم‌گیری پس از چند قسمت را زیر سؤال می‌برند. این نمونه یادآور فاصلهٔ شهرت بازیگر و امتیاز تجمیعی با سلیقهٔ فردی است.' },
  'review-paradise': { url: 'https://www.reddit.com/r/television/comments/1s9jarg/why_is_paradise_rated_so_highly_no_spoilers/', summary: 'در این بحث، برخی مخاطبان با کیفیت نگارش و میزان تحسین سریال مشکل دارند، در حالی که دیگران از کنجکاوی پس از هر قسمت و جذابیت وجه فاجعه‌ای دفاع می‌کنند. واکنش به چرخش ژانر یکدست نیست و بخشی از اختلاف به انتظار اولیه از مجموعه برمی‌گردد.' },
  'review-task': { url: 'https://www.reddit.com/r/hbo/comments/1odqzye/whatd_everyone_think_of_task/', summary: 'در این گفت‌وگو، استقبال از بازی تام پلفری و مارک رافلو کنار انتقاد از دیالوگ‌ها و بعضی خطوط فرعی دیده می‌شود. برخی مجموعه را درامی انسانی و تأثیرگذار می‌خوانند و بعضی آن را خوب اما پایین‌تر از بهترین تولیدات HBO ارزیابی می‌کنند.' },
  'review-when-life-gives-you-tangerines': { url: 'https://www.imdb.com/title/tt26471411/', summary: 'در نقد شاخص نمایش‌داده‌شده با نام کاربری mhStella، صداقت احساسی، بازی‌ها و تصویرپردازی ستایش شده است. نقد کاربری Kiara_0516 نیز واکنش عاطفی شدیدی توصیف می‌کند، اما صریحاً فقط پس از چهار قسمت نوشته شده و ارزیابی پایان مجموعه محسوب نمی‌شود.' },
  'review-dexter-resurrection': { url: 'https://www.reddit.com/r/Dexter/comments/1ncerhh/whats_with_the_imdb_rating_for_resurrection_so_far/', summary: 'در این بحث، برخی طرفداران دربارهٔ تناسب امتیازهای بسیار بالا با کیفیت واقعی سؤال می‌کنند؛ در پاسخ، به لذت بازگشت دکستر، گسترده‌ترشدن مشارکت در رأی‌گیری و تفاوت نسل مخاطبان اشاره می‌شود. از این نظرها نمی‌توان دستکاری امتیازها را اثبات کرد.' },
};

export function seriesGuideData(seed, title, episodes, people) {
  const config = seriesBatchOne[seed.slug];
  if (!config) return null;
  const unique = new Map();
  for (const row of episodes) {
    if (!Number.isInteger(row.season) || row.season < 1 || !Number.isInteger(row.episode) || row.episode < 1) continue;
    unique.set(`${row.season}:${row.episode}`, {
      season: row.season, episode: row.episode, title: row.title,
      rating: config.seasons[row.season]?.[row.episode - 1] ?? null,
      sourceUrl: config.extraEpisodeSources?.[`${row.season}:${row.episode}`] || (row.season === 2 && config.additionalRatingSource ? config.additionalRatingSource : config.ratingSource),
    });
  }
  const cast = [...new Map((title?.credits || []).filter(c => /star|cast/i.test(c.category) && people[c.name_id])
    .map(c => [c.name_id, { id: c.name_id, name: c.name_text, image: c.name_image_url || null }])).values()];
  const rows = [...unique.values()].sort((a, b) => a.season - b.season || a.episode - b.episode);
  return { batch: 1, checkedAt: seriesRatingsCheckedAt, ratingMethod: 'indexed-imdb-snapshot', cast, episodes: rows,
    audienceSample: seriesAudienceSamples[seed.slug],
    audienceUrl: `https://www.imdb.com/title/${config.id}/reviews/`,
    ratedCount: rows.filter(row => row.rating !== null).length };
}
