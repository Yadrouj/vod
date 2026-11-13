import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const origin = process.env.LOAD_BASE_URL || 'http://localhost:3004';
const key = process.env.SARVNEMA_API_KEY;
assert.ok(key, 'Provide a disposable test key through the environment, never in the URL.');
const client = new Client({ name: 'sarvnema-smoke', version: '1.0.0' });
try {
  await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', origin), { requestInit: { headers: { Authorization: `Bearer ${key}` } } }));
  const tools = await client.listTools(); assert.equal(tools.tools.length, 6);
  const result = await client.callTool({ name: 'search_catalog', arguments: { query: 'breakng bud', type: 'series', limit: 3 } });
  assert.ok(JSON.stringify(result).includes('Breaking Bad'));
  const usage = await client.callTool({ name: 'account_usage', arguments: {} }); assert.ok(usage.structuredContent);
  const unauthorized = await fetch(new URL('/mcp', origin), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(unauthorized.status, 401);
  const alien = await fetch(new URL('/mcp', origin), { method: 'POST', headers: { Authorization: `Bearer ${key}`, Origin: 'https://attacker.example' }, body: '{}' }); assert.equal(alien.status, 403);
  console.log(JSON.stringify({ tools: tools.tools.map(t => t.name), typoCorrection: 'Breaking Bad', auth: 'enforced', origin: 'enforced' }));
} finally { await client.close(); }
