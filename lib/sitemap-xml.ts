import type { MetadataRoute } from "next";

export const escapeXml = (value: string) => value.replace(/[<>&"']/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);

export function sitemapXml(entries: MetadataRoute.Sitemap) {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${entries.map(item => {
    const modified = item.lastModified instanceof Date ? item.lastModified.toISOString() : item.lastModified;
    return `<url><loc>${escapeXml(item.url)}</loc>${modified ? `<lastmod>${escapeXml(modified)}</lastmod>` : ""}${item.changeFrequency ? `<changefreq>${item.changeFrequency}</changefreq>` : ""}${item.priority != null ? `<priority>${item.priority}</priority>` : ""}${(item.images || []).map(image => `<image:image><image:loc>${escapeXml(image)}</image:loc></image:image>`).join("")}</url>`;
  }).join("")}</urlset>`;
}
