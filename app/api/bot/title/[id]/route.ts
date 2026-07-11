import { botAuthError } from "@/lib/bot-auth";
import { botOrigin, getBotTitleDetail } from "@/lib/bot-catalog";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: Props) {
  const authError = botAuthError(request);
  if (authError) return authError;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const season = Number(searchParams.get("season") ?? 0) || null;
  const includeDownloads =
    searchParams.get("includeDownloads") === "1" ||
    searchParams.get("downloads") === "1" ||
    Boolean(season);
  const maxFiles = Number(searchParams.get("maxFiles") ?? 12);
  const detail = await getBotTitleDetail(id, { season, includeDownloads, maxFiles }, botOrigin(request));

  if (!detail) return Response.json({ error: "Title not found" }, { status: 404 });
  return Response.json(detail);
}
