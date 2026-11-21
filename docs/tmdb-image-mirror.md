# TMDB image mirror (`/media/tmdb/...`)

`image.tmdb.org` and `media.themoviedb.org` are filtered for most SarvNema
visitors, so lazy-loaded posters pointing there stayed blank. The production
server can't reach TMDB either: its DNS answers with the filter address.

From now on, pages never link to TMDB. `lib/image-url.ts` (`sizedImageUrl`,
`mirroredImageUrl`) rewrites every TMDB image to a same-origin path:

```
https://image.tmdb.org/t/p/w342/abc.jpg  →  https://sarvnema.ir/media/tmdb/w500/abc.jpg
```

## How a request is served

`app/media/tmdb/[size]/[file]/route.ts` → `lib/tmdb-mirror.ts`:

1. The route reads `<size>/<file>` from the **public** MinIO bucket `sarvnema-tmdb`
   in the `vod-minio` container (anonymous reads, so no signing is needed). If
   that exact size is missing, it serves the nearest stored size.
2. If the image isn't in the bucket, the route tries TMDB with a 2.5 s timeout.
   When that works, it stores the image in the bucket in the background. After
   a failure it doesn't retry TMDB for 5 minutes.
3. If both fail, it returns a `302` to the original TMDB URL, so the page is no
   worse than it was before the mirror existed.

`/api/episode-image/...` uses the same bucket for TMDB episode stills.

Only raster files (`jpg`/`png`/`webp`, verified by their bytes, at most 8 MB)
are served. SVG is never mirrored, because SVG served from our own origin
could run script.

## Configuration

Compose (`deploy/host/docker-compose.host.yml`) sets these on the app:
`TMDB_MIRROR_ENDPOINT=http://vod-minio:9000` and `TMDB_MIRROR_BUCKET=sarvnema-tmdb`.
Set the credentials in the server's `.env.local`. Both `vod-minio` and the app
read that file:

```
MINIO_ROOT_USER=sarvnema
MINIO_ROOT_PASSWORD=<long random secret>
```

`TMDB_MIRROR_UPSTREAM=0` turns off step 2. When `TMDB_MIRROR_ENDPOINT` is unset
(for example in local dev), the route proxies TMDB directly.

`vod-minio` listens on `127.0.0.1:19000` on the host, which the upload tunnel
uses. It is not published to the internet. Visitors reach the images only
through `sarvnema.ir/media/tmdb/...`.

## Filling the bucket

The server can't download from TMDB, so the copy runs from a laptop that can:

```bash
# 1. List what the live catalog references. Use a throwaway, memory-capped
#    container: never run this inside the live vod-app (the catalog is ~3 GB).
ssh parspack1 'cd /home/ubuntu/vod && docker run --rm --network none -m 768m --cpus 0.5 \
  -v $PWD/public/data:/app/public/data:ro -v $PWD/data:/app/data:ro -v $PWD/content:/app/content:ro \
  -v $PWD/scripts:/app/scripts:ro -v $PWD/lib:/app/lib:ro -e VOD_DATA_DIR=/app/public/data \
  vod-app node scripts/mirror-tmdb-images.mjs --list' > tmdb-images.txt

# 2. Tunnel MinIO to the laptop (keep it open)
ssh -N -L 19000:127.0.0.1:19000 parspack1

# 3. Download from TMDB and upload. Resumable: stored objects are skipped.
#    The script also creates the bucket and sets its public-read policy.
TMDB_MIRROR_ENDPOINT=http://127.0.0.1:19000 \
MINIO_ROOT_USER=sarvnema MINIO_ROOT_PASSWORD='<secret>' \
  npm run mirror-tmdb-images -- --input=tmdb-images.txt --concurrency=6
```

Sizes stored per reference: posters get `w500`, and landscape keys (`backdrop`,
`hero`, `still`, ...) get `w1280` and `w300`. Face crops are stored as-is. Other
requested sizes fall back to the nearest stored one. Re-run steps 1 and 3 after
large catalog refreshes. New titles work in the meantime through the `302`
fallback.
