const DEFAULT_TIME_ZONE = "Asia/Tehran";
const DEFAULT_START_HOUR = 10;
const DEFAULT_END_HOUR = 22;

function boundedHour(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 23 ? number : fallback;
}

export function scheduleConfig(env = process.env) {
  const startHour = boundedHour(env.TELEGRAM_CHANNEL_START_HOUR, DEFAULT_START_HOUR);
  const endHour = boundedHour(env.TELEGRAM_CHANNEL_END_HOUR, DEFAULT_END_HOUR);
  return {
    timeZone: env.TELEGRAM_CHANNEL_TIME_ZONE || DEFAULT_TIME_ZONE,
    startHour: Math.min(startHour, endHour),
    endHour: Math.max(startHour, endHour),
  };
}

export function tehranClock(value = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    hour,
    minute,
    weekday: get("weekday"),
    isoLocal: `${get("year")}-${get("month")}-${get("day")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

export function publishingSlot(type, value = new Date(), config = scheduleConfig()) {
  const clock = tehranClock(value, config.timeZone);
  const isMusic = type === "music";
  const inHourRange = clock.hour >= config.startHour && clock.hour <= config.endHour;
  // The final half-hour is outside a 10:00–22:00 window. The final valid
  // slot is therefore 22:00, with a small catch-up period until 22:29.
  const inFinalHour = clock.hour === config.endHour && clock.minute >= 30;
  if (!inHourRange || inFinalHour) return null;
  // The hour mark belongs to film/series and the midpoint belongs to music,
  // so the channel never receives two posts at the same time.
  if (isMusic) return clock.minute >= 30
    ? `${clock.dateKey}:${String(clock.hour).padStart(2, "0")}:30`
    : null;
  return clock.minute < 30
    ? `${clock.dateKey}:${String(clock.hour).padStart(2, "0")}`
    : null;
}

export function publishingWindow(value = new Date(), config = scheduleConfig()) {
  const clock = tehranClock(value, config.timeZone);
  return {
    timeZone: config.timeZone,
    startHour: config.startHour,
    endHour: config.endHour,
    clock,
    vod: publishingSlot("vod", value, config),
    music: publishingSlot("music", value, config),
  };
}

export function hasPublishedSlot(state, type, slot) {
  return Boolean(slot && state?.publishedSlots?.[type]?.[slot]);
}

export function recordPublishedSlot(state, type, slot, entry) {
  if (!slot) return state;
  state.publishedSlots ??= { vod: {}, music: {} };
  state.publishedSlots[type] ??= {};
  state.publishedSlots[type][slot] = entry;
  return state;
}

export function sortVodEventsByTrend(events, trendRanks = new Map()) {
  return [...events].sort((a, b) => {
    const aRank = trendRanks.get(a.event.imdbCode) ?? Number.POSITIVE_INFINITY;
    const bRank = trendRanks.get(b.event.imdbCode) ?? Number.POSITIVE_INFINITY;
    if (aRank !== bRank) return aRank - bRank;
    const aRating = Number(a.event.imdbRating ?? a.event.rating);
    const bRating = Number(b.event.imdbRating ?? b.event.rating);
    if (Number.isFinite(aRating) && Number.isFinite(bRating) && aRating !== bRating) return bRating - aRating;
    if (Number.isFinite(aRating) !== Number.isFinite(bRating)) return Number.isFinite(bRating) ? 1 : -1;
    return String(b.event.eventAt ?? "").localeCompare(String(a.event.eventAt ?? ""));
  });
}

