import { authenticateMcp, mcpBearer } from '@/lib/mcp/store';
import { getCryptoInvoice } from '@/lib/mcp/payments';
import { mcpHttpError, sameOrigin, privateHeaders } from '@/lib/mcp/http';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { sameOrigin(request); const account = await authenticateMcp(mcpBearer(request)); return Response.json(await getCryptoInvoice(account.id, (await params).id), { headers: privateHeaders }); }
  catch (error) { return mcpHttpError(error); }
}
