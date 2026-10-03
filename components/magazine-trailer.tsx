'use client';
import { useState } from 'react';
import type { ArticleVisuals } from '@/lib/magazine-media';

export function MagazineTrailer({ trailer }: { trailer: NonNullable<ArticleVisuals['trailer']> }) {
  const [failed, setFailed] = useState(false);
  return <div>
    {trailer.url && !failed && <video controls playsInline preload="none" poster={trailer.poster} src={trailer.url} aria-label={trailer.name} onError={() => setFailed(true)} />}
    {(!trailer.url || failed) && <p>پخش مستقیم این تریلر فعلاً در دسترس نیست؛ می‌توانید آن را در منبع اصلی ببینید.</p>}
    {trailer.sourceUrl && <a href={trailer.sourceUrl} target="_blank" rel="noopener noreferrer">تماشای تریلر در IMDb ↗</a>}
  </div>;
}
