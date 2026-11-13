export const CATALOG_HUBS = {
  films: { href: '/films', label: 'فیلم‌ها', labelEn: 'Films', params: { type: 'movie' }, title: 'فیلم‌ها؛ جستجوی فیلم ایرانی و خارجی', description: 'فهرست فیلم‌های سرونما با نام فارسی و اصلی؛ انتخاب بر اساس ژانر، سال، کشور و امتیاز IMDb، معرفی بازیگران و مقایسهٔ نسخه‌ها و منابع موجود.' },
  series: { href: '/series', label: 'سریال‌ها', labelEn: 'Series', params: { type: 'series' }, title: 'سریال‌ها؛ جستجو، فصل‌ها و قسمت‌های جدید', description: 'فهرست سریال‌های ایرانی و خارجی سرونما؛ جستجو با نام فارسی و اصلی، معرفی عوامل، امتیاز IMDb و بررسی فصل‌ها، قسمت‌ها و کیفیت‌های موجود.' },
  animation: { href: '/animation', label: 'انیمیشن', labelEn: 'Animation', params: { section: 'animation' }, title: 'انیمیشن‌ها؛ فیلم و سریال انیمیشنی', description: 'انیمیشن‌های موجود در سرونما؛ نام فارسی و اصلی، داستان، عوامل و منابع ثبت‌شده. پیش از تماشا، رده‌بندی سنی هر اثر را بررسی کنید.' },
  'top-imdb': { href: '/top-imdb', label: 'برترین‌های IMDb', labelEn: 'Top IMDb', params: { section: 'top-imdb' }, title: 'برترین‌های IMDb در آرشیو سرونما', description: 'فیلم‌ها و سریال‌های پُرامتیاز آرشیو سرونما بر پایهٔ امتیاز ثبت‌شدهٔ IMDb؛ همراه با معرفی، بازیگران و منابع موجود. این صفحه جایگزین جدول زندهٔ IMDb نیست.' },
  'iranian-films': { href: '/iranian-films', label: 'فیلم ایرانی', labelEn: 'Iranian films', params: { section: 'persian-movies' }, title: 'فیلم‌های ایرانی؛ معرفی، بازیگران و نسخه‌های موجود', description: 'جستجوی فیلم‌های ایرانی در سرونما؛ معرفی داستان و بازیگران، سال ساخت و نسخه‌های موجود. برای آثار کلاسیک، به فهرست فیلم‌های قدیمی ایرانی هم سر بزنید.' },
} as const;
export type CatalogHub = keyof typeof CATALOG_HUBS;
export const PRIMARY_SECTIONS = [
  CATALOG_HUBS.films, CATALOG_HUBS.series, CATALOG_HUBS.animation, CATALOG_HUBS['top-imdb'],
  { href: '/music', label: 'موسیقی', labelEn: 'Music' },
  { href: '/mag', label: 'مجلهٔ سرونما', labelEn: 'Magazine' },
  CATALOG_HUBS['iranian-films'],
];
export function hubForBrowse(params: Record<string, string>) {
  if (Object.entries(params).some(([key, value]) => value && !['type', 'section', 'sort'].includes(key))) return undefined;
  return Object.values(CATALOG_HUBS).find(hub => {
    const expected: Record<string, string> = hub.params;
    return ['type', 'section'].every(key => (params[key] || 'all') === (expected[key] || 'all'));
  });
}
