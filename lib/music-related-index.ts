import type { MusicTrack } from './music-types';

type Document = { track: MusicTrack; order: number; artists: string[]; terms: string[]; base: number };
type Groups = Map<number, Document[]>;
const text = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Exact recommendation scores, without scanning/normalizing the archive per page.
 * Catalog snapshots are immutable; callers replace this index when data changes. */
export class MusicRelatedIndex {
  private artists = new Map<string, Document[]>();
  private terms = new Map<string, Document[]>();
  private kinds = new Map<string, Groups>();
  private categories = new Map<string, Map<string, Groups>>();

  constructor(tracks: MusicTrack[]) {
    const documents = tracks.map((track, order): Document => ({
      track, order,
      artists: track.artists.flatMap(artist => [artist.slug, ...(artist.aliases ?? [])]),
      terms: text(track.title).split(' '),
      base: (track.coverUrl ? 8 : 0) + (track.sources.some(source => source.kind === 'stream') ? 4 : 0),
    }));
    // Original order is the final tie-break, just like the old stable sort.
    documents.sort((a, b) => (b.track.publishedAt ?? '').localeCompare(a.track.publishedAt ?? '') || a.order - b.order);
    for (const document of documents) {
      for (const artist of new Set(document.artists)) this.append(this.artists, artist, document);
      for (const term of new Set(document.terms)) this.append(this.terms, term, document);
      const kind = document.track.kind;
      const kinds = this.kinds.get(kind) ?? new Map<number, Document[]>();
      this.append(kinds, document.base, document);
      this.kinds.set(kind, kinds);
      const categories = this.categories.get(kind) ?? new Map<string, Groups>();
      const group = categories.get(document.track.category) ?? new Map<number, Document[]>();
      this.append(group, document.base, document);
      categories.set(document.track.category, group);
      this.categories.set(kind, categories);
    }
  }

  related(track: MusicTrack, limit: number): MusicTrack[] {
    if (!Number.isFinite(limit) || limit <= 0) return [];
    limit = Math.floor(limit);
    const artists = new Set(track.artists.flatMap(artist => [artist.slug, ...(artist.aliases ?? [])]));
    const terms = new Set(text(track.title).split(' ').filter(term => term.length > 3));
    const candidates = new Set<Document>();
    const add = (documents: Document[] | undefined, bounded = false) => {
      let accepted = 0;
      for (const document of documents ?? []) {
        if (document.track.id === track.id || document.track.kind !== track.kind) continue;
        candidates.add(document);
        if (bounded && ++accepted >= limit) break;
      }
    };
    // Every artist/title-boosted candidate must be considered. All others have
    // a constant score within each category + cover/stream group, so its first
    // `limit` entries dominate every omitted entry (including date tie-breaks).
    for (const artist of artists) add(this.artists.get(artist));
    for (const term of terms) add(this.terms.get(term));
    for (const group of this.kinds.get(track.kind)?.values() ?? []) add(group, true);
    for (const group of this.categories.get(track.kind)?.get(track.category)?.values() ?? []) add(group, true);
    return [...candidates].map(document => ({ document, score: document.base
      + (document.artists.some(artist => artists.has(artist)) ? 1000 : 0)
      + (document.track.category === track.category ? 180 : 0)
      + document.terms.filter(term => terms.has(term)).length * 24,
    })).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score
        || (b.document.track.publishedAt ?? '').localeCompare(a.document.track.publishedAt ?? '')
        || a.document.order - b.document.order)
      .slice(0, limit).map(item => item.document.track);
  }

  private append<K>(map: Map<K, Document[]>, key: K, document: Document) {
    const values = map.get(key);
    if (values) values.push(document);
    else map.set(key, [document]);
  }
}
