import type { MetadataRoute } from "next";
import { listAllMagArticles } from "@/lib/magStore.server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ramagh.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const articles = await listAllMagArticles();
  const staticRoutes = [
    "",
    "/library",
    "/gyms",
    "/stores",
    "/market",
    "/coach",
    "/upgrade",
    "/mag",
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${SITE_URL}${route}`,
      lastModified: now,
      changeFrequency: route === "/mag" ? "daily" as const : "weekly" as const,
      priority: route === "" ? 1 : route === "/mag" ? 0.9 : 0.75,
    })),
    ...articles.map((article) => ({
      url: `${SITE_URL}/mag/${article.slug}`,
      lastModified: article.updatedAt ? new Date(article.updatedAt) : new Date(article.publishedAt),
      changeFrequency: article.contentType === "NewsArticle" ? "daily" as const : "weekly" as const,
      priority: article.contentType === "NewsArticle" ? 0.78 : 0.68,
      images: article.image ? [absoluteUrl(article.image)] : undefined,
      videos: article.videos?.slice(0, 6).map((video) => ({
        title: video.title,
        thumbnail_loc: absoluteUrl(video.thumbnail ?? article.image),
        description: video.explanation,
        content_loc: absoluteUrl(video.videoUrl),
      })),
    })),
  ];
}

function absoluteUrl(url: string | undefined) {
  if (!url) return SITE_URL;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}
