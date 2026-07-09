import Link from "next/link";
import { notFound } from "next/navigation";
import { LanguageToggle } from "@/components/language-toggle";
import { PosterCard } from "@/components/poster-card";
import { formatNumber, getDictionary } from "@/lib/i18n";
import { findPerson } from "@/lib/people";
import { getLocale } from "@/lib/server-locale";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PersonPage({ params }: Props) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { id } = await params;
  const person = await findPerson(id);
  if (!person) notFound();

  return (
    <main className="shell">
      <section className="person-hero">
        <div className="wrap">
          <header className="topbar">
            <div className="topbar-actions">
              <LanguageToggle locale={locale} />
              <Link className="chip" href="/">{t.common.backToVod}</Link>
            </div>
            <span className="pill">{formatNumber(person.items.length, locale)} {t.common.titles}</span>
          </header>

          <div className="person-title">
            {person.imageUrl ? (
              <img src={person.imageUrl} alt={person.name} />
            ) : (
              <span className="person-fallback">{person.name.slice(0, 1)}</span>
            )}
            <div>
              <p className="label">{person.categories.join(" / ")}</p>
              <h1>{person.name}</h1>
            </div>
          </div>
        </div>
      </section>

      <section className="section wrap">
        <div className="grid browse-grid">
          {person.items.map((item) => (
            <PosterCard key={`${person.id}-${item.imdbCode}`} item={item} locale={locale} />
          ))}
        </div>
      </section>
    </main>
  );
}
