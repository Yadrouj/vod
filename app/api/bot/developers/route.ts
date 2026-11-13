import { botAuthRequiredError } from '@/lib/bot-auth';
import { issueMcpKey } from '@/lib/mcp/store';
import { boundedJson, mcpHttpError, privateHeaders } from '@/lib/mcp/http';
export async function POST(request: Request) {
  const auth = botAuthRequiredError(request); if (auth) return auth;
  try {
    const body = await boundedJson(request, 1024);
    if (!/^[1-9]\d{0,19}$/.test(String(body.telegramId || ''))) return Response.json({ error: 'Invalid Telegram identity' }, { status: 400, headers: privateHeaders });
    return Response.json(await issueMcpKey(`telegram:${body.telegramId}`, body.rotate === true), { headers: privateHeaders });
  } catch (error) { return mcpHttpError(error); }
}
