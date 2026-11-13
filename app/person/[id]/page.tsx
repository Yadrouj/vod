import { decodedParams } from "@/lib/route-params";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { formatNumber, getDictionary, typeLabel } from "@/lib/i18n";
import { findPerson } from "@/lib/people";
import { getLocale } from "@/lib/server-locale";
import type { VodCard, VodPerson } from "@/lib/types";
import { loadCreatorProfiles } from '@/lib/creator-profiles';
import { DirectorProfileView } from '@/components/director-profile';
import { directorMetadata, personMetadata, personIntroduction, personFaqs, personJsonLd } from '@/lib/entity-seo';
import { personIdentity } from '@/lib/person-names';
import { localizedTitle } from '@/lib/title-display';
import { StructuredData } from '@/components/structured-data';
import { EntityFaqSection } from '@/components/entity-faq';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({params}:Props):Promise<Metadata> {
  const [{id},data]=await Promise.all([decodedParams(params),loadCreatorProfiles()]);
  const profile=data.directors.find(person=>person.personIds.includes(id));
  if(profile) return directorMetadata(profile);
  const person=await findPerson(id);
  return person ? personMetadata(person) : {title:'فرد پیدا نشد', robots: { index: false, follow: true }};
}

export default async function PersonPage({ params }: Props) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { id } = await decodedParams(params);
  const creators = await loadCreatorProfiles();
  const director = creators.directors.find(profile => profile.personIds.includes(id));
  if (director) return <DirectorProfileView profile={director} />;
  const person = await findPerson(id);
  if (!person) notFound();
  const identity = personIdentity(person);
  const name = locale === 'fa' ? identity.nameFa : identity.name;
  const stats = personStats(person);
  const works = [...person.items].sort(
    (a, b) => (b.year ?? 0) - (a.year ?? 0) || (b.imdbRating ?? 0) - (a.imdbRating ?? 0)
  );

  return (
    <main className="shell" data-media-theme="cinema">
      <StructuredData data={personJsonLd(person)} />
      <section className="person-hero person-page-hero">
        <div className="wrap">
          <header className="topbar person-topbar">
            <BrandLogo locale={locale} compact />
            <nav className="detail-breadcrumb" aria-label="Breadcrumb">
              <Link href="/">{t.common.home}</Link>
              <span aria-hidden="true">/</span>
              <Link href="/people">{t.people.people}</Link>
              <span aria-hidden="true">/</span>
              <span className="breadcrumb-current" aria-current="page">{name}</span>
            </nav>
            <div className="topbar-actions person-topbar-actions">
              <LanguageToggle locale={locale} />
              <Link className="pill" href="/people">{t.common.viewAll}</Link>
            </div>
          </header>

          <div className="person-layout">
            <div className="person-profile-column">
              <div className="person-title">
                {person.imageUrl ? (
                  <img src={person.imageUrl} alt={person.name} />
                ) : (
                  <span className="person-fallback">{person.name.slice(0, 1)}</span>
                )}
                <div>
                  <p className="label">{person.categories.join(" / ")}</p>
                  <h1>{name}</h1>
                  {identity.name !== name && <p lang="en" dir="ltr">{identity.name}</p>}
                  <div className="person-inline-stats">
                    <span>{formatNumber(person.items.length, locale)} {t.people.works}</span>
                    <span>{formatNumber(stats.movies, locale)} {t.people.movies}</span>
                    <span>{formatNumber(stats.series, locale)} {t.people.series}</span>
                  </div>
                </div>
              </div>
              <div className="person-bio-box">
                <p className="label">{t.people.history}</p>
                <h2>{t.people.career}</h2>
                <p className="muted">
                  {personIntroduction(person)}
                </p>
                <div className="person-genre-line">{stats.genres.slice(0, 5).join(" / ")}</div>
              </div>
            </div>
            <section className="person-works-column">
              <div className="person-works-head">
                <div>
                  <p className="label">{t.people.knownFor}</p>
                  <h2>{t.people.filmography}</h2>
                </div>
                <span>{formatNumber(person.items.length, locale)} {t.common.titles}</span>
              </div>
              <div className="person-works-rail">
                {works.map((item) => (
                  <Link
                    key={`${person.id}-${item.imdbCode}`}
                    href={`/${item.imdbCode}`}
                    className="person-work-card"
                    style={item.posterUrl ? { backgroundImage: `url(${item.posterUrl})` } : undefined}
                  >
                    <span className="person-work-shade" />
                    <span className="person-work-copy">
                      <strong>{localizedTitle(item, locale)}</strong>
                      <small>{[item.year ?? "-", typeLabel(item.type, locale), item.imdbRating ? `IMDb ${item.imdbRating.toFixed(1)}` : null].filter(Boolean).join(" / ")}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
          <EntityFaqSection items={personFaqs(person)} />
          {identity.source && <p><a href={identity.source} target="_blank" rel="noreferrer">منبع نام فارسی و اصلی · ویکی‌داده</a></p>}
        </div>
      </section>
    </main>
  );
}

function personStats(person: VodPerson) {
  const years = person.items.map((item) => item.year).filter((year): year is number => Boolean(year));
  return {
    movies: person.items.filter((item) => item.type === "movie").length,
    series: person.items.filter((item) => item.type === "series").length,
    firstYear: years.length ? Math.min(...years) : null,
    latestYear: years.length ? Math.max(...years) : null,
    genres: topGenres(person.items),
  };
}

function topGenres(items: VodCard[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const genre of item.genres) counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([genre]) => genre);
}
