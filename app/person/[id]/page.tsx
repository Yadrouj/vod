import Link from "next/link";
import { notFound } from "next/navigation";
import { PosterCard } from "@/components/poster-card";
import { findPerson } from "@/lib/people";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PersonPage({ params }: Props) {
  const { id } = await params;
  const person = await findPerson(id);
  if (!person) notFound();

  return (
    <main className="shell">
      <section className="person-hero">
        <div className="wrap">
          <header className="topbar">
            <Link className="chip" href="/">Back to VOD</Link>
            <span className="pill">{person.items.length.toLocaleString()} titles</span>
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
            <PosterCard key={`${person.id}-${item.imdbCode}`} item={item} />
          ))}
        </div>
      </section>
    </main>
  );
}
