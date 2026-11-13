import { createHash, randomBytes } from 'node:crypto';
import { readFile, mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import lockfile from 'proper-lockfile';
import { MCP_PLANS, effectivePlan, type McpPlan, type McpGrant } from './plans';

type Account = { id: string; keyHash: string; prefix: string; createdAt: string; plan: McpPlan; paidUntil?: number; grants?: McpGrant[]; usage: { month: string; used: number; minute: number; calls: number }; events: string[] };
export class McpAccessError extends Error { constructor(message: string, public status = 401, public retryAfter = 0) { super(message); } }
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const root = () => path.resolve(process.env.MCP_DATA_DIR || 'data/mcp');
const accountPath = (id: string) => { if (!/^[a-f0-9]{64}$/.test(id)) throw new McpAccessError('Invalid account'); return path.join(root(), 'accounts', `${id}.json`); };
async function read<T>(file: string): Promise<T | null> { try { return JSON.parse(await readFile(file, 'utf8')); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; } }
async function write(file: string, value: unknown) { await mkdir(path.dirname(file), { recursive: true, mode: 0o700 }); const tmp = `${file}.${randomBytes(8).toString('hex')}.tmp`; await writeFile(tmp, JSON.stringify(value), { mode: 0o600 }); await rename(tmp, file); }
async function locked<T>(id: string, action: (account: Account | null) => Promise<T>) {
  const file = accountPath(id); await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const release = await lockfile.lock(file, { realpath: false, stale: 30000, retries: { retries: 15, minTimeout: 20, maxTimeout: 100 } });
  try { return await action(await read<Account>(file)); } finally { await release(); }
}
function freshUsage(now: number) { return { month: new Date(now).toISOString().slice(0, 7), used: 0, minute: Math.floor(now / 60000), calls: 0 }; }
function normalizeUsage(account: Account, now: number) {
  const current = freshUsage(now);
  if (account.usage.month !== current.month) account.usage = current;
  else if (account.usage.minute !== current.minute) { account.usage.minute = current.minute; account.usage.calls = 0; }
}
export function publicAccount(account: Account, now = Date.now()) {
  const plan = effectivePlan(account, now); const usage = account.usage.month === freshUsage(now).month ? account.usage.used : 0;
  return { id: account.id, keyPrefix: account.prefix, plan, monthlyRequests: MCP_PLANS[plan].monthlyRequests, used: usage, remaining: Math.max(0, MCP_PLANS[plan].monthlyRequests - usage), period: freshUsage(now).month, paidUntil: account.grants ? Math.max(0, ...account.grants.filter(g => g.plan === plan && g.start <= now && g.end > now).map(g => g.end)) || null : account.paidUntil || null };
}
export async function issueMcpKey(owner: string, rotate = false) {
  if (!/^(telegram:[1-9]\d{0,19}|operator:[a-zA-Z0-9_-]{1,80})$/.test(owner)) throw new McpAccessError('Invalid owner', 400);
  const id = hash(owner);
  return locked(id, async existing => {
    if (existing && !rotate) return { account: publicAccount(existing), apiKey: null };
    const key = `sn_mcp_${randomBytes(32).toString('base64url')}`;
    const keyHash = hash(key);
    const account: Account = { ...existing, id, keyHash, prefix: key.slice(0, 14), createdAt: existing?.createdAt || new Date().toISOString(), plan: existing?.plan || 'free', usage: existing?.usage || freshUsage(Date.now()), events: existing?.events || [] };
    await write(path.join(root(), 'keys', `${keyHash}.json`), { id });
    await write(accountPath(id), account);
    return { apiKey: key, account: publicAccount(account) };
  });
}
export async function authenticateMcp(key: string): Promise<Account> {
  if (!/^sn_mcp_[A-Za-z0-9_-]{43}$/.test(key)) throw new McpAccessError('A SarvNema API key is required');
  const keyHash = hash(key); const entry = await read<{ id: string }>(path.join(root(), 'keys', `${keyHash}.json`));
  const account = entry && await read<Account>(accountPath(entry.id));
  if (!account || account.keyHash !== keyHash) throw new McpAccessError('Invalid or rotated API key');
  return account;
}
export async function consumeMcp(key: string, now = Date.now()) {
  const identity = await authenticateMcp(key);
  return locked(identity.id, async account => {
    if (!account || account.keyHash !== hash(key)) throw new McpAccessError('Invalid API key');
    normalizeUsage(account, now); const limits = MCP_PLANS[effectivePlan(account, now)];
    if (account.usage.used >= limits.monthlyRequests) throw new McpAccessError('Monthly quota reached. Upgrade at https://sarvnema.ir/developers', 429, Math.max(1, Math.ceil((Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth() + 1, 1) - now) / 1000)));
    if (account.usage.calls >= limits.perMinute) throw new McpAccessError('Rate limit reached', 429, 60 - Math.floor(now / 1000) % 60);
    account.usage.used++; account.usage.calls++;
    await write(accountPath(account.id), account); return publicAccount(account, now);
  });
}
export async function applyMcpPayment(id: string, update: { plan: Exclude<McpPlan, 'free'>; paymentId: string; paidAt: number }) {
  return locked(id, async account => {
    if (!account) throw new McpAccessError('Payment account not found', 400);
    if (account.events.includes(update.paymentId)) return;
    account.grants ||= [];
    const relevant = account.grants.filter(g => update.plan === 'starter' || g.plan === 'pro');
    const start = Math.max(update.paidAt, ...relevant.map(g => g.end));
    account.grants.push({ id: update.paymentId, plan: update.plan, start, end: start + 30 * 86400000 });
    account.plan = effectivePlan(account, update.paidAt);
    account.events = [...account.events, update.paymentId]; await write(accountPath(id), account);
  });
}
export function mcpBearer(request: Request) { return request.headers.get('authorization')?.match(/^Bearer (sn_mcp_[A-Za-z0-9_-]+)$/i)?.[1] || ''; }
