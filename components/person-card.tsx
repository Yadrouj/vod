import Link from "next/link";
import { DEFAULT_LOCALE, formatNumber, getDictionary, type Locale } from "@/lib/i18n";
import type { TopPerson } from "@/lib/top-people";

export function PersonCard({ person, locale = DEFAULT_LOCALE, rank }: { person: TopPerson; locale?: Locale; rank?: number }) {
  const t = getDictionary(locale);
  const meta = [
    person.age ? `${formatNumber(person.age, locale)} ${t.people.age}` : null,
    `${formatNumber(person.worksCount, locale)} ${t.people.works}`,
  ].filter(Boolean).join(" / ");

  return (
    <Link className="person-card" href={`/person/${person.id}`}>
      <span className="person-rank">{rank ? String(rank).padStart(2, "0") : formatNumber(person.popularityScore, locale)}</span>
      <span className="person-avatar">
        {person.imageUrl ? (
          <i style={{ backgroundImage: `url(${person.imageUrl})` }} aria-label={person.name} />
        ) : (
          <span>{person.name.slice(0, 1)}</span>
        )}
      </span>
      <span className="person-card-copy">
        <strong>{person.name}</strong>
        <small>{person.categories.slice(0, 2).join(" / ") || t.people.actor}</small>
      </span>
      <small className="person-card-meta">{meta}</small>
    </Link>
  );
}
