import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { buildArtists, slugify } from './music-catalog.mjs';
import { writeJsonAtomic } from './atomic-json.mjs';

const origin = 'https://music.sarvnema.ir';
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 20);
const persianFolders = new Set(['Farhad', 'Fereydoun Farokhzaad', 'Fereydoun Foroughi', 'Kourosh Yaghmaie']);
const aliases = { 'ACDC': 'AC/DC', 'Micheal Jackson': 'Michael Jackson', 'White Stripes': 'The White Stripes', 'Beach Boys': 'The Beach Boys', 'Moody Blues': 'The Moody Blues' };
const fileUrl = value => `${origin}/files/${value.split('/').map(encodeURIComponent).join('/')}`;

export function buildHostedCatalog(metadata, existingArtists = [], addedAt = new Date().toISOString(), availablePaths = null, compatible = {}) {
  const artistsByName = new Map(existingArtists.map(a => [a.name.normalize('NFKC').toLowerCase().trim(), a]));
  const tracks = [], seen = new Set(), excluded = [];
  for (const row of metadata.tracks ?? []) {
    if (row.needsReview || !row.title || !row.artists?.length || (availablePaths && !availablePaths.has(row.path)) || !/\.(mp3|m4a|flac|mp4|m4v)$/i.test(row.path) || row.path.split('/').some(p => !p || p === '.' || p === '..') || seen.has(row.path)) {
      excluded.push(row.path); continue;
    }
    seen.add(row.path);
    const id = `hosted-${hash(row.path)}`;
    const derivative = compatible[id];
    const compatiblePath = derivative?.sourcePath === row.path && derivative?.codec === 'mp3' && derivative.path === `.sarvnema/compatible/${id}.mp3` ? derivative.path : null;
    const artists = row.artists.map(raw => {
      const name = aliases[raw] || raw;
      const existing = artistsByName.get(name.normalize('NFKC').toLowerCase().trim());
      // Preserve established Persian/international namesakes instead of fuzzy matching.
      const slug = existing?.slug || slugify(name) || `artist-${hash(name)}`;
      return { name: existing?.name || name, slug, sourceUrl: `/music/artists/${encodeURIComponent(slug)}`, ...(existing?.aliases ? { aliases: existing.aliases } : {}) };
    });
    const genres = [...new Set((row.genres ?? []).map(g => g.trim()).filter(Boolean))];
    const coverUrl = `/api/music/hosted-cover/${id}`;
    const category = persianFolders.has(row.folderArtist) ? 'موسیقی قدیمی فارسی' : 'موسیقی خارجی';
    const publishedAt = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(row.date || '') && Number.isFinite(Date.parse(row.date)) ? row.date : null;
    tracks.push({ id, kind: row.kind === 'video' ? 'video' : 'track', title: row.title, persianTitle: row.title,
      artist: artists[0], artists, coverUrl, description: `از آرشیو موسیقی سرونما${row.album ? `؛ آلبوم ${row.album}` : ''}. اطلاعات بر اساس تگ‌های فایل است.`,
      sourceUrl: `/music/${id}`, publishedAt, addedAt, category, moods: [...new Set([...genres, ...(row.moods ?? [])])],
      album: row.album ? { id: `hosted-album-${hash(`${artists[0].slug}:${row.album}`)}`, title: row.album, sourceUrl: `/music?${new URLSearchParams({ q: `${artists[0].name} ${row.album}` })}`, coverUrl, genres } : undefined,
      folder: { root: row.kind === 'video' ? 'Music Video' : 'Music', year: null, month: null, day: null },
      hostedCoverPath: /^\.sarvnema\/covers\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(row.coverPath || '') ? row.coverPath : null,
      sources: [
        ...(compatiblePath ? [{ url: fileUrl(compatiblePath), label: 'پخش سازگار · MP3', quality: 'MP3 · 320 kbps', kind: 'stream', provider: 'sarvnema-hosted', available: true }] : []),
        { url: fileUrl(row.path), label: compatiblePath ? 'فایل اصلی · ALAC' : 'آرشیو سرونما', quality: row.codec === 'alac' ? 'ALAC · Original' : /\.flac$/i.test(row.path) ? 'FLAC' : row.bitrate ? `${Math.round(row.bitrate / 1000)} kbps` : row.path.split('.').pop().toUpperCase(), kind: compatiblePath ? 'download' : 'stream', provider: 'sarvnema-hosted', available: true },
      ],
    });
  }
  const artists = buildArtists(tracks);
  for (const artist of artists) artist.bio = `آثار ${artist.name} در آرشیو سرونما؛ ${artist.trackIds.length.toLocaleString('fa-IR')} قطعه. تصویر این صفحه کاور یکی از آثار است، نه لزوماً پرترهٔ هنرمند.`;
  const categoryCounts = {};
  for (const track of tracks) for (const tag of new Set([track.category, ...track.moods])) categoryCounts[tag] = (categoryCounts[tag] || 0) + 1;
  return { version: 1, source: 'multi-source', updatedAt: addedAt, scanned: { musicPages: 0, videoPages: 0, full: true }, tracks, artists, categories: Object.keys(categoryCounts), categoryCounts, libraryExistingArtistSlugs: existingArtists.map(a => a.slug), excluded };
}

export function hostedPlaylists(index) {
  const definitions = [
    ['rock', 'راک؛ از کلاسیک تا آلترناتیو', /rock|alternative/i],
    ['metal', 'دنیای متال', /metal|thrash/i],
    ['progressive', 'سفر در پراگرسیو و سایکدلیک', /progressive|psychedelic/i],
    ['pop', 'پاپ و دیسکو؛ خاطره‌های جهانی', /pop|disco/i],
    ['jazz', 'کافهٔ جاز و بلوز', /jazz|blues/i],
    ['electronic', 'جهان الکترونیک', /electronic|dance|trip.hop/i],
    ['hip-hop', 'رپ و هیپ‌هاپ', /hip.hop|rap/i],
    ['classical', 'کلاسیک، پیانو و موسیقی تصویر', /classical|soundtrack|piano|instrumental/i],
    ['grunge', 'آلترناتیو، گرانج و ایندی', /grunge|indie|alternative/i],
  ];
  const playlists = [];
  for (const [key, title, pattern] of definitions) {
    const selected = [], artists = new Map(), albums = new Map();
    const candidates = index.tracks.filter(t => t.kind === 'track' && t.category === 'موسیقی خارجی' && pattern.test(t.moods.join(' ')))
      .sort((a, b) => hash(a.id).localeCompare(hash(b.id)));
    for (const track of candidates) {
      const album = track.album?.id || track.id;
      if ((artists.get(track.artist.slug) || 0) >= 3 || (albums.get(album) || 0) >= 2) continue;
      selected.push(track); artists.set(track.artist.slug, (artists.get(track.artist.slug) || 0) + 1); albums.set(album, (albums.get(album) || 0) + 1);
      if (selected.length >= 40) break;
    }
    if (selected.length < 6) continue;
    playlists.push({ id: `hosted-${key}`, title, scope: 'international', mood: key, description: 'گلچین سرونما از آرشیو میزبانی‌شده؛ انتخاب بر اساس تگ واقعی سبک و با تنوع هنرمند و آلبوم.', trackIds: selected.map(t => t.id), covers: selected.slice(0, 4).map(t => t.coverUrl), artistCount: artists.size, updatedAt: index.updatedAt, selection: 'hosted-genre-tags' });
  }
  return { version: 1, updatedAt: index.updatedAt, playlists, uniqueTracks: new Set(playlists.flatMap(p => p.trackIds)).size };
}

async function scanApi(token) {
  const queue = [''], paths = new Set(), visited = new Set();
  let scanned = 0;
  while (queue.length) {
    const batch = queue.splice(0, 4).filter(p => !visited.has(p));
    await Promise.all(batch.map(async dir => {
      visited.add(dir);
      const response = await fetch(`${origin}/api/files?${new URLSearchParams({ path: dir })}`, { headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(20000) });
      if (response.status === 403) {
        console.log(JSON.stringify({ skippedForbiddenDirectory: dir }));
        return; // Respect denied directories; never bypass origin/CDN restrictions.
      }
      if (!response.ok) throw new Error(`Music directory ${JSON.stringify(dir)} HTTP ${response.status}; incomplete scan will not overwrite catalog.`);
      const body = await response.json();
      if (!Array.isArray(body.entries)) throw new Error('Invalid music listing');
      for (const entry of body.entries) {
        if (typeof entry.path !== 'string' || entry.path.split('/').some(p => !p || p === '..' || p === '.' || p.startsWith('.')) || (dir && !entry.path.startsWith(`${dir}/`))) continue;
        if (entry.type === 'dir') queue.push(entry.path);
        else if (entry.type === 'file' && /\.(mp3|m4a|flac|mp4|m4v)$/i.test(entry.path)) paths.add(entry.path);
      }
      if (++scanned % 100 === 0) console.log(JSON.stringify({ directories: scanned, files: paths.size, pending: queue.length }));
      if (visited.size > 10000) throw new Error('Directory safety limit');
    }));
  }
  return paths;
}

async function main() {
  const metadata = JSON.parse(await readFile(process.argv[2] || '.media-cache/music-hosted-metadata.json', 'utf8'));
  const previous = JSON.parse(await readFile('public/data/hosted-music.json', 'utf8').catch(() => '{}'));
  const existing = JSON.parse(await readFile('public/data/music-artists.json', 'utf8'));
  const token = process.env.SARVNEMA_MUSIC_TOKEN;
  if (!token) throw new Error('Set SARVNEMA_MUSIC_TOKEN privately; never place it in URLs.');
  const available = await scanApi(token);
  const manifest = JSON.parse(await readFile('.media-cache/music-compatible-manifest.json', 'utf8').catch(() => '{"completed":{}}'));
  const compatible = {};
  const entries = Object.entries(manifest.completed ?? {});
  for (let offset = 0; offset < entries.length; offset += 4) {
    await Promise.all(entries.slice(offset, offset + 4).map(async ([id, entry]) => {
      if (!/^hosted-[a-f0-9]{20}$/.test(id) || entry.path !== `.sarvnema/compatible/${id}.mp3`) return;
      const response = await fetch(fileUrl(entry.path), { method: 'HEAD', headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(20000) });
      if (!response.ok || Number(response.headers.get('content-length')) !== entry.bytes) throw new Error(`Compatible source unavailable: ${id}`);
      compatible[id] = entry;
    }));
  }
  const index = buildHostedCatalog(metadata, existing.artists, previous.updatedAt || new Date().toISOString(), available, compatible);
  if (index.tracks.length < (previous.tracks?.length || 0) * .9) throw new Error('Import would unexpectedly remove over 10% of hosted tracks');
  await writeJsonAtomic('public/data/hosted-music.json', index);
  await writeJsonAtomic('public/data/hosted-music-playlists.json', hostedPlaylists(index));
  console.log(JSON.stringify({ apiFiles: available.size, imported: index.tracks.length, artists: index.artists.length, compatible: Object.keys(compatible).length, covers: index.tracks.filter(t => t.hostedCoverPath).length, excluded: index.excluded.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
