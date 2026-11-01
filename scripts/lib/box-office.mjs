const text = value => String(value).replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ").trim();
const number = value => Number(text(value).replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632)).replace(/[,٬\s]/g, ""));

/** Only explicitly labelled weekly TOMAN tables qualify; never infer rial conversion. */
export function parseBoxOfficeTable(html, { url, publishedAt, title }) {
  const at = Date.parse(publishedAt);
  if (!Number.isFinite(at) || !/^https:\/\//.test(url)) return null;
  for (const match of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    const table = match[1];
    if (!/فروش\s+هفتگی[\s\S]{0,100}تومان/u.test(text(table))) continue;
    const rows = [];
    for (const row of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => text(cell[1]));
      if (cells.length !== 5) continue;
      const [rank, film, director, sales, audience] = cells;
      const value = { rank: number(rank), title: film, director, salesToman: number(sales), audience: number(audience) };
      if (!Number.isSafeInteger(value.rank) || value.rank < 1 || value.rank > 100 || !film || !Number.isSafeInteger(value.salesToman) || value.salesToman < 0 || !Number.isSafeInteger(value.audience) || value.audience < 0) continue;
      rows.push(value);
    }
    if (rows.length >= 3 && new Set(rows.map(row => row.rank)).size === rows.length) return {
      reportedAt: new Date(at).toISOString(), periodLabel: title, metric: "weekly-sales", unit: "تومان",
      sourceUrl: url, sourceName: "فلاتو · به نقل از گزارش گیشه", rows: rows.sort((a, b) => a.rank - b.rank).slice(0, 5),
    };
  }
  return null;
}
