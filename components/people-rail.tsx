import Link from "next/link";
import { PersonCard } from "@/components/person-card";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";
import type { TopPerson } from "@/lib/top-people";

export function PeopleRail({ people, locale = DEFAULT_LOCALE }: { people: TopPerson[]; locale?: Locale }) {
  if (!people.length) return null;
  const t = getDictionary(locale);

  return (
    <section className="section people-section">
      <div className="section-head">
        <div>
          <h2>{t.people.homeTitle}</h2>
          <p className="muted">{t.people.homeSubtitle}</p>
        </div>
        <Link className="view-all" href="/people">
          {t.common.viewAll}
        </Link>
      </div>
      <div className="people-rail">
        {people.slice(0, 12).map((person, index) => (
          <PersonCard key={person.id} person={person} locale={locale} rank={index + 1} />
        ))}
      </div>
    </section>
  );
}
