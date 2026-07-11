import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { PersonCard } from "@/components/person-card";
import { formatNumber, getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/server-locale";
import { loadTopPeople } from "@/lib/top-people";

export default async function PeoplePage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const topPeople = await loadTopPeople();

  return (
    <main className="shell">
      <section className="browse-hero people-list-hero">
        <div className="wrap">
          <header className="topbar">
            <BrandLogo locale={locale} compact />
            <div className="topbar-actions">
              <LanguageToggle locale={locale} />
              <Link className="chip" href="/">{t.common.home}</Link>
            </div>
          </header>

          <div className="browse-title">
            <div className="meta">
              <span>{t.people.top100}</span>
              <i className="dot" />
              <span>{formatNumber(topPeople.totalPeople, locale)} {t.people.people}</span>
            </div>
            <h1>{t.people.pageTitle}</h1>
          </div>
        </div>
      </section>

      <section className="section wrap">
        <div className="people-grid">
          {topPeople.people.slice(0, 100).map((person, index) => (
            <PersonCard key={person.id} person={person} locale={locale} rank={index + 1} />
          ))}
        </div>
      </section>
    </main>
  );
}
