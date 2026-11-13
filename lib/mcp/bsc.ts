export const BSC_CHAIN_ID = 56;
export const USDT_BSC = '0x55d398326f99059ff775485246999027b3197955';
export const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export type TransferLog = { address: string; topics: string[]; data: string; transactionHash: string; blockNumber: string; blockHash: string; logIndex: string; removed?: boolean };
export function tokenAmount(amountMicros: number) { return `${Math.floor(amountMicros / 1000000)}.${String(amountMicros % 1000000).padStart(6, '0')}`; }
export function transferMatches(log: TransferLog, wallet: string, amountMicros: number) {
  return !log.removed && log.address.toLowerCase() === USDT_BSC && log.topics.length === 3 && log.topics[0].toLowerCase() === TRANSFER_TOPIC && log.topics[2].toLowerCase() === `0x${wallet.slice(2).toLowerCase().padStart(64, '0')}` && /^0x[0-9a-f]{64}$/i.test(log.data) && BigInt(log.data) === BigInt(amountMicros) * BigInt(10) ** BigInt(12);
}
export async function bscRpc<T>(method: string, params: unknown[]): Promise<T> {
  const endpoint = process.env.BSC_RPC_URL || 'https://bsc-rpc.publicnode.com';
  if (new URL(endpoint).protocol !== 'https:') throw new Error('RPC must use HTTPS');
  const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(12000), cache: 'no-store' });
  if (!response.ok) throw new Error('Blockchain service unavailable');
  const payload = await response.json(); if (payload.error || !('result' in payload)) throw new Error('Blockchain RPC failed'); return payload.result;
}
export async function bscHead() {
  if (await bscRpc<string>('eth_chainId', []) !== '0x38') throw new Error('Wrong blockchain');
  const head = await bscRpc<{ number: string; timestamp: string; hash: string }>('eth_getBlockByNumber', ['finalized', false]);
  if (!head?.number || Date.now() / 1000 - Number(BigInt(head.timestamp)) > 120 || Number(BigInt(head.timestamp)) > Date.now() / 1000 + 60) throw new Error('Finalized blockchain head is stale');
  const decimals = await bscRpc<string>('eth_call', [{ to: USDT_BSC, data: '0x313ce567' }, 'latest']);
  if (BigInt(decimals) !== BigInt(18)) throw new Error('Unexpected token decimals');
  return head;
}
