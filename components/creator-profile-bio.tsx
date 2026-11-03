import Link from 'next/link';
import type { CreatorBase } from '@/lib/creator-profile-types';
import styles from './creator-profiles.module.css';

export function CreatorProfileBio({ profile }: { profile: CreatorBase }) {
  return <section className={`${styles.bio} ${styles.portrait}`} aria-label="دربارهٔ هنرمند" data-creator-bio>
    <h2>دربارهٔ {profile.nameFa}</h2>
    <p>{profile.focusFa}</p>
    <p lang="en" dir="ltr">{profile.name} · {profile.description}</p>
    {profile.biographyEn && <details><summary>زندگی‌نامهٔ بیشتر · English</summary><div lang="en" dir="ltr">{profile.biographyEn.split(/\n+/).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
      <p className={styles.note}>برگرفته از <a href={profile.biographySourceUrl} target="_blank" rel="noreferrer">Wikipedia؛ متن و تاریخچهٔ نویسندگان</a>، با مجوز <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. متن زندگی‌نامه جدا از معرفیِ تألیفیِ فارسی و بدون ترجمه بازنشر شده است.</p>
    </details>}
    <p className={styles.note}>{profile.birthDate && <>زادروز: <time dateTime={profile.birthDate.includes('-00')?profile.birthDate.slice(0,4):profile.birthDate}>{profile.birthDate.slice(0,4)}</time></>}
      {profile.deathDate && <> · درگذشت: <time dateTime={profile.deathDate.includes('-00')?profile.deathDate.slice(0,4):profile.deathDate}>{profile.deathDate.slice(0,4)}</time></>}</p>
    <details><summary>منابع، عکس و دربارهٔ این انتخاب</summary>
      <p className={styles.note}>این یکی از ۱۰۰ انتخاب تحریریهٔ سرونماست؛ فهرست شماره‌گذاری‌شده یا رتبه‌بندی رسمی نیست. اطلاعات هویت از ویکی‌داده و معرفی‌های پیوندشده بررسی شده است. آثار موجود، فقط آرشیو سرونما هستند؛ نه تمام کارنامهٔ جهانی هنرمند.</p>
      <div className={styles.links}>{profile.sources.map(source => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.label} ↗</a>)}
        <a href={profile.imageSourceUrl} target="_blank" rel="noreferrer">منبع و مشخصات عکس ↗</a>
        <Link href={profile.kind === 'director' ? '/people/directors' : '/music/artists/top-100'}>مجموعهٔ ۱۰۰ {profile.kind === 'director' ? 'کارگردان' : 'خواننده'}</Link>
      </div>
      {profile.imageCredit && <p className={styles.note}>عکس: {profile.imageCredit.artist || 'Wikimedia Commons'} · <a href={profile.imageCredit.licenseUrl} target="_blank" rel="noreferrer">{profile.imageCredit.license}</a> · مجوز عکس مستقل از متن زندگی‌نامه است.</p>}
    </details>
  </section>;
}
