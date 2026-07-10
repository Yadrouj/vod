import { listAllMagArticles } from "@/lib/magStore.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const articles = (await listAllMagArticles()).slice(0, 5).map((article) => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    category: article.category,
    publishedAt: article.publishedAt,
    image: article.image,
    imageAlt: article.imageAlt,
  }));

  return Response.json({ articles });
}
