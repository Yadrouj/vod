import { McpAccessError } from './store';
import { MCP_SITE } from './plans';
export const privateHeaders = { 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' };
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = process.env.NODE_ENV === 'production' ? MCP_SITE : new URL(request.url).origin;
  if (origin && origin !== expected) throw new McpAccessError('Origin is not allowed', 403);
}
export async function boundedJson(request: Request, limit = 32768) {
  if (Number(request.headers.get('content-length') || 0) > limit) throw new McpAccessError('Request is too large', 413);
  const reader = request.body?.getReader(); if (!reader) throw new McpAccessError('Missing body', 400);
  const chunks = []; let size = 0;
  try { for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > limit) throw new McpAccessError('Request is too large', 413); chunks.push(Buffer.from(part.value)); } }
  finally { await reader.cancel(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new McpAccessError('Invalid JSON', 400); }
}
export function mcpHttpError(error: unknown) {
  const known = error instanceof McpAccessError;
  return Response.json({ error: known ? error.message : 'Service temporarily unavailable' }, { status: known ? error.status : 503, headers: { ...privateHeaders, ...(known && error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}), ...(known && error.status === 401 ? { 'WWW-Authenticate': 'Bearer realm="SarvNema MCP"' } : {}) } });
}
