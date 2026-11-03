"use client";

import { useState } from 'react';

/** A failed remote portrait never leaves a broken-image icon or wrong album art. */
export function CreatorPortrait({ src, name, eager = false }: { src: string | null; name: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <span className="creator-portrait">
    <span aria-hidden="true">{name.trim().slice(0, 1)}</span>
    {src && !failed && <img src={src} alt={name} loading={eager ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />}
  </span>;
}
