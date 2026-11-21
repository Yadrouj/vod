import { loadDownloadSettings, saveDownloadBaseUrl } from "@/lib/download-settings";
import { isAdminRequest, PRIVATE_HEADERS } from '@/lib/admin-auth';

export async function GET(request:Request) {
  if(!isAdminRequest(request))return Response.json({error:'unauthorized'},{status:401,headers:PRIVATE_HEADERS});
  return Response.json(await loadDownloadSettings(),{headers:PRIVATE_HEADERS});
}

export async function POST(request: Request) {
  if(!isAdminRequest(request))return Response.json({error:'unauthorized'},{status:401,headers:PRIVATE_HEADERS});
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
