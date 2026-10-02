import { loadMagazine } from '@/lib/magazine';
import { absoluteUrl } from '@/lib/seo';
export const dynamic = 'force-dynamic';
export async function GET() {
  const index = await loadMagazine();
  const text = ['# SarvNema — سرونما', '> Persian film, series and music directory with online playback and synchronized watch/listen rooms.', '', '## About', '- Audience: Persian-speaking readers. Published magazine articles are in Persian.', '- Editorial policy: factual references and archive availability are distinguished from analysis; no invented release dates or reviews.', '', '## Main sections', '- [Magazine](' + absoluteUrl('/mag') + ')', '- [Editorial policy](' + absoluteUrl('/mag/about') + ')', '- [Films and series](' + absoluteUrl('/browse') + ')', '- [Music](' + absoluteUrl('/music') + ')', '- [Music playlists](' + absoluteUrl('/music/collections') + ')', '- [RSS](' + absoluteUrl('/mag/feed.xml') + ')', '', '## Published articles', ...index.articles.map(a => `- [${a.title}](${absoluteUrl(`/mag/${a.slug}`)}): ${a.description}`), '', 'Use the canonical published article URL when citing. A catalog addition is not necessarily a theatrical or official streaming release.', ''].join('\n');
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
