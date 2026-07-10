import { dailySeoArticlesForDate, dailySeoMagArticles } from "@/lib/dailyMag.server";
import { upsertMagArticles } from "@/lib/magStore.server";

export const dynamic = "force-dynamic";

const DEFAULT_SECRET = "ramagh1404";

function cronSecret() {
  return process.env.CRON_SECRET || process.env.NEXT_PUBLIC_ADMIN_CODE || DEFAULT_SECRET;
}

function isAuthorized(req: Request) {
  const url = new URL(req.url);
  const provided = url.searchParams.get("secret") || req.headers.get("x-cron-secret");
  return Boolean(provided && provided === cronSecret());
}

async function handle(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const backfill = Math.min(Math.max(Number(url.searchParams.get("backfill") ?? 0), 0), 60);
  const date = url.searchParams.get("date") || undefined;
  const articles = backfill > 0
    ? await dailySeoMagArticles({ daysBack: backfill })
    : await dailySeoArticlesForDate(date);
  const result = await upsertMagArticles(articles);

  return Response.json({
    ok: true,
    mode: backfill > 0 ? "backfill" : "daily",
    articles: articles.map((article) => ({
      slug: article.slug,
      title: article.title,
      publishedAt: article.publishedAt,
      category: article.category,
    })),
    ...result,
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
