/** Telegram reports unchanged channel metadata as an error, not success. */
export function profileUpdateUnchanged(method, result) {
  return ['setChatTitle', 'setChatDescription'].includes(method) && result.error_code === 400
    && /^Bad Request: chat (?:title|description) is not modified$/i.test(result.description || '');
}

export function searchBotProfile(vod, music) {
  const number = value => new Intl.NumberFormat('fa-IR').format(Math.max(0, Number(value) || 0));
  const inventory = `${number(vod.totals.movies)} فیلم · ${number(vod.totals.series)} سریال · ${number(music.totals.tracks)} موسیقی و موزیک‌ویدئو`;
  return {
    name: 'سرونما | موتور جستجوی فیلم، سریال و موسیقی',
    short_description: `موتور جستجوی فیلم، سریال و موسیقی | ${number(vod.totals.titles)} عنوان نمایشی | sarvnema.ir`,
    description: `سرونما؛ موتور جستجوی فیلم، سریال و موسیقی 🌿\n${inventory}\nجستجو با نام فارسی و اصلی، اصلاح غلط املایی، فیلتر ژانر و سال، انتخاب فصل و قسمت، پخش آنلاین و تماشای همزمان. لینک‌ها به صفحات سرونما می‌روند.\nتوسعه‌دهندگان: /apikey\nsarvnema.ir`,
    intro: `🔎 <b>سرونما؛ موتور جستجوی فیلم، سریال و موسیقی</b>\n\nاسم فیلم، سریال یا خواننده را بفرست؛ پیشنهادهای نزدیک را پیدا می‌کنیم.\n\n<b>${inventory}</b>\n\nژانر و سال را فیلتر کن؛ برای سریال، فصل و قسمت را انتخاب کن. لینک‌های پخش و دانلود در صفحهٔ خود اثر باز می‌شوند.\n\nاز کجا شروع کنیم؟`,
    channelTitle: 'سرونما | جستجوی فیلم، سریال و موسیقی',
    channelDescription: `🔎 سرونما؛ موتور جستجوی فیلم، سریال و موسیقی\n${inventory}\nنام فارسی و اصلی، تازه‌های آرشیو، پخش آنلاین و تماشای همزمان\n🌐 sarvnema.ir\n🤖 @Sarvnema_bot`,
  };
}
