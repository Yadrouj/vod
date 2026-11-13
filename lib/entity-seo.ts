import type { MusicArtist, MusicTrack } from './music-types';
import type { VodItem, VodPerson } from './types';
import type { DirectorProfile } from './creator-profile-types';
import { normalizeVodType } from './catalog';
import { contentRestriction } from './content-restrictions.mjs';
import { absoluteUrl, breadcrumbJsonLd, cleanSeoText, titleMetadata } from './seo';
import { localizedTitle } from './title-display';
import { bilingualName, personIdentity } from './person-names';

export type EntityFaq = { question: string; answer: string };
const count = (n: number) => n.toLocaleString('fa-IR');
export function personRole(categories: string[]) {
  if (categories.some(c => /actor|actress|cast|stars?/i.test(c))) return 'بازیگر';
  if (categories.some(c => /director/i.test(c))) return 'کارگردان';
  if (categories.some(c => /writer|creator/i.test(c))) return 'نویسنده و سازنده';
  return 'هنرمند سینما و تلویزیون';
}
export function personIntroduction(person: VodPerson) {
  const identity = personIdentity(person);
  const known = [...person.items].sort((a, b) => (b.imdbRating || 0) - (a.imdbRating || 0)).slice(0, 3);
  return `${bilingualName(identity.nameFa, identity.name)}، ${personRole(person.categories)}؛ در آرشیو سرونما ${count(person.items.length)} اثر مرتبط با این هنرمند ثبت شده است.${known.length ? ` از آثار موجود: ${known.map(item => localizedTitle(item, 'fa')).join('، ')}.` : ''}`;
}
export function personMetadata(person: VodPerson) {
  const identity = personIdentity(person);
  return titleMetadata({ title: `بیوگرافی ${bilingualName(identity.nameFa, identity.name)}؛ فهرست فیلم‌ها و سریال‌ها`,
    description: personIntroduction(person), pathname: `/person/${person.id}`, image: person.imageUrl,
    keywords: [identity.nameFa, identity.name, `فیلم‌های ${identity.nameFa}`, `سریال‌های ${identity.nameFa}`, 'بیوگرافی بازیگران'] });
}
export function directorMetadata(profile: DirectorProfile) {
  return titleMetadata({ title: `${bilingualName(profile.nameFa, profile.name)}؛ بیوگرافی و فیلم‌های کارگردان`,
    description: `${profile.nameFa}، کارگردان؛ ${profile.focusFa} معرفی و ${count(profile.directedIds.length)} اثر با نقش کارگردانی ثبت‌شده در سرونما.`,
    pathname: `/person/${profile.id}`, image: profile.imageUrl, keywords: [profile.nameFa, profile.name, `فیلم‌های ${profile.nameFa}`, 'بیوگرافی کارگردان'] });
}
export function personFaqs(person: VodPerson): EntityFaq[] {
  const name = personIdentity(person).nameFa;
  return [
    { question: `${name} کیست و چه آثاری در سرونما دارد؟`, answer: personIntroduction(person) },
    { question: `چطور فیلم‌ها و سریال‌های ${name} را ببینم؟`, answer: 'از فهرست آثار همین صفحه، عنوان موردنظر را باز کنید. اطلاعات بازیگران و عوامل، کیفیت‌ها و وضعیت لینک‌های ناشر در صفحهٔ هر اثر مشخص است؛ موجود بودن یک عنوان به معنی تضمین پخش همهٔ منابع نیست.' },
    { question: `آیا این فهرست تمام کارنامهٔ ${name} است؟`, answer: 'خیر؛ این فهرست آثار مرتبط موجود در آرشیو سرونماست، نه ادعای کامل‌بودن کارنامهٔ حرفه‌ای. نقش هر فرد از تیتراژ ثبت‌شده خوانده می‌شود؛ همهٔ ارتباط‌ها لزوماً بازیگری یا کارگردانی نیستند.' },
  ];
}
export function directorFaqs(profile: DirectorProfile): EntityFaq[] {
  return [
    { question: `${profile.nameFa} چه نوع فیلم‌هایی می‌سازد؟`, answer: profile.focusFa },
    { question: `کدام آثار ${profile.nameFa} در سرونما موجودند؟`, answer: `${count(profile.works.length)} اثر مرتبط در این صفحه ثبت شده است؛ ${count(profile.directedIds.length)} عنوان با نقش کارگردانی. بخش «آثار کارگردانی‌شده» از بازیگری، نویسندگی و دیگر ارتباط‌ها جداست.` },
    { question: 'اطلاعات بیوگرافی و فیلم‌ها از کجاست؟', answer: 'منابع معرفی و زندگی‌نامه در همین صفحه درج شده‌اند. لینک هر فیلم به صفحهٔ مستقل آن در سرونما می‌رود؛ وضعیت فصل‌ها، نسخه‌ها و منابع در صفحهٔ اثر بررسی می‌شود.' },
  ];
}
export function personJsonLd(person: VodPerson) {
  const identity = personIdentity(person), url = absoluteUrl(`/person/${person.id}`);
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'ProfilePage', '@id': `${url}#profile`, url, name: bilingualName(identity.nameFa, identity.name), description: personIntroduction(person), inLanguage: 'fa-IR',
      isPartOf: { '@id': absoluteUrl('/#website') }, mainEntity: { '@type': 'Person', '@id': `${url}#person`, url,
        name: identity.nameFa, alternateName: identity.name !== identity.nameFa ? identity.name : undefined,
        jobTitle: personRole(person.categories), image: person.imageUrl || undefined,
        sameAs: identity.source ? [identity.source] : undefined } },
    breadcrumbJsonLd([{ name: 'سرونما', pathname: '/' }, { name: 'بازیگران و عوامل', pathname: '/people' }, { name: identity.nameFa, pathname: `/person/${person.id}` }]),
  ] };
}
export function vodFaqs(item: VodItem): EntityFaq[] {
  const name = localizedTitle(item, 'fa'), series = normalizeVodType(item.type) === 'series';
  const type = series ? 'سریال' : 'فیلم';
  const seasons = new Set(item.links.map(link => link.season).filter((n): n is number => Boolean(n && n > 0)));
  const qualities = [...new Set(item.links.map(link => link.quality).filter(Boolean))];
  const restriction = contentRestriction(item);
  const faqs: EntityFaq[] = [{ question: `${type} ${name} دربارهٔ چیست؟`, answer: cleanSeoText(item.persianOverview || item.overview, 650) || `خلاصهٔ داستانِ تأییدشده برای ${name} هنوز در آرشیو ثبت نشده است؛ سال، ژانر و عوامل موجود را در بخش دربارهٔ اثر ببینید.` }];
  if (item.imdbRating != null) faqs.push({ question: `امتیاز IMDb ${name} چقدر است؟`, answer: `امتیاز ثبت‌شده در آرشیو ${item.imdbRating.toFixed(1)} از ۱۰${item.imdbVotes ? `، بر پایهٔ ${count(item.imdbVotes)} رأی` : ''} است. این عدد یک دادهٔ ثبت‌شده است، نه امتیاز زنده؛ برای آخرین تغییرات، صفحهٔ IMDb اثر را ببینید.` });
  faqs.push({ question: `${type} ${name} چه نسخه‌ها و کیفیت‌هایی دارد؟`, answer: restriction ? 'به‌دلیل گزارش حق نشر، پخش و دانلود این عنوان در سرونما غیرفعال است.'
    : item.links.length ? `${series && seasons.size ? `${count(seasons.size)} فصل در لینک‌های ثبت‌شده وجود دارد. ` : ''}${qualities.length ? `کیفیت‌های ثبت‌شده: ${qualities.join('، ')}. ` : ''}در بخش دانلود ابتدا نوع نسخه (دوبلهٔ فارسی، زیرنویس قابل تغییر یا چسبیده، در صورت وجود) و سپس کیفیت را انتخاب کنید؛ تعداد فصل‌های آرشیو لزوماً تعداد فصل‌های منتشرشده نیست.`
    : 'هنوز لینک فایل مستقیمی در آرشیو این عنوان ثبت نشده است. اگر پلیر رسمی ناشر موجود باشد، گزینهٔ پخش در همان صفحه دیده می‌شود؛ برای عنوان بدون فایل، وعدهٔ دانلود نمی‌دهیم.' });
  faqs.push({ question: `چطور ${name} را هم‌زمان با دوستان تماشا کنم؟`, answer: restriction ? 'تماشای هم‌زمان هم برای این عنوانِ محدودشده غیرفعال است.' : 'برای نسخه‌های دارای پخش، گزینهٔ تماشای هم‌زمان را انتخاب کنید، اتاق بسازید و لینک دعوت را برای دوستان بفرستید. دسترسی و سازگاری منبع باید برای همهٔ شرکت‌کنندگان برقرار باشد.' });
  return faqs;
}
export function musicFaqs(track: MusicTrack): EntityFaq[] {
  const title = track.persianTitle || track.title, artists = track.artists.map(a => a.name).join('، ');
  return [
    { question: `${title} اثر چه کسی است؟`, answer: `${title}${artists ? ` از ${artists}` : ''}${track.album?.title ? `، از آلبوم ${track.album.title}` : ''} در دستهٔ ${track.category || 'موسیقی'} ثبت شده است. لینک منبع و مشخصات اثر در همین صفحه دیده می‌شود.` },
    { question: `چطور ${title} را پخش یا دانلود کنم؟`, answer: track.sources.some(s => s.available !== false) ? 'از پلیر همین صفحه و انتخاب منبع یا کیفیت استفاده کنید. لینک دانلود، ابتدا صفحهٔ سرونما را باز می‌کند و سپس به فایل منبع می‌رود؛ پخش به سازگاری فایل و دسترسی ناشر وابسته است.' : 'در حال حاضر نسخهٔ در دسترس برای این اثر ثبت نشده است؛ تا تأمین منبع معتبر، پخش یا دانلود را تضمین نمی‌کنیم.' },
    { question: `آیا می‌توانم ${title} را با دوستان گوش کنم؟`, answer: 'برای منبعِ قابل‌پخش، گزینهٔ شنیدن هم‌زمان را بزنید و لینک اتاق را به اشتراک بگذارید. برای شنیدن شخصی هم می‌توانید اثر را به پلی‌لیست خود اضافه کنید.' },
  ];
}
export function artistFaqs(artist: MusicArtist, total: number): EntityFaq[] {
  return [
    { question: `چند اثر از ${artist.name} در سرونما موجود است؟`, answer: `${count(total)} اثر در فهرست این صفحه وجود دارد. این تعداد مربوط به آرشیو فعلی سرونماست، نه تمام آثار منتشرشدهٔ هنرمند؛ مشخصات آلبوم و منابع هر آهنگ را در صفحهٔ خودش ببینید.` },
    { question: `چطور آهنگ‌های ${artist.name} را پیدا کنم؟`, answer: 'از دسته‌بندی‌های همین صفحه یا جستجوی موسیقی استفاده کنید؛ صفحهٔ هر قطعه، اطلاعات اثر، منبع و گزینه‌های موجود برای پخش یا دانلود را نشان می‌دهد.' },
    { question: 'آیا زندگی‌نامه و تمام آلبوم‌ها در این صفحه هستند؟', answer: 'معرفی و منابع معتبر هرجا در دسترس باشند نمایش داده می‌شوند. آثار معرفی‌شده‌ای که هنوز فایل ندارند از آهنگ‌های قابل‌پخش جدا هستند؛ فهرست آرشیو را معادل کارنامهٔ کامل هنرمند نمی‌دانیم.' },
  ];
}
