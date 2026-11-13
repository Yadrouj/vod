import { loadWorldBoxOffice } from '@/lib/world-box-office';
export const dynamic = 'force-dynamic';
export async function GET() {
  const data = await loadWorldBoxOffice();
  return Response.json({ data }, { status: data ? 200 : 503, headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } });
}
