import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { DEFAULT_ARCHIVE_URL, saveDownloadBaseUrl } from "@/lib/download-settings";

export const dynamic = "force-dynamic";
const execFileAsync = promisify(execFile);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { archiveUrl?: string; baseUrl?: string };
    const archiveUrl = body.archiveUrl?.trim() || DEFAULT_ARCHIVE_URL;
    const baseUrl = body.baseUrl?.trim() || "https://dls3.aparatchi-dlcenter.top/DonyayeSerial/";
    await saveDownloadBaseUrl(baseUrl, archiveUrl);
    const script = path.join(process.cwd(), "scripts", "rip-vod-html.mjs");
    const output = path.join(process.cwd(), "public", "data", "vod-catalog.json");
    const { stdout } = await execFileAsync(process.execPath, [script, archiveUrl, output], {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024,
      timeout: 180_000,
    });
    return Response.json({ message: `Archive synced. ${stdout.trim().split("\n").at(-1) ?? "Catalog updated."}` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Archive sync failed." }, { status: 500 });
  }
}
