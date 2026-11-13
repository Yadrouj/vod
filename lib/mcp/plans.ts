export const MCP_PLANS = {
  free: { name: 'Free', monthlyRequests: 100, perMinute: 5, priceUsd: 0 },
  starter: { name: 'Starter', monthlyRequests: 5000, perMinute: 30, priceUsd: 9 },
  pro: { name: 'Pro', monthlyRequests: 25000, perMinute: 60, priceUsd: 29 },
} as const;
export type McpPlan = keyof typeof MCP_PLANS;
export const MCP_SITE = 'https://sarvnema.ir';
export type McpGrant = { id: string; plan: Exclude<McpPlan, 'free'>; start: number; end: number };
export function effectivePlan(account: { plan: McpPlan; paidUntil?: number; grants?: McpGrant[] }, now = Date.now()): McpPlan {
  if (account.grants) { const active = account.grants.filter(g => g.start <= now && g.end > now); return active.some(g => g.plan === 'pro') ? 'pro' : active.length ? 'starter' : 'free'; }
  return account.plan !== 'free' && (account.paidUntil || 0) > now ? account.plan : 'free';
}
