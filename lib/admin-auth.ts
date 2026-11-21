import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'sarvnema_admin';
export const ADMIN_TTL = 8 * 3600;
export const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', Vary: 'Cookie' };
export const adminSecret = () => process.env.SARVNEMA_ADMIN_TOKEN?.trim() || '';
export const adminConfigured = () => adminSecret().length >= 16;
export function equalSecret(a: string, b: string) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}
export function sameAdminOrigin(request: Request) {
  try { const origin = new URL(request.headers.get('origin') || ''), host=request.headers.get('host') || new URL(request.url).host; return origin.host === host && ['http:', 'https:'].includes(origin.protocol); } catch { return false; }
}
export function createAdminSession(now = Date.now()) {
  if (!adminConfigured()) throw new Error('Configure SARVNEMA_ADMIN_TOKEN with at least 16 characters');
  const payload = `${Math.floor(now / 1000)}.${randomBytes(24).toString('hex')}`;
  return `${payload}.${createHmac('sha256', adminSecret()).update(payload).digest('hex')}`;
}
export function validAdminSession(value?: string, now = Date.now()) {
  if (!adminConfigured() || !value || !/^\d{10}\.[a-f0-9]{48}\.[a-f0-9]{64}$/.test(value)) return false;
  const [at, nonce, signature] = value.split('.'), age = Math.floor(now / 1000) - Number(at);
  return age >= 0 && age < ADMIN_TTL && equalSecret(signature, createHmac('sha256', adminSecret()).update(`${at}.${nonce}`).digest('hex'));
}
export function isAdminRequest(request: Request) {
  if (!adminConfigured()) return false;
  const token = request.headers.get('x-admin-token');
  if (token && equalSecret(token, adminSecret())) return true;
  const session = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${ADMIN_COOKIE}=`))?.slice(ADMIN_COOKIE.length + 1);
  return validAdminSession(session) && (['GET','HEAD'].includes(request.method) || sameAdminOrigin(request));
}
export async function smallJson(request: Request, limit = 8192): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > limit) throw new Error('body_too_large');
  const reader = request.body?.getReader(); if (!reader) throw new Error('body_required');
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const {done,value} = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) throw new Error('body_too_large'); chunks.push(value); } }
  catch (error) { await reader.cancel(); throw error; } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
