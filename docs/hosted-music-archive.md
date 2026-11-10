# Hosted music archive

SarvNema imports read-only music metadata from `ubuntu@62.83.32.47:~/music-files`.
The HTTPS file API is `https://music.sarvnema.ir/api/files?path=...`.

## Credentials

Set `SARVNEMA_MUSIC_TOKEN` privately in `.env.local` on production, or
`.env.development.local` locally. Never use a `NEXT_PUBLIC_` variable, a URL query
parameter, a committed file, or browser-side Authorization for this token.
Restart/recreate only the SarvNema application after changing its environment.
Rotate the original token shared in chat; update both the music host and this
private environment variable together.

The media relay authenticates only to the fixed HTTPS music origin, rejects
redirects, and serves only exact sources in the catalog. Browser requests contain
an archive track ID and source URL, never the credential. Range requests and
download headers are preserved; the existing five-second download gate remains.
Listen Together uses the same authenticated server-side relay.

This implementation relays audio through SarvNema rather than providing direct
signed links. It uses bandwidth on both servers. The music API currently requires
Bearer authentication for files; do not make the API token public to avoid the
relay. Signed, scoped, expiring file URLs would require music-host support.

## Refresh

1. Export tags on the music host, without modifying original files:

   ```sh
   python3 export-hosted-music.py /home/ubuntu/music-files \
     --wheel mutagen-1.47.0-py3-none-any.whl --output metadata.json
   ```

2. Copy the metadata to `.media-cache/music-hosted-metadata.json` locally.
3. With the private variable available to the process, run:

   ```sh
   node scripts/import-hosted-music.mjs
   ```

The importer checks all accessible API directories with four concurrent requests,
retains stable path-based IDs, and writes separate `public/data/hosted-music.json`
and `public/data/hosted-music-playlists.json` snapshots atomically. It does not
overwrite existing provider catalogs or live music data. Files denied with HTTP
403 and uncertain titles are excluded, not bypassed. Other scan failures abort
before writing. Large unexpected removals also abort. Import/refresh is manual;
no new daily timer has been installed.

The two snapshots are combined with the existing imported library at read time
for search, music shelves, artist profiles, bots and sitemaps. Compact landing
pages keep a bounded selection while retaining complete counts.

## Artwork and editorial playlists

Original embedded/folder artwork is preferred and relayed by track ID. Missing
artwork receives clearly labelled generated SVG archive artwork, not a fabricated
official cover or artist portrait. Artist profiles explicitly label cover imagery.
Release dates are not inferred from folder names or import dates. Nine new
playlists use real genre tags and limit repeated artists/albums.

Initial audit (2026-11-10): 9,200 metadata records; 9,166 accessible, identifiable
files imported, with 8,283 original covers. 33 files belong to API-denied folders
(`Camel/Camel - 1981 - Nude` and `David Bowie/[1991] Naked & Wired`); one unnamed
numeric Nirvana video is held for review. A file count is not a count of unique
recordings: different album editions/formats remain separate stable entries.

## Tests

```sh
node --import tsx --test scripts/tests/hosted-music.test.ts scripts/tests/import-hosted-music.test.mjs
npx tsc --noEmit
```

Also test actual browser playback, seeking, cover loading, artist profiles,
playlist resolution, a ranged download and Listen Together media selection.
