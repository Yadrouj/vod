import Link from 'next/link';
import { Fragment } from 'react';

/** Only local absolute paths and our bot are permitted; no raw HTML parsing. */
export function MagazineInline({ text }: { text: string }) {
  const pieces: React.ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(/\[([^\]\n]+)\]\(([^\s)]+)\)/gu)) {
    const offset = match.index;
    pieces.push(text.slice(cursor, offset));
    const [raw, label, href] = match;
    const internal = href.startsWith('/') && !href.startsWith('//') && !/[\\\u0000-\u001f]/u.test(href);
    pieces.push(internal
      ? <Link key={offset} href={href}>{label}</Link>
      : href === 'https://t.me/Sarvnema_bot'
        ? <a key={offset} href={href} target="_blank" rel="noopener noreferrer">{label} ↗</a>
        : raw);
    cursor = offset + raw.length;
  }
  pieces.push(text.slice(cursor));
  return <>{pieces.map((piece, i) => <Fragment key={i}>{piece}</Fragment>)}</>;
}
