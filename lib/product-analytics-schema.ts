export const EVENT_TYPES = ['page_view','page_leave','pulse','play_start','media_end','media_error','buffer','download_click','download_handoff'] as const;
export type ProductEvent = { type: typeof EVENT_TYPES[number]; path: string; kind?: 'video' | 'audio'; item?: string; provider?: string; seconds?: number; engaged?: number; buffering?: number; exit?: boolean };
export type ProductPacket = { consent: true; visitor: string; session: string; batch: string; source: string; device: 'mobile' | 'desktop' | 'tv'; events: ProductEvent[] };
const id = /^[a-zA-Z0-9_-]{8,80}$/;
export function analyticsPath(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 300 || !input.startsWith('/') || input.startsWith('//')) return null;
  const p = input.split(/[?#]/)[0];
  if (/^\/(?:admin|kids|api)(?:\/|$)/.test(p)) return null;
  if (/^\/(?:download|d|dl)(?:\/|$)/.test(p)) return '/download';
  if (/^\/watch-together\//.test(p)) return '/watch-together/room';
  return /^\/(?:$|(?:browse|music|mag|watch|tv|person|people|films|series|top-imdb|iranian-films|apps|updates|developers)(?:\/[a-zA-Z0-9_%.-]+){0,4}\/?$|[a-zA-Z0-9_-]{3,100}$)/.test(p) ? p : null;
}
export function trafficSource(referrer: string, campaign = '', origin = '') {
  const allowed = ['instagram','telegram','bale','youtube','google','bing','x','facebook'];
  if (allowed.includes(campaign.toLowerCase())) return campaign.toLowerCase();
  try { const url = new URL(referrer); if (url.origin === origin) return 'direct'; const host = url.hostname.replace(/^www\./,'');
    if (/^(?:[a-z0-9-]+\.)*(?:google|bing)\.[a-z.]+$/.test(host)) return /(?:^|\.)bing\./.test(host) ? 'bing' : 'google';
    if (/^(?:[a-z0-9-]+\.)?(instagram\.com|t\.me|telegram\.org|youtube\.com|youtu\.be|facebook\.com|twitter\.com|x\.com)$/.test(host)) return host.includes('instagram') ? 'instagram' : /t\.me|telegram/.test(host) ? 'telegram' : /youtu/.test(host) ? 'youtube' : host.includes('facebook') ? 'facebook' : 'x';
    return /^[a-z0-9.-]{3,60}$/.test(host) ? host : 'referral';
  } catch { return 'direct'; }
}
export function parseProductPacket(value: unknown): ProductPacket | null {
  if (!value || typeof value !== 'object') return null;
  const p = value as Record<string, unknown>;
  if (p.consent !== true || ![p.visitor,p.session,p.batch].every(v => typeof v === 'string' && id.test(v)) || !['mobile','desktop','tv'].includes(String(p.device)) || !Array.isArray(p.events) || p.events.length < 1 || p.events.length > 20) return null;
  const events: ProductEvent[] = [];
  for (const raw of p.events) {
    if (!raw || typeof raw !== 'object') return null;
    const e = raw as Record<string,unknown>, path = analyticsPath(e.path);
    if (!path || !EVENT_TYPES.includes(e.type as ProductEvent['type'])) return null;
    if (['seconds','engaged','buffering'].some(k => e[k] !== undefined && (typeof e[k] !== 'number' || !Number.isFinite(e[k]) || Number(e[k]) < 0 || Number(e[k]) > 15))) return null;
    const item = typeof e.item === 'string' && /^(?:music:)?[a-zA-Z0-9_-]{1,100}$/.test(e.item) ? e.item : undefined;
    const provider = typeof e.provider === 'string' && /^[a-zA-Z0-9.-]{1,80}$/.test(e.provider) ? e.provider.toLowerCase() : 'unknown';
    events.push({type:e.type as ProductEvent['type'],path,item,provider,kind:e.kind === 'audio' ? 'audio' : 'video', seconds:Number(e.seconds)||0,engaged:Number(e.engaged)||0,buffering:Number(e.buffering)||0,exit:e.exit===true});
  }
  if (events.filter(e => e.type === 'pulse').length > 1) return null;
  const source = typeof p.source === 'string' && /^[a-z][a-z0-9.-]{0,59}$/.test(p.source) ? p.source : 'direct';
  return {consent:true,visitor:String(p.visitor),session:String(p.session),batch:String(p.batch),source,device:p.device as ProductPacket['device'],events};
}
export function analyticsCsvCell(value: unknown) {
  let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text=`'${text}`;
  return `"${text.replace(/"/g,'""')}"`;
}
