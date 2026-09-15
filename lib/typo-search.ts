/** Local catalog spelling suggestions; no remote service or query logging. */
export function searchText(value: string) {
  return value.slice(0, 500).normalize("NFKD").toLowerCase()
    .replace(/\p{M}/gu, "").replace(/ي|ى/g, "ی").replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
    .replace(/['’]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Bounded edit distance, including an adjacent letter swap (huose → house). */
export function spellingDistance(a: string, b: string, limit = 2) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let beforePrevious = previous;
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let minimum = i;
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + Number(a[i - 1] !== b[j - 1]));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], beforePrevious[j - 2] + 1);
      minimum = Math.min(minimum, row[j]);
    }
    if (minimum > limit) return limit + 1;
    beforePrevious = previous; previous = row;
  }
  return previous[b.length];
}

export type SearchMatches<T> = { items: T[]; corrections: string[]; matchedQuery: string; mode: "exact" | "similar" | "none" };
type Document<T> = { item: T; text: string; names: string[] };

export class TypoSearchIndex<T> {
  private readonly documents: Document<T>[];
  private readonly words = new Map<number, Map<string, number>>();
  private readonly names = new Map<string, string>();
  private readonly wordNames = new Map<string, Set<string>>();
  private readonly compact = new Map<string, Set<string>>();
  private readonly cache = new Map<string, SearchMatches<T>>();

  constructor(documents: Document<T>[]) {
    this.documents = documents.map(document => {
      const names = document.names.filter(Boolean).map(name => {
        const key = searchText(name);
        if (key) this.names.set(key, this.names.get(key) ?? name.trim());
        for (const word of new Set(key.split(" "))) {
          const entries = this.wordNames.get(word) ?? new Set<string>();
          entries.add(key);
          this.wordNames.set(word, entries);
        }
        if (key.includes(" ") && key.length <= 80) {
          const compact = key.replace(/ /g, "");
          const entries = this.compact.get(compact) ?? new Set<string>();
          if (entries.size < 8) entries.add(key);
          this.compact.set(compact, entries);
        }
        return key;
      });
      for (const word of new Set(names.flatMap(name => name.split(" ")))) {
        if (word.length < 3 || word.length > 32 || !/^\p{L}+$/u.test(word)) continue;
        const bucket = this.words.get(word.length) ?? new Map<string, number>();
        bucket.set(word, (bucket.get(word) ?? 0) + 1);
        this.words.set(word.length, bucket);
      }
      // The caller can include searchable metadata, but only catalog names can
      // become spelling corrections (never unrelated countries or genres).
      return { item: document.item, text: searchText(document.text), names };
    });
  }

  search(query: string): SearchMatches<T> {
    const key = searchText(query.slice(0, 160));
    if (!key && query.trim()) return { items: [], corrections: [], matchedQuery: key, mode: "none" };
    const cached = this.cache.get(key);
    if (cached) { this.cache.delete(key); this.cache.set(key, cached); return cached; }
    const result = this.resolve(key);
    this.cache.set(key, result);
    if (this.cache.size > 64) this.cache.delete(this.cache.keys().next().value!);
    return result;
  }

  private resolve(key: string): SearchMatches<T> {
    const exact = this.documents.filter(document => document.text.includes(key)).map(document => document.item);
    if (exact.length) return { items: exact, corrections: [], matchedQuery: key, mode: "exact" };
    const empty: SearchMatches<T> = { items: [], corrections: [], matchedQuery: key, mode: "none" };
    const tokens = key.split(" ");
    // Short fragments, IDs, numbers and huge inputs must not produce guesses.
    if (key.length < 3 || key.length > 80 || tokens.length > 8 || /^tt\d/i.test(key) || !/\p{L}/u.test(key)) return empty;

    // Multiword corrections are evaluated against real contiguous title
    // phrases. A frequent standalone word must never prune the correct phrase
    // or allow us to silently drop a misspelled first word.
    if (tokens.length > 1) return this.resolvePhrase(tokens, empty);

    let beam = [{ text: "", cost: 0, frequency: 0 }];
    for (const token of tokens) {
      const options = [{ text: token, cost: 0, frequency: this.words.get(token.length)?.get(token) ?? 0 }];
      if (token.length >= 3 && token.length <= 32 && /^\p{L}+$/u.test(token)) {
        const limit = token.length >= 6 ? 2 : 1;
        for (let length = token.length - limit; length <= token.length + limit; length++) {
          for (const [word, frequency] of this.words.get(length) ?? []) {
            if (word === token) continue;
            const distance = spellingDistance(token, word, limit);
            if (distance <= limit) options.push({ text: word, cost: distance, frequency });
          }
        }
      }
      options.sort((a, b) => a.cost - b.cost || b.frequency - a.frequency || a.text.localeCompare(b.text));
      beam = beam.flatMap(prefix => options.slice(0, 8).map(option => ({
        text: `${prefix.text} ${option.text}`.trim(), cost: prefix.cost + option.cost, frequency: prefix.frequency + option.frequency,
      }))).sort((a, b) => a.cost - b.cost || b.frequency - a.frequency).slice(0, 24);
    }
    for (const text of this.compact.get(key.replace(/ /g, "")) ?? []) {
      if (text !== key) beam.push({ text, cost: .25, frequency: 0 });
    }
    const candidates = [...new Map(beam.filter(candidate => candidate.text !== key).map(candidate => [candidate.text, candidate])).values()]
      .map(candidate => ({ ...candidate, hits: this.documents.filter(document => document.names.some(name => name.includes(candidate.text))) }))
      .filter(candidate => candidate.hits.length)
      .sort((a, b) => a.cost - b.cost || b.hits.length - a.hits.length || a.text.localeCompare(b.text))
      .slice(0, 5);
    const best = candidates[0];
    if (!best) return empty;
    return {
      items: best.hits.map(document => document.item),
      corrections: candidates.map(candidate => this.names.get(candidate.text) ?? candidate.text),
      matchedQuery: this.names.get(best.text) ?? best.text,
      mode: "similar",
    };
  }

  private resolvePhrase(tokens: string[], empty: SearchMatches<T>): SearchMatches<T> {
    const anchor = tokens.filter(token => token.length >= 3 && /^\p{L}+$/u.test(token)).sort((a, b) => b.length - a.length)[0];
    if (!anchor) return empty;
    const names = new Set<string>();
    const anchorLimit = anchor.length >= 6 ? 2 : 1;
    for (let length = anchor.length - anchorLimit; length <= anchor.length + anchorLimit; length++) {
      for (const word of this.words.get(length)?.keys() ?? []) {
        if (spellingDistance(anchor, word, anchorLimit) <= anchorLimit) {
          for (const name of this.wordNames.get(word) ?? []) names.add(name);
        }
      }
    }
    const phrases = new Map<string, number>();
    for (const name of names) {
      const words = name.split(" ");
      for (let start = 0; start <= words.length - tokens.length; start++) {
        let cost = 0;
        for (let index = 0; index < tokens.length; index++) {
          const token = tokens[index], word = words[start + index];
          if (token === word) continue;
          if (index === tokens.length - 1 && token.length >= 2 && word.startsWith(token)) { cost += .25; continue; }
          const limit = token.length >= 6 ? 2 : token.length >= 3 ? 1 : 0;
          const distance = /^\p{L}+$/u.test(token) ? spellingDistance(token, word, limit) : limit + 1;
          if (distance > limit) { cost = Infinity; break; }
          cost += distance;
        }
        if (!Number.isFinite(cost)) continue;
        const phrase = words.slice(start, start + tokens.length).join(" ");
        phrases.set(phrase, Math.min(phrases.get(phrase) ?? Infinity, cost));
      }
    }
    for (const name of this.compact.get(tokens.join("")) ?? []) phrases.set(name, .25);
    const candidates = [...phrases].map(([phrase, cost]) => ({ phrase, cost,
      hits: this.documents.filter(document => document.names.some(name => name.includes(phrase))),
    })).filter(candidate => candidate.hits.length).sort((a, b) => a.cost - b.cost || b.hits.length - a.hits.length || a.phrase.localeCompare(b.phrase)).slice(0, 5);
    const best = candidates[0];
    if (!best) return empty;
    return { items: best.hits.map(hit => hit.item), corrections: candidates.map(candidate => this.names.get(candidate.phrase) ?? candidate.phrase),
      matchedQuery: this.names.get(best.phrase) ?? best.phrase, mode: "similar" };
  }
}
