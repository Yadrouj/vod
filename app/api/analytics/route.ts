import { analyticsEnabled, productAnalytics } from '@/lib/product-analytics-store';
import { parseProductPacket } from '@/lib/product-analytics-schema';
import { sameAdminOrigin, smallJson } from '@/lib/admin-auth';
import { checkRateLimit, clientIp } from '@/lib/runtime-cache';
import { createHash } from 'node:crypto';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
export function GET() {return Response.json({enabled:analyticsEnabled(),retentionDays:90,consentRequired:true},{headers});}
export async function POST(request:Request) {
  if(!sameAdminOrigin(request))return Response.json({error:'origin_required'},{status:403,headers});
  if(!analyticsEnabled()||request.headers.get('sec-gpc')==='1'||request.headers.get('dnt')==='1'||/bot|spider|crawler|headless/i.test(request.headers.get('user-agent')||''))return new Response(null,{status:202,headers});
  const key=createHash('sha256').update(clientIp(request)).digest('hex');
  if(!checkRateLimit(`product:${key}`,240,60000).allowed||!checkRateLimit('product:global',6000,60000).allowed)return new Response(null,{status:429,headers});
  try {
    const packet=parseProductPacket(await smallJson(request));
    if(!packet)return Response.json({error:'invalid_event'},{status:400,headers});
    productAnalytics().ingest(packet);
    return new Response(null,{status:202,headers});
  }catch(error){return Response.json({error:error instanceof Error&&error.message==='body_too_large'?'body_too_large':'collection_unavailable'},{status:error instanceof Error&&/body|JSON/.test(error.message)?400:503,headers});}
}
