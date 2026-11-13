import { authenticateMcp, mcpBearer, publicAccount } from '@/lib/mcp/store';
import { mcpHttpError, sameOrigin, privateHeaders } from '@/lib/mcp/http';
export async function GET(request: Request) {
  try { sameOrigin(request); return Response.json(publicAccount(await authenticateMcp(mcpBearer(request))), { headers: privateHeaders }); }
  catch (error) { return mcpHttpError(error); }
}
