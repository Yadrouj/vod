/** Source publication date, not scrape time. Invalid/future dates are not new. */
export function publishedMusicTime(track, now = Date.now()) {
  const stamp = Date.parse(track.publishedAt || "");
  return Number.isFinite(stamp) && stamp <= now ? stamp : 0;
}

export function compareMusicFreshness(left, right, now = Date.now()) {
  return publishedMusicTime(right, now) - publishedMusicTime(left, now)
    || Number(Boolean(right.coverUrl)) - Number(Boolean(left.coverUrl))
    || String(left.id).localeCompare(String(right.id));
}
