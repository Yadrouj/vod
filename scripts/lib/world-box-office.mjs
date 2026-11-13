const text = value => value.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const dollars = value => /^\$[\d,]+$/.test(value) ? Number(value.replace(/[$,]/g, '')) : null;
export function parseWorldBoxOffice(html, year, observedAt = new Date().toISOString()) {
  if (!html.includes(`${year} Worldwide Box Office`)) throw new Error('Unexpected box-office report year');
  const films = [];
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match => match[1]);
    if (cells.length !== 7) continue;
    const rank = Number(text(cells[0]));
    const href = cells[1].match(/href="(\/releasegroup\/[^"?#]+)[^"]*"/)?.[1];
    const worldwideUsd = dollars(text(cells[2]));
    if (!Number.isInteger(rank) || rank < 1 || !href || worldwideUsd === null) continue;
    films.push({ rank, title: text(cells[1]), worldwideUsd, domesticUsd: dollars(text(cells[3])), internationalUsd: dollars(text(cells[5])), sourceUrl: new URL(href, 'https://www.boxofficemojo.com').href });
  }
  if (films.length < 5 || films[0].rank !== 1 || films.some((film, index) => film.rank !== index + 1 || index > 0 && film.worldwideUsd > films[index - 1].worldwideUsd)) throw new Error('Incomplete or invalid worldwide chart');
  return { version: 1, year, observedAt, sourceUrl: `https://www.boxofficemojo.com/year/world/${year}/`, currency: 'USD', metric: 'year-release-groups-worldwide-cumulative', films: films.slice(0, 30) };
}
