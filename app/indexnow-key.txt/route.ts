import { readFile } from 'node:fs/promises';
import path from 'node:path';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const file = path.join(process.env.BLOG_STATE_DIR || path.join(process.cwd(), '.media-cache/blog-agent'), 'indexnow.json');
    const { key } = JSON.parse(await readFile(file, 'utf8')) as { key: string };
    if (!/^[a-f0-9]{32}$/.test(key)) return new Response(null, { status: 404 });
    return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
  } catch { return new Response(null, { status: 404 }); }
}
