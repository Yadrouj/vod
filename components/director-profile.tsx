import Link from 'next/link';
import { BrandLogo } from './brand-logo';
import { CreatorPortrait } from './creator-portrait';
import { CreatorProfileBio } from './creator-profile-bio';
import { StructuredData } from './structured-data';
import { absoluteUrl } from '@/lib/seo';
import type { DirectorProfile } from '@/lib/creator-profile-types';
import type { VodCard } from '@/lib/types';
import styles from './creator-profiles.module.css';

export function DirectorProfileView({ profile }: { profile: DirectorProfile }) {
  const directed = new Set(profile.directedIds);
  const directedWorks = profile.works.filter(work => directed.has(work.imdbCode));
  const related = profile.works.filter(work => !directed.has(work.imdbCode));
  return <main className={`shell ${styles.page}`} dir="rtl" data-director-profile={profile.id}><div className="wrap">
    <header className={styles.top}><BrandLogo locale="fa" compact /><Link href="/people/directors">۱۰۰ کارگردان برجسته</Link></header>
    <section className={styles.hero}><CreatorPortrait src={profile.imageUrl} name={profile.nameFa} eager />
      <div><span className={styles.eyebrow}>کارگردان · انتخاب تحریریهٔ سرونما</span><h1>{profile.nameFa}</h1><p lang="en" dir="ltr">{profile.name}</p>
        <p>{profile.works.length.toLocaleString('fa-IR')} اثر مرتبط در آرشیو</p>
        <div className={styles.links}><a href="#directed">آثار کارگردانی‌شده</a><a href="#related">دیگر ارتباط‌ها</a><Link href="/people">همهٔ عوامل</Link></div>
      </div>
    </section>
    <CreatorProfileBio profile={profile} />
    <section className={styles.section} id="directed"><h2>آثار کارگردانی‌شده در سرونما</h2>
      <p className={styles.note}>فقط آثاری که نام این هنرمند در عنوانِ «کارگردان» تیتراژِ ثبت‌شدهٔ آن‌ها آمده است.</p>
      {directedWorks.length ? <Works works={directedWorks} /> : <p className={styles.note}>هنوز عنوانی با نقشِ کارگردانیِ تأییدشده در آرشیو ثبت نشده است.</p>}
    </section>
    <section className={styles.section} id="related"><h2>دیگر آثار مرتبط در آرشیو</h2>
      <p className={styles.note}>شامل بازیگری، نویسندگی، حضور مستند و سایر ارتباط‌های ثبت‌شده؛ حضور در این بخش به معنای کارگردانیِ اثر نیست.</p>
      {related.length ? <Works works={related} /> : <p className={styles.note}>ارتباطِ دیگری در آرشیو فعلی ثبت نشده است.</p>}
    </section>
    <StructuredData data={{ '@context':'https://schema.org','@type':'ProfilePage',url:absoluteUrl(`/person/${profile.id}`),name:profile.nameFa,
      mainEntity:{'@type':'Person',name:profile.name,alternateName:profile.nameFa,description:profile.focusFa,image:profile.imageUrl,jobTitle:'Film director',
        sameAs:profile.sources.map(source=>source.url)} }} />
  </div></main>;
}

function Works({works}:{works:VodCard[]}) {
  return <div className={styles.works}>{works.map(work=><Link className={styles.work} href={`/${work.imdbCode}`} key={work.imdbCode} data-director-work>
    {work.posterUrl && <img src={work.posterUrl} alt={work.persianTitle || work.title} loading="lazy" decoding="async" />}
    <strong>{work.persianTitle || work.title}</strong><small>{work.year || '—'} · {work.type==='series'?'سریال':'فیلم'}{work.imdbRating ? ` · IMDb ${work.imdbRating.toFixed(1)}` : ''}</small>
    <small>{work.qualities.length ? work.qualities.join(' · ') : 'اطلاعات اثر و وضعیت دسترسی'}</small>
  </Link>)}</div>;
}
