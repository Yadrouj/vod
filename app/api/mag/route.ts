import { addMagArticle, listAllMagArticles } from "@/lib/magStore.server";
import type { MagArticle } from "@/lib/mag";

const ADMIN_CODE = process.env.NEXT_PUBLIC_ADMIN_CODE || "ramagh1404";

function isAdmin(req: Request) {
  return req.headers.get("x-admin-code") === ADMIN_CODE;
}

export async function GET(req: Request) {
  const includeDrafts = isAdmin(req);
  const articles = await listAllMagArticles({ includeDrafts });
  return Response.json({ articles });
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const excerpt = String(body?.excerpt ?? "").trim();
  const category = String(body?.category ?? "اخبار") as MagArticle["category"];
  const rawBody = String(body?.body ?? "").trim();
  const image = String(body?.image ?? "").trim();
  const seoTitle = String(body?.seoTitle ?? "").trim();
  const seoDescription = String(body?.seoDescription ?? "").trim();
  const status = body?.status === "draft" ? "draft" : "published";
  const keywords = String(body?.keywords ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const tags = String(body?.tags ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!title || !excerpt || !rawBody) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }

  const article = await addMagArticle({
    title,
    excerpt,
    category,
    keywords,
    tags,
    status,
    image,
    seoTitle,
    seoDescription,
    body: rawBody
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
  });

  return Response.json({ article });
}
