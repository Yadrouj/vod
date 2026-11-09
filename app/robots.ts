import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/publisher-poster/"],
        disallow: ["/api/", "/admin/", "/watch-together/"],
      },
    ],
    // Do not block /_next/: Google needs the page's public CSS and scripts to
    // render the page accurately. The dynamic index discovers new parts without
    // requiring a rebuild of this lightweight robots metadata route.
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/mag/sitemap.xml`],
    host: SITE_URL,
  };
}
