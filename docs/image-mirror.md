# External image mirror (`/media/img/...`)

Visitors in Iran can't reliably load images from other domains. Some hosts are
filtered (TVMaze, YouTube thumbnails, TMDB), and others are slow. So pages
never point at them. Every image on an allow-listed host is served from
sarvnema.ir and stored in the public MinIO bucket `sarvnema-tmdb` (in the
`vod-minio` container) under `ext/...`:

```
https://static.tvmaze.com/uploads/images/medium_landscape/0/1148.jpg
  → https://sarvnema.ir/media/img/static.tvmaze.com/uploads/images/medium_landscape/0/1148.jpg
http://worldofmusic.ir/a.jpg      → /media/img/http~worldofmusic.ir/a.jpg
https://i.ytimg.com/vi/x/hq.jpg?s → /media/img/i.ytimg.com/vi/x/hq.jpg?s   (key gets @<sha1(query)>)
```

TMDB has its own sized route, `/media/tmdb/...` (see `docs/tmdb-image-mirror.md`).
**Videos and audio are never mirrored.** The rewrite skips `mp4`, `m3u8`,
`webm`, `mp3` and similar files, and the route serves only bytes that are a real
JPEG, PNG, WebP, GIF or AVIF (no SVG).

## Where URLs are rewritten

`lib/image-url.ts` holds `sizedImageUrl` (IMDb sizes snap to 160–1920 px)
and `mirroredImageUrl`. Every component that renders an image, poster,
backdrop or `backgroundImage` goes through one of them. Other URLs pass through
unchanged. The host allowlist is `IMAGE_MIRROR_HOSTS` in
`lib/image-mirror-path.mjs`. **Add a new scraper's image host there.** Hosts
not on the list stay external. The allowlist stops strangers from using
`/media/img` as an open proxy to fill the disk.

## How a request is served (`app/media/img/[...path]/route.ts`)

1. The route reads the object from MinIO (anonymous read).
2. If it's missing, the route fetches it from the upstream host, following up
   to 3 redirects, and only to allow-listed hosts. It sends the bytes to the
   visitor and stores them in MinIO in the background.
3. **Disk floor:** nothing is stored while the server has less than 3 GB free
   (`IMAGE_MIRROR_MIN_FREE_BYTES`). Images are still served.
4. If the upstream is unreachable, the route answers `302` to the original
   URL, so nothing gets worse than before. A host that times out is skipped
   for 5 minutes.

`/api/episode-image/...` uses the same store for TVMaze and TheTVDB stills.

## Filling the bucket

Hosts the server can reach (IMDb, TheTVDB, Apple Music, melodify, the Persian
music and download sites, Wikimedia) fill **on demand**. Only images people
actually view use disk.

The server can't reach **TVMaze** or **YouTube thumbnails**, so those are
bulk-copied from a laptop, the same way as TMDB:

```bash
# 1. List URLs from the live catalog (throwaway, memory-capped container)
ssh parspack1 'cd /home/ubuntu/vod && docker run --rm --network none -m 768m --cpus 0.5 \
  -v $PWD/public/data:/app/public/data:ro -v $PWD/data:/app/data:ro -v $PWD/content:/app/content:ro \
  -v $PWD/scripts:/app/scripts:ro -v $PWD/lib:/app/lib:ro -e VOD_DATA_DIR=/app/public/data \
  vod-app node scripts/mirror-tmdb-images.mjs --list --external=static.tvmaze.com,i.ytimg.com' > blocked.txt

# 2. Tunnel MinIO, then upload (resumable)
ssh -N -L 19000:127.0.0.1:19000 parspack1
TMDB_MIRROR_ENDPOINT=http://127.0.0.1:19000 MINIO_ROOT_USER=sarvnema MINIO_ROOT_PASSWORD='<secret>' \
  npm run mirror-tmdb-images -- --input=blocked.txt --concurrency=8
```

Check `df -h /` on the server before a large upload: the disk is shared with
about 50 other services.
