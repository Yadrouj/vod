// Only public IMDb popularity charts, not the all-time Top 250 or user ratings.
export const CHART_URLS = {
  movie: 'https://www.imdb.com/chart/moviemeter/',
  series: 'https://www.imdb.com/chart/tvmeter/',
};
export function parseImdbChart(html, kind) {
  if (!CHART_URLS[kind] || !/most\s+popular|chartTitles/i.test(html)) throw new Error('Not an IMDb popularity chart');
  const candidates = [];
  const add = (node, position) => {
    const imdbCode = String(node.id ?? node.url ?? node['@id'] ?? '').match(/tt\d{5,12}/)?.[0];
    const rank = Number(node.chartMeterRanking?.currentRank ?? node.meterRanking?.currentRank ?? position);
    const title = node.titleText?.text ?? node.name;
    const year = Number(node.releaseYear?.year ?? String(node.datePublished ?? '').slice(0, 4)) || null;
    if (!imdbCode || typeof title !== 'string' || !Number.isInteger(rank) || rank < 1 || rank > 100) return;
    candidates.push({ imdbCode, title, year, rank, kind });
  };
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    if (value['@type'] === 'ItemList' && Array.isArray(value.itemListElement)) {
      for (const entry of value.itemListElement) add(entry.item ?? entry, entry.position);
      return;
    }
    if (value.chartTitles?.edges) {
      value.chartTitles.edges.forEach((edge, i) => add(edge.node ?? {}, edge.currentRank ?? i + 1));
      return;
    }
    for (const child of Object.values(value)) if (child && typeof child === 'object') visit(child);
  };
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/application\/ld\+json|__NEXT_DATA__/.test(match[1])) continue;
    try { visit(JSON.parse(match[2])); } catch { /* Ignore unrelated invalid scripts. */ }
  }
  const byId = new Map();
  for (const entry of candidates) if (!byId.has(entry.imdbCode)) byId.set(entry.imdbCode, entry);
  const entries = [...byId.values()].sort((a, b) => a.rank - b.rank);
  if (entries.length < 5 || new Set(entries.map((entry) => entry.rank)).size !== entries.length) throw new Error('Incomplete or conflicting IMDb chart');
  return entries;
}

export async function fetchImdbChart(kind, fetcher = fetch) {
  const response = await fetcher(CHART_URLS[kind], {
    headers: { 'User-Agent': 'SarvNema/1.0 (public chart metadata)', Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(12_000),
  });
  // IMDb can return 202 with an empty challenge body. It is NOT a new chart.
  if (response.status !== 200 || !/text\/html/i.test(response.headers.get('content-type') ?? '')) {
    await response.body?.cancel();
    throw new Error(`IMDb ${kind}: HTTP ${response.status}; previous chart retained`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty IMDb response');
  const chunks = []; let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 4_000_000) { await reader.cancel(); throw new Error('IMDb chart exceeds response budget'); }
    chunks.push(value);
  }
  return parseImdbChart(Buffer.concat(chunks).toString('utf8'), kind);
}

export function matchChartToCatalog(entries, cards) {
  const normalize = (value) => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  return entries.map((entry) => {
    let card = entry.imdbCode ? cards.find((item) => item.imdbCode === entry.imdbCode && item.type === entry.kind) : null;
    if (!card) {
      const matches = cards.filter((item) => item.type === entry.kind && item.year === entry.year && normalize(item.title) === normalize(entry.title));
      const imdbMatches = matches.filter((item) => /^tt\d+$/.test(item.imdbCode));
      if (imdbMatches.length === 1) card = imdbMatches[0];
      else if (matches.length === 1) card = matches[0];
    }
    // No phantom detail routes, no trailer-as-full-movie imports here.
    return card && (card.posterUrl || card.backdropUrl) ? { rank: entry.rank, card } : null;
  }).filter(Boolean);
}
