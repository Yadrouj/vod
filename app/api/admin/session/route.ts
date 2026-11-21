import { cookies } from 'next/headers';
import { ADMIN_COOKIE, ADMIN_TTL, PRIVATE_HEADERS, adminConfigured, adminSecret, createAdminSession, equalSecret, sameAdminOrigin, smallJson } from '@/lib/admin-auth';
import { checkRateLimit, clientIp } from '@/lib/runtime-cache';
import { createHash } from 'node:crypto';
export const runtime='nodejs';
export async function POST(request:Request) {
  if(!sameAdminOrigin(request))return Response.json({error:'origin_required'},{status:403,headers:PRIVATE_HEADERS});
  const key=createHash('sha256').update(clientIp(request)).digest('hex');
  if(!checkRateLimit(`admin-login:${key}`,5,60000).allowed || !checkRateLimit('admin-login:global',60,60000).allowed)return Response.json({error:'too_many_attempts'},{status:429,headers:PRIVATE_HEADERS});
  if(!adminConfigured())return Response.json({error:'admin_not_configured'},{status:503,headers:PRIVATE_HEADERS});
  try {
    const body=await smallJson(request,1024) as {token?:unknown};
    if(typeof body.token!=='string'||body.token.length>500||!equalSecret(body.token,adminSecret()))return Response.json({error:'invalid_credentials'},{status:401,headers:PRIVATE_HEADERS});
    (await cookies()).set(ADMIN_COOKIE,createAdminSession(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',maxAge:ADMIN_TTL,path:'/'});
    return Response.json({ok:true},{headers:PRIVATE_HEADERS});
  }catch{return Response.json({error:'invalid_request'},{status:400,headers:PRIVATE_HEADERS});}
}
export async function DELETE(request:Request) {
  if(!sameAdminOrigin(request))return Response.json({error:'origin_required'},{status:403,headers:PRIVATE_HEADERS});
  (await cookies()).set(ADMIN_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',maxAge:0,path:'/'});
  return Response.json({ok:true},{headers:PRIVATE_HEADERS});
}
