const ROOT = "https://musics-fa.com";
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

// A small structural scan keeps nested recommendations and sidebars outside the
// selected article, even when the site's optional related-posts marker is absent.
export function extractPrimaryArticle(value = "") {
  const html = String(value).replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  const elements = [], stack = [];
  for (const match of html.matchAll(/<(\/?)([a-z][\w:-]*)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)) {
    const tag = match[2].toLowerCase();
    if (match[1]) {
      const index = stack.findLastIndex((element) => element.tag === tag);
      if (index >= 0) {
        for (const element of stack.splice(index)) element.end = match.index + match[0].length;
      }
      continue;
    }
    const element = { tag, start: match.index, end: html.length, opening: match[0], parent: stack.at(-1) };
    elements.push(element);
    if (!VOID_TAGS.has(tag) && !/\/\s*>$/.test(match[0])) stack.push(element);
    else element.end = match.index + match[0].length;
  }
  const secondary = (element) => element.tag === "aside" || element.tag === "nav"
    || /(?:^|[\s_-])(?:related(?:posts)?|sidebar|widgets?|comments?|recommended|recommendations?)(?:$|[\s_-])/i.test(`${attribute(element.opening, "class")} ${attribute(element.opening, "id")}`);
  const inSecondary = (element) => {
    for (let parent = element; parent; parent = parent.parent) if (secondary(parent)) return true;
    return false;
  };
  const articles = elements.filter((element) => element.tag === "article" && !inSecondary(element));
  const headingArticles = elements.filter((element) => element.tag === "h1" && !inSecondary(element)).map((heading) => {
    for (let parent = heading.parent; parent; parent = parent.parent) if (parent.tag === "article") return parent;
    return null;
  });
  const article = articles.find((candidate) => headingArticles.includes(candidate))
    ?? articles.find((candidate) => /(?:article|entry|post)[-_]content|\bpost[-_]\d+/i.test(`${attribute(candidate.opening, "class")} ${attribute(candidate.opening, "id")}`))
    ?? articles[0];
  if (!article) return "";
  const excluded = elements.filter((element) => element !== article && contains(article, element) && (secondary(element) || element.tag === "article"));
  let cursor = article.start, primary = "";
  for (const element of excluded) {
    if (element.start < cursor) continue;
    primary += html.slice(cursor, element.start);
    cursor = element.end;
  }
  return primary + html.slice(cursor, article.end);
}

export function extractPrimaryArtist(html, track = {}) {
  const candidates = [];
  for (const match of extractPrimaryArticle(html).matchAll(/<a\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/a\s*>/gi)) {
    const href = attribute(`<a${match[1]}>`, "href");
    if (!href) continue;
    const name = clean(match[2]).replace(/^آرشیو\s+آهنگ[\s\u200c]*های\s*/u, "");
    if (!name || /^(?:آهنگ جدید|موزیکفا|کردی|شاد)$/u.test(name)) continue;
    try {
      const url = new URL(decode(href), ROOT);
      const slug = decodeURIComponent(url.pathname.match(/^\/artists\/([^/]+)\/?$/i)?.[1] ?? "").toLowerCase();
      if (url.origin !== ROOT || !slug || candidates.some((artist) => artist.slug === slug)) continue;
      candidates.push({ name, slug, sourceUrl: url.toString() });
    } catch { /* An invalid archive URL is not evidence of an artist match. */ }
  }
  const expected = track.artist;
  const expectedName = comparable(expected?.name);
  const expectedSlugs = new Set([expected?.slug, expected?.name].map(canonicalSlug).filter(Boolean));
  const title = comparable(track.persianTitle || track.title);
  const preferred = candidates.find((artist) => expectedName && comparable(artist.name) === expectedName)
    ?? candidates.find((artist) => expectedSlugs.has(canonicalSlug(artist.slug)))
    ?? candidates.filter((artist) => {
      const name = comparable(artist.name);
      return /[\u0600-\u06ff]/u.test(name) && (title === name || title.startsWith(`${name} `));
    }).sort((left, right) => comparable(right.name).length - comparable(left.name).length)[0]
    ?? expected;
  return preferred ? [preferred] : [];
}

export function extractPrimaryMedia(html) {
  const media = [];
  for (const match of extractPrimaryArticle(html).matchAll(/<[a-z][\w:-]*\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)) {
    for (const field of ["data-song", "href"]) {
      const value = decode(attribute(match[0], field));
      if (!value) continue;
      try {
        const parsed = new URL(value);
        if (!/^https?:$/.test(parsed.protocol) || !/^(?:dls\.)?musics-fa\.com$/i.test(parsed.hostname) || !/\.(?:mp3|m4a|aac|flac|mp4)$/i.test(parsed.pathname)) continue;
        const url = parsed.toString();
        if (media.some((item) => item.url === url)) continue;
        const stream = field === "data-song";
        const qualityText = `${match[0]} ${decode(url)}`;
        const parts = parsed.pathname.split("/").filter(Boolean);
        media.push({ url, label: stream ? "Online stream" : "Direct download", quality: /320/.test(qualityText) ? "320kbps" : /128/.test(qualityText) ? "128kbps" : null, kind: stream ? "stream" : "download", provider: "musics-fa", basePath: `${parsed.origin}/${parts.slice(0, Math.min(parts.length - 1, 4)).join("/")}/` });
      } catch { /* Ignore malformed/non-URL attributes without leaving the article. */ }
    }
  }
  const direct = media.find((item) => item.kind === "download");
  if (direct && !media.some((item) => item.kind === "stream")) media.unshift({ ...direct, label: "Online stream", kind: "stream" });
  return media;
}

export function isExcludedListingArticle(html) {
  return /\bDownload\s+(?:New|Old)\s+(?:Nohe|Madahi|Maddahi)\b/i.test(clean(extractPrimaryArticle(html)));
}

function contains(parent, child) { return child.start >= parent.start && child.end <= parent.end; }
function attribute(tag, name) {
  for (const match of tag.matchAll(/\s+([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
    if (match[1].toLowerCase() === name) return match[2] ?? match[3] ?? match[4];
  }
  return "";
}
function decode(value = "") {
  return String(value).replace(/&#(x[\da-f]+|\d+);/gi, (entity, code) => {
    const point = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code);
    return point <= 0x10ffff ? String.fromCodePoint(point) : entity;
  }).replace(/&amp;/gi, "&").replace(/&nbsp;/gi, " ").replace(/&quot;/gi, '"').replace(/&apos;/gi, "'");
}
function clean(value = "") { return decode(String(value).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(); }
function comparable(value = "") { return clean(value ?? "").normalize("NFKC").toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[^\p{L}\p{N}]+/gu, " ").trim(); }
function canonicalSlug(value) { try { return comparable(decodeURIComponent(value ?? "")).replace(/\s+/g, "-"); } catch { return ""; } }
