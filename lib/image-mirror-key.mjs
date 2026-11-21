// Node-only: MinIO object key for a mirrored external image. Shared by the
// /media/img route (lib/image-mirror.ts) and scripts/mirror-tmdb-images.mjs,
// which must agree byte for byte.
import { createHash } from "node:crypto";

/** ext/<host>/<encoded path>[@<query hash>]; plain-http hosts are prefixed http~. */
export function externalObjectKey(upstream) {
  const host = upstream.protocol === "http:" ? `http~${upstream.hostname}` : upstream.hostname;
  const query = upstream.search ? `@${createHash("sha1").update(upstream.search).digest("hex").slice(0, 16)}` : "";
  return `ext/${host}${upstream.pathname}${query}`;
}
