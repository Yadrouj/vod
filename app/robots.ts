import type { MetadataRoute } from "next";
import { sitemapPartCount } from "@/app/sitemap";
import { SITE_URL } from "@/lib/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const partCount = await sitemapPartCount();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/watch-together/"],
      },
    ],
    // Do not block /_next/: Google needs the page's public CSS and scripts to
    // render the page accurately. Each part is declared for large catalogs.
    sitemap: Array.from({ length: partCount }, (_, index) => `${SITE_URL}/sitemap/${index}.xml`),
    host: SITE_URL,
  };
}
