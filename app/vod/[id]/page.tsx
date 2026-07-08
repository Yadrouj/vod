import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { findVodItem, normalizeVodType, type VodLink } from "@/lib/vod";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await findVodItem(id);
  if (!item) return { title: "Title not found | VOD" };

  return {
    title: `${item.title} | VOD`,
    description: `${item.title} download links, IMDb rating, genres, runtime and archive details.`,
  };
}

export default async function VodDetailPage({ params }: Props) {
  const { id } = await params;
  const item = await findVodItem(id);
  if (!item) notFound();

  const grouped = groupLinks(item.links);
  const bestLink = item.links[0];

  return (
    <div dir="ltr" className="min-h-dvh bg-[#050505] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(245,197,66,0.16),transparent_28%),linear-gradient(135deg,#151518,#050505_62%)]" />
        <div className="relative mx-auto grid min-h-[72vh] w-full max-w-7xl gap-8 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
          <div className="flex flex-col justify-between gap-10">
            <header className="flex items-center justify-between">
              <Link
                href="/vod"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/[0.16]"
              >
                <Icon name="chevronLeft" className="size-4" />
                VOD
              </Link>
              <a
                href={item.imdbUrl ?? `https://www.imdb.com/title/${item.imdbCode}/`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-[#f5c542] ring-1 ring-white/15"
              >
                IMDb {(item.imdbRating ?? 0).toFixed(1)}
              </a>
            </header>

            <div className="max-w-4xl pb-10">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/55">
                <span>{normalizeVodType(item.type)}</span>
                <Dot />
                <span>{item.year ?? "-"}</span>
                <Dot />
                <span>{item.runtimeMinutes ? `${item.runtimeMinutes}m` : `${item.links.length} files`}</span>
                <Dot />
                <span>{item.imdbCode}</span>
              </div>

              <h1 className="max-w-[13ch] text-5xl font-black leading-[0.92] tracking-tight sm:text-7xl lg:text-8xl">
                {item.title}
              </h1>

              {item.originalTitle && item.originalTitle !== item.title && (
                <p className="mt-4 text-lg font-semibold text-white/55">
                  Original title: {item.originalTitle}
                </p>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                {bestLink && (
                  <a
                    href={bestLink.url}
                    className="inline-flex h-12 items-center gap-2 rounded-full bg-[#f5c542] px-5 text-sm font-black text-black transition hover:bg-white"
                  >
                    <Icon name="download" className="size-5" />
                    Download Best
                  </a>
                )}
                <a
                  href={item.imdbUrl ?? `https://www.imdb.com/title/${item.imdbCode}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center rounded-full bg-white/10 px-5 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/[0.16]"
                >
                  View IMDb
                </a>
              </div>
            </div>
          </div>

          <aside className="self-end rounded-lg bg-white/[0.04] p-5 ring-1 ring-white/10 backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
              IMDb Data
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Stat label="Rating" value={(item.imdbRating ?? 0).toFixed(1)} />
              <Stat label="Votes" value={(item.imdbVotes ?? 0).toLocaleString()} />
              <Stat label="Runtime" value={item.runtimeMinutes ? `${item.runtimeMinutes}m` : "-"} />
              <Stat label="Files" value={item.links.length.toLocaleString()} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {(item.genres ?? []).map((genre) => (
                <span
                  key={genre}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/80"
                >
                  {genre}
                </span>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="space-y-3">
          <InfoRow label="Title type" value={item.type} />
          <InfoRow label="Start year" value={String(item.year ?? "-")} />
          {item.endYear && <InfoRow label="End year" value={String(item.endYear)} />}
          <InfoRow label="Qualities" value={item.qualities.join(", ") || "-"} />
          <InfoRow label="Versions" value={item.groups.join(", ") || "-"} />
        </aside>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight">DonyayeSerial Links</h2>
              <p className="mt-1 text-sm font-semibold text-white/45">
                Matched by IMDb ID: {item.imdbCode}
              </p>
            </div>
            <Icon name="download" className="size-6 text-[#f5c542]" />
          </div>

          <div className="space-y-5">
            {grouped.map(([group, links]) => (
              <div key={group} className="overflow-hidden rounded-lg ring-1 ring-white/10">
                <div className="flex items-center justify-between bg-white/[0.08] px-4 py-3">
                  <h3 className="font-black">{group}</h3>
                  <span className="text-xs font-black text-white/45">
                    {links.length} files
                  </span>
                </div>
                {links.map((link, index) => (
                  <FileLink key={`${link.url}-${index}`} link={link} />
                ))}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Dot() {
  return <span className="size-1 rounded-full bg-[#e5484d]" />;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/25 p-3 ring-1 ring-white/10">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-black text-white">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.04] p-4 ring-1 ring-white/10">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-white/80">{value}</p>
    </div>
  );
}

function FileLink({ link }: { link: VodLink }) {
  return (
    <a
      href={link.url}
      className="grid gap-2 border-t border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.07] sm:grid-cols-[1fr_auto] sm:items-center"
    >
      <span className="min-w-0">
        <span className="block truncate font-black text-white">{link.label}</span>
        <span className="mt-1 block text-xs font-semibold text-white/45">
          {link.release ?? "release"} / {link.size ?? "size unknown"}
        </span>
      </span>
      <span className="inline-flex items-center gap-2 text-sm font-black text-[#f5c542]">
        <Icon name="download" className="size-4" />
        {link.quality ?? "File"}
      </span>
    </a>
  );
}

function groupLinks(links: VodLink[]): [string, VodLink[]][] {
  const map = new Map<string, VodLink[]>();
  for (const link of links) {
    const group = link.group || "Files";
    map.set(group, [...(map.get(group) ?? []), link]);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}
