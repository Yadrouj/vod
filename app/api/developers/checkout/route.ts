import { authenticateMcp, mcpBearer, McpAccessError } from '@/lib/mcp/store';
import { boundedJson, mcpHttpError, sameOrigin, privateHeaders } from '@/lib/mcp/http';
import { createCryptoInvoice } from '@/lib/mcp/payments';
export async function POST(request: Request) {
  try {
    sameOrigin(request); const account = await authenticateMcp(mcpBearer(request)); const body = await boundedJson(request, 1024);
    if (!['starter', 'pro'].includes(body.plan)) throw new McpAccessError('Invalid plan', 400);
    return Response.json(await createCryptoInvoice(account.id, body.plan), { headers: privateHeaders });
  } catch (error) { return mcpHttpError(error); }
}
