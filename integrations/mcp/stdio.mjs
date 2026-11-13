#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
const key = process.env.SARVNEMA_API_KEY;
if (!key) { console.error('Set SARVNEMA_API_KEY in your MCP client environment.'); process.exit(1); }
// The remote URL is fixed: credentials must never be forwarded to a user-supplied host.
const client = new Client({ name: 'sarvnema-stdio-bridge', version: '1.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL('https://sarvnema.ir/mcp'), { requestInit: { headers: { Authorization: `Bearer ${key}` } } }));
const server = new Server({ name: 'sarvnema', version: '1.0.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, () => client.listTools());
server.setRequestHandler(CallToolRequestSchema, request => client.callTool(request.params));
await server.connect(new StdioServerTransport());
process.once('SIGINT', () => { void client.close(); void server.close(); });
