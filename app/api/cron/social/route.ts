import { runSocialCron } from "@/lib/socialMock.server";

export const runtime = "nodejs";
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
  const force = url.searchParams.get("force") === "1";
  const seed = url.searchParams.get("seed") === "1";
  const result = await runSocialCron({ force, seed });
  return Response.json(result);
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
