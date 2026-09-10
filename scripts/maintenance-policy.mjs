export function localClock(date = new Date(), timeZone = "Asia/Tehran") {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date).map(part => [part.type, part.value]));
  const weekday = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date)];
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second), weekday, timeZone };
}

export const DEFAULT_IDLE_START_HOUR = 3;
export const DEFAULT_IDLE_END_HOUR = 7;

// Half-open interval: 03:00 <= time < 07:00, never 07:00 or later.
export function inIdleWindow(hour, start = DEFAULT_IDLE_START_HOUR, end = DEFAULT_IDLE_END_HOUR) {
  return start < end ? hour >= start && hour < end : start > end ? hour >= start || hour < end : false;
}

export function windowDeadline(date = new Date(), timeZone = "Asia/Tehran", start = DEFAULT_IDLE_START_HOUR, end = DEFAULT_IDLE_END_HOUR) {
  const local = localClock(date, timeZone);
  if (!inIdleWindow(local.hour, start, end)) return date.getTime();
  // Re-evaluate wall time each minute, including zones with daylight-saving changes.
  let time = date.getTime() - date.getMilliseconds() - local.second * 1000;
  for (let minute = 0; minute <= 25 * 60; minute++, time += 60_000) {
    if (!inIdleWindow(localClock(new Date(time), timeZone).hour, start, end)) return time;
  }
  return date.getTime();
}

export function assessCapacity(ready, loadAverage, limits = {}) {
  if (!ready || ready.status !== "ready") return { idle: false, reason: "Application is not ready" };
  const checks = [
    [Number(ready.recentRequests5m), limits.requests ?? 12, "Traffic"],
    [Number(ready.activeRooms ?? ready.rooms), limits.rooms ?? 1, "Active rooms"],
    [Number(ready.memoryMb?.rss), limits.memory ?? 1350, "Application memory"],
    [loadAverage, limits.load ?? 1.25, "Host load"],
  ];
  for (const [value, limit, name] of checks) {
    if (!Number.isFinite(value) || value > limit) return { idle: false, reason: `${name} unavailable or above idle limit` };
  }
  return { idle: true, reason: "Application and host are idle" };
}

export const DAILY_JOBS = [
  { id: "news", script: "scripts/scrape-vod-news.mjs", minutes: 5 },
  { id: "imdb-trending", script: "scripts/refresh-imdb-trending.mjs", minutes: 8 },
  { id: "video", script: "scripts/sync-vod-catalog.mjs", minutes: 40 },
  { id: "f2my", script: "scripts/scrape-f2my-catalog.mjs", minutes: 25, args: ["--skip-imdb-lookup", "--concurrency=1", "--archive-concurrency=1", "--limit=80"] },
  { id: "curated-video", script: "scripts/refresh-curated-vod.mjs", minutes: 15 },
  { id: "public-archives", script: "scripts/refresh-public-archives.mjs", minutes: 8 },
  { id: "releases", script: "scripts/release-monitor.mjs", minutes: 5 },
  { id: "music", script: "scripts/daily-music-refresh.mjs", minutes: 70 },
];
