import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import lockfile from 'proper-lockfile';
import { MCP_PLANS, type McpPlan } from './plans';
import { applyMcpPayment, McpAccessError } from './store';
import { bscHead, bscRpc, tokenAmount, transferMatches, USDT_BSC, TRANSFER_TOPIC, type TransferLog } from './bsc';
type Invoice = { id: string; accountId: string; plan: Exclude<McpPlan, 'free'>; wallet: string; amountMicros: number; createdAt: number; expiresAt: number; fromBlock: number; cursor: number; state: 'pending' | 'paid' | 'expired'; transaction?: string; credited?: boolean; scanComplete?: boolean };
type State = { sequence: number; invoices: Invoice[]; claimed: Record<string, string> };
const file = () => path.resolve(process.env.MCP_DATA_DIR || 'data/mcp', 'payments.json');
export function cryptoReady() { return process.env.MCP_CRYPTO_ENABLED === '1' && process.env.MCP_COMMERCIAL_RIGHTS_CONFIRMED === '1' && /^0x[0-9a-f]{40}$/i.test(process.env.MCP_BSC_WALLET || '') && !/^0x0{40}$/i.test(process.env.MCP_BSC_WALLET || ''); }
async function transaction<T>(fn: (state: State, save: () => Promise<void>) => Promise<T>) {
  const target = file(); await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const release = await lockfile.lock(target, { realpath: false, stale: 60000, update: 5000, retries: { retries: 10, minTimeout: 30, maxTimeout: 150 } });
  try {
    let state: State;
    try { state = JSON.parse(await readFile(target, 'utf8')); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; state = { sequence: 0, invoices: [], claimed: {} }; }
    const save = async () => { const tmp = `${target}.${randomUUID()}.tmp`; await writeFile(tmp, JSON.stringify(state), { mode: 0o600 }); await rename(tmp, target); };
    return await fn(state, save);
  } finally { await release(); }
}
export function publicInvoice(invoice: Invoice) {
  return { id: invoice.id, plan: invoice.plan, network: 'BNB Smart Chain (BEP-20)', chainId: 56, token: 'USDT', tokenContract: USDT_BSC, address: invoice.wallet, amount: tokenAmount(invoice.amountMicros), expiresAt: invoice.expiresAt, state: invoice.state === 'pending' && Date.now() > invoice.expiresAt ? 'expired' : invoice.state, transaction: invoice.transaction || null, credited: Boolean(invoice.credited) };
}
export async function createCryptoInvoice(accountId: string, plan: Exclude<McpPlan, 'free'>) {
  if (!cryptoReady()) throw new McpAccessError('USDT payments are not activated: receiver wallet and commercial configuration are required. No funds requested.', 503);
  const head = await bscHead(); const now = Date.now();
  return transaction(async (state, save) => {
    const existing = state.invoices.find(i => i.accountId === accountId && i.state === 'pending' && i.expiresAt > now);
    if (existing) { if (existing.plan !== plan) throw new McpAccessError('Finish or wait for your existing invoice to expire', 409); return publicInvoice(existing); }
    if (state.invoices.filter(i => i.accountId === accountId && i.createdAt > now - 86400000).length >= 3 || state.invoices.filter(i => i.state === 'pending' && i.expiresAt > now).length >= 100) throw new McpAccessError('Invoice creation limit reached', 429, 1200);
    // Never reuse an amount. Stop safely at capacity rather than misattribute a late payment.
    if (state.sequence >= 9999) throw new McpAccessError('Invoice capacity reached; contact support', 503);
    const invoice: Invoice = { id: randomUUID(), accountId, plan, wallet: process.env.MCP_BSC_WALLET!.toLowerCase(), amountMicros: MCP_PLANS[plan].priceUsd * 1000000 + ++state.sequence, createdAt: now, expiresAt: now + 20 * 60000, fromBlock: Number(BigInt(head.number)), cursor: Number(BigInt(head.number)), state: 'pending' };
    state.invoices.push(invoice); await save(); return publicInvoice(invoice);
  });
}
export async function getCryptoInvoice(accountId: string, id: string) {
  return transaction(async state => { const invoice = state.invoices.find(i => i.id === id && i.accountId === accountId); if (!invoice) throw new McpAccessError('Invoice not found', 404); return publicInvoice(invoice); });
}
export async function scanCryptoPayments() {
  if (!cryptoReady()) return;
  const head = await bscHead(); const finalized = Number(BigInt(head.number));
  const pending = await transaction(async state => state.invoices.filter(i => !i.scanComplete && i.state !== 'paid' || i.state === 'paid' && !i.credited).sort((a, b) => a.cursor - b.cursor).slice(0, 10));
  for (const snapshot of pending) {
    const end = Math.min(finalized, snapshot.cursor + 999);
    let match: TransferLog | undefined;
    // All network operations happen outside the write lock so status reads stay responsive.
    if (snapshot.state !== 'paid' && end >= snapshot.cursor) {
      const logs = await bscRpc<TransferLog[]>('eth_getLogs', [{ address: USDT_BSC, topics: [TRANSFER_TOPIC, null, `0x${snapshot.wallet.slice(2).padStart(64, '0')}`], fromBlock: `0x${snapshot.cursor.toString(16)}`, toBlock: `0x${end.toString(16)}` }]);
      for (const log of logs) {
        if (!transferMatches(log, snapshot.wallet, snapshot.amountMicros)) continue;
        const blockNumber = Number(BigInt(log.blockNumber)); if (blockNumber < snapshot.fromBlock || blockNumber > finalized) continue;
        const [receipt, block] = await Promise.all([
          bscRpc<{ status: string; blockHash: string; logs: TransferLog[] } | null>('eth_getTransactionReceipt', [log.transactionHash]),
          bscRpc<{ hash: string; timestamp: string }>('eth_getBlockByNumber', [log.blockNumber, false]),
        ]);
        const stamp = Number(BigInt(block.timestamp)) * 1000;
        if (receipt?.status === '0x1' && receipt.blockHash === block.hash && block.hash === log.blockHash && receipt.logs.some(l => l.logIndex === log.logIndex && transferMatches(l, snapshot.wallet, snapshot.amountMicros)) && stamp >= snapshot.createdAt - 2000 && stamp <= snapshot.expiresAt) { match = log; break; }
      }
    }
    await transaction(async (state, save) => {
      const invoice = state.invoices.find(i => i.id === snapshot.id); if (!invoice || invoice.credited) return;
      if (match && invoice.state !== 'paid') {
        const proof = `${match.transactionHash.toLowerCase()}:${match.logIndex}`;
        if (!state.claimed[proof] || state.claimed[proof] === invoice.id) { state.claimed[proof] = invoice.id; invoice.transaction = match.transactionHash; invoice.state = 'paid'; await save(); }
      }
      if (invoice.state === 'paid' && !invoice.credited) { await applyMcpPayment(invoice.accountId, { plan: invoice.plan, paymentId: invoice.id, paidAt: Date.now() }); invoice.credited = true; }
      invoice.cursor = Math.max(invoice.cursor, end + 1);
      if (invoice.state !== 'paid' && Date.now() > invoice.expiresAt) { invoice.state = 'expired'; if (end === finalized && Number(BigInt(head.timestamp)) * 1000 > invoice.expiresAt) invoice.scanComplete = true; }
      await save();
    });
  }
}
export function startCryptoPaymentMonitor() {
  let busy = false;
  const tick = async () => { if (busy || !cryptoReady()) return; busy = true; try { await scanCryptoPayments(); } catch { console.error('MCP payment verification deferred; no unverified entitlement granted.'); } finally { busy = false; } };
  const timer = setInterval(tick, 30000); timer.unref(); void tick();
  return () => clearInterval(timer);
}
