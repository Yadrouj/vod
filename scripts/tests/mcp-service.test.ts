import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { issueMcpKey, authenticateMcp, consumeMcp, publicAccount, applyMcpPayment, McpAccessError } from '../../lib/mcp/store';
import { transferMatches, tokenAmount, USDT_BSC, TRANSFER_TOPIC, type TransferLog } from '../../lib/mcp/bsc';
import { createCryptoInvoice, scanCryptoPayments, getCryptoInvoice } from '../../lib/mcp/payments';
import { boundedJson, sameOrigin } from '../../lib/mcp/http';
import { searchBotProfile } from '../telegram-search-profile.mjs';

test('MCP persistent quotas, key rotation, plans, payments and input safeguards', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'sarvnema-mcp-')); const oldDir = process.env.MCP_DATA_DIR; process.env.MCP_DATA_DIR = folder;
  const oldFetch = globalThis.fetch; const saved = { ...process.env };
  try {
    const created = await issueMcpKey('operator:test'); const key = created.apiKey!; const accountId = created.account.id;
    assert.equal((await issueMcpKey('operator:test')).apiKey, null);
    const outcomes = await Promise.allSettled(Array.from({ length: 12 }, () => consumeMcp(key)));
    assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 5, 'concurrent calls cannot overrun the rate limit');
    assert.equal(publicAccount(await authenticateMcp(key)).used, 5);
    const rotated = await issueMcpKey('operator:test', true);
    await assert.rejects(authenticateMcp(key), McpAccessError);
    assert.equal(rotated.account.used, 5, 'rotation must not reset usage');
    const disk = await readFile(path.join(folder, 'accounts', `${accountId}.json`), 'utf8');
    assert.equal(disk.includes(rotated.apiKey!), false, 'never store plaintext API keys');
    const now = Date.now();
    await applyMcpPayment(accountId, { plan: 'starter', paymentId: 'one', paidAt: now });
    const paid = publicAccount(await authenticateMcp(rotated.apiKey!)); assert.equal(paid.plan, 'starter');
    await applyMcpPayment(accountId, { plan: 'starter', paymentId: 'one', paidAt: now });
    assert.equal(publicAccount(await authenticateMcp(rotated.apiKey!)).paidUntil, paid.paidUntil, 'a payment is credited once');
    assert.equal(publicAccount(await authenticateMcp(rotated.apiKey!), now + 31 * 86400000).plan, 'free');
    const query = new Request('https://sarvnema.ir/mcp', { method: 'POST', body: 'x'.repeat(40000) }); await assert.rejects(boundedJson(query), /too large/);
    assert.throws(() => sameOrigin(new Request('https://sarvnema.ir/mcp', { headers: { origin: 'https://attacker.example' } })), /Origin/);
    process.env.MCP_CRYPTO_ENABLED = '1'; process.env.MCP_COMMERCIAL_RIGHTS_CONFIRMED = '1'; process.env.MCP_BSC_WALLET = `0x${'11'.repeat(20)}`;
    const blockHash = `0x${'aa'.repeat(32)}`; const txHash = `0x${'bb'.repeat(32)}`; const stamp = Math.floor(Date.now() / 1000);
    const proofHolder: { log?: TransferLog } = {}; let receiptStatus = '0x1'; let chain = '0x38';
    globalThis.fetch = async (_input, init) => {
      const rpc = JSON.parse(String(init?.body));
      const log = proofHolder.log;
      const result = rpc.method === 'eth_chainId' ? chain : rpc.method === 'eth_call' ? '0x12' : rpc.method === 'eth_getBlockByNumber' ? { number: '0x64', timestamp: `0x${stamp.toString(16)}`, hash: blockHash } : rpc.method === 'eth_getLogs' ? (log ? [log] : []) : rpc.method === 'eth_getTransactionReceipt' ? { status: receiptStatus, blockHash, logs: log ? [log] : [] } : null;
      return Response.json({ jsonrpc: '2.0', id: 1, result });
    };
    const paymentAccount = await issueMcpKey('operator:payer');
    const invoice = await createCryptoInvoice(paymentAccount.account.id, 'pro');
    assert.equal(invoice.amount, '29.000001'); assert.equal((await createCryptoInvoice(paymentAccount.account.id, 'pro')).id, invoice.id);
    assert.equal(tokenAmount(9000123), '9.000123');
    const log = { address: USDT_BSC, topics: [TRANSFER_TOPIC, `0x${'22'.repeat(32)}`, `0x${process.env.MCP_BSC_WALLET.slice(2).padStart(64, '0')}`], data: `0x${(BigInt(29000001) * BigInt(10) ** BigInt(12)).toString(16).padStart(64, '0')}`, transactionHash: txHash, blockNumber: '0x64', blockHash, logIndex: '0x1' };
    proofHolder.log = log;
    assert.ok(transferMatches(log, process.env.MCP_BSC_WALLET, 29000001));
    assert.equal(transferMatches({ ...log, address: `0x${'33'.repeat(20)}` }, process.env.MCP_BSC_WALLET, 29000001), false);
    assert.equal(transferMatches(log, process.env.MCP_BSC_WALLET, 29000002), false);
    assert.equal(transferMatches({ ...log, removed: true }, process.env.MCP_BSC_WALLET, 29000001), false);
    receiptStatus = '0x0'; await scanCryptoPayments(); assert.equal(publicAccount(await authenticateMcp(paymentAccount.apiKey!)).plan, 'free');
    // A failed receipt is immutable. Use a second invoice/account with its own unique amount for the successful case.
    const second = await issueMcpKey('operator:payer-two'); const secondInvoice = await createCryptoInvoice(second.account.id, 'pro');
    receiptStatus = '0x1'; log.data = `0x${(BigInt(29000002) * BigInt(10) ** BigInt(12)).toString(16).padStart(64, '0')}`;
    await scanCryptoPayments(); const paidInvoice = await getCryptoInvoice(second.account.id, secondInvoice.id); assert.equal(paidInvoice.credited, true);
    const expiry = publicAccount(await authenticateMcp(second.apiKey!)).paidUntil;
    await scanCryptoPayments(); assert.equal(publicAccount(await authenticateMcp(second.apiKey!)).paidUntil, expiry);
    await assert.rejects(getCryptoInvoice(paymentAccount.account.id, secondInvoice.id), /not found/);
    chain = '0x1'; await assert.rejects(createCryptoInvoice(accountId, 'pro'), /Wrong blockchain/);
    const quota = await issueMcpKey('operator:quota');
    for (let n = 0; n < 100; n++) await consumeMcp(quota.apiKey!, now + n * 60000);
    await assert.rejects(consumeMcp(quota.apiKey!, now + 101 * 60000), /Monthly quota/);
    const profile = searchBotProfile({ totals: { movies: 21000, series: 8000, titles: 29000 } }, { totals: { tracks: 142000 } });
    assert.ok(profile.description.includes('موتور جستجوی'));
    assert.ok(profile.name.length <= 64 && profile.short_description.length <= 120 && profile.description.length <= 512 && profile.channelDescription.length <= 255);
  } finally {
    globalThis.fetch = oldFetch; for (const name of ['MCP_CRYPTO_ENABLED', 'MCP_COMMERCIAL_RIGHTS_CONFIRMED', 'MCP_BSC_WALLET']) { if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name]; }
    if (oldDir === undefined) delete process.env.MCP_DATA_DIR; else process.env.MCP_DATA_DIR = oldDir;
    await rm(folder, { recursive: true, force: true });
  }
});
