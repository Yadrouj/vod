import { loadDownloadSettings, saveDownloadBaseUrl } from "@/lib/download-settings";

export async function GET() {
  return Response.json(await loadDownloadSettings());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { baseUrl?: string; archiveUrl?: string };
    const settings = await saveDownloadBaseUrl(body.baseUrl ?? "", body.archiveUrl);
    return Response.json(settings);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not update base URL." },
      { status: 400 }
    );
  }
}
