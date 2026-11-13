import Link from 'next/link';
import { BrandLogo } from './brand-logo';
import { CreatorPortrait } from './creator-portrait';
import { StructuredData } from './structured-data';
import { absoluteUrl } from '@/lib/seo';
import { identityKey } from '@/lib/creator-identities.mjs';
import type { DirectorProfile, SingerProfile } from '@/lib/creator-profile-types';
import styles from './creator-profiles.module.css';
import { EntityFaqSection } from './entity-faq';

export function CreatorDirectory({ profiles, kind, query, available }: { profiles: DirectorProfile[] | SingerProfile[]; kind: 'director' | 'singer'; query: string; available: boolean }) {
  const music = kind === 'singer';
  const base = music ? '/music/artists/top-100' : '/people/directors';
  const noun = music ? 'خواننده' : 'کارگردان';
  const worksCount = (profile: DirectorProfile | SingerProfile) => profile.kind === 'director' ? profile.works.length : profile.archiveTrackCount;
  const needle = identityKey(query);
  const visible = profiles.filter(profile => (!available || worksCount(profile) > 0) && (!needle || [profile.name, profile.nameFa, ...profile.aliases].some(name => identityKey(name).includes(needle))));
  const href = (value: boolean) => `${base}?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(value ? { available: '1' } : {}) })}`;
  return <main className={`shell ${styles.page} ${music ? styles.music : ''}`} dir="rtl" data-creator-directory={kind}>
    <div className="wrap">
      <header className={styles.top}><BrandLogo locale="fa" compact /><Link href={music ? '/music/artists' : '/people'}>بازگشت به همهٔ هنرمندان</Link></header>
      <div className={styles.intro}><span className={styles.eyebrow}>۱۰۰ چهره، مسیرهای تازه برای کشف</span><h1>۱۰۰ {noun} برجستهٔ {music ? 'موسیقی' : 'سینما'}</h1>
        <p>{music ? 'از موسیقی ایرانی تا صداهای ماندگار جهان؛ معرفی هنرمند، تمام آثار مرتبطِ موجود در سرونما و پیشنهادهایی با نام و کاور برای کشف بیشتر.' : 'از سینمای کلاسیک تا فیلم‌سازان معاصر و ایرانی؛ با صفحهٔ اختصاصی، آثار کارگردانی‌شده و دیگر ارتباط‌های ثبت‌شده در آرشیو سرونما.'}</p>
        <p>انتخاب تحریریه برای کشف و آشنایی؛ ترتیب نمایش نشانهٔ رتبه نیست و ادعای فهرست رسمیِ «بهترین‌های جهان» نداریم.</p></div>
      <form action={base} role="search" className={styles.search}>
        {available && <input type="hidden" name="available" value="1" />}
        <input type="search" name="q" defaultValue={query} aria-label={`جستجوی ${noun}`} placeholder="نام فارسی یا انگلیسی را بنویسید…" /><button type="submit">جستجو</button>
      </form>
      <nav className={styles.tabs} aria-label="فیلتر دسترسی"><Link href={href(false)} aria-current={!available ? 'page' : undefined}>همهٔ ۱۰۰ چهره</Link><Link href={href(true)} aria-current={available ? 'page' : undefined}>دارای اثر در سرونما</Link>{query && <Link href={base}>پاک‌کردن جستجو</Link>}</nav>
      <p className={styles.note} role="status">{visible.length.toLocaleString('fa-IR')} {noun}</p>
      {music && <p className={styles.note}><a href="/data/creator-music-gaps.json" download>دریافت فهرست نام و کاورِ آثار ناموجود در آرشیو (JSON) ↓</a></p>}
      <div className={styles.grid}>{visible.map((profile,index) => <Link key={profile.wikidataId} className={styles.card}
        href={profile.kind === 'director' ? `/person/${profile.id}` : `/music/artists/${profile.slug}`} data-creator-card>
        <CreatorPortrait src={profile.imageUrl} name={profile.nameFa} eager={index < 4} />
        <strong>{profile.nameFa}</strong><small lang="en" dir="ltr">{profile.name}</small>
        <small>{worksCount(profile) ? `${worksCount(profile).toLocaleString('fa-IR')} اثر در سرونما` : 'معرفی و آثار پیشنهادی'}</small>
      </Link>)}</div>
      {!visible.length && <p className={styles.note}>با این فیلتر چهره‌ای پیدا نشد. نام دیگری بنویسید یا فیلتر را بردارید.</p>}
      <EntityFaqSection items={[
        { question: `این فهرست ${noun}‌ها چگونه انتخاب شده است؟`, answer: 'انتخاب تحریریهٔ سرونما برای کشف و آشنایی با هنرمندان است؛ ترتیب کارت‌ها رتبه‌بندی رسمی یا ادعای بهترین‌بودن نیست. منابع معرفی و تصویر در صفحهٔ هر فرد آمده‌اند.' },
        { question: `چطور آثار یک ${noun} را پیدا کنم؟`, answer: 'نام فارسی یا اصلی را جستجو کنید و وارد پروفایل شوید. آثار موجود به صفحهٔ مستقل خود در سرونما لینک دارند؛ معرفی اثری که فایل ندارد به معنی امکان پخش آن نیست.' },
      ]} />
      <StructuredData data={{ '@context':'https://schema.org','@type':'CollectionPage',name:`۱۰۰ ${noun} برجسته`,url:absoluteUrl(base),
        mainEntity: { '@type':'ItemList', itemListOrder:'https://schema.org/ItemListUnordered',numberOfItems:visible.length,
          itemListElement:visible.map(profile => ({'@type':'ListItem',item:{'@type':'ProfilePage',name:profile.nameFa,url:absoluteUrl(profile.kind === 'director' ? `/person/${profile.id}` : `/music/artists/${profile.slug}`)}})) } }} />
    </div>
  </main>;
}
