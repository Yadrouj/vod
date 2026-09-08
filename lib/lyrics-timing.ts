export type LyricCue = { text: string; start?: number; end?: number };
export const MAX_LYRICS_BYTES = 64 * 1024;

/** LRC timing is evidence, plain text is not. Preserve repeated choruses. */
export function parseLrc(input: string): LyricCue[] {
  if (new TextEncoder().encode(input).length > MAX_LYRICS_BYTES) throw new Error("فایل متن باید کمتر از ۶۴ کیلوبایت باشد.");
  const offset = Math.max(-60_000, Math.min(60_000, Number(input.match(/\[offset:([+-]?\d+)\]/i)?.[1] ?? 0))) / 1000;
  const cues: LyricCue[] = [];
  for (const raw of input.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    if (/^\s*\[(?:ar|al|ti|by|offset|length|re|ve):/i.test(raw)) continue;
    const stamps = [...raw.matchAll(/\[(\d{1,3}):([0-5]\d)(?:[.:](\d{1,3}))?\]/g)];
    const text = raw.replace(/\[\d{1,3}:[0-5]\d(?:[.:]\d{1,3})?\]/g, "").trim().slice(0, 600);
    if (stamps.length) {
      for (const stamp of stamps) cues.push({ text, start: Math.max(0, Number(stamp[1]) * 60 + Number(stamp[2]) + Number(`0.${stamp[3] ?? 0}`) + offset) });
    } else if (text) cues.push({ text });
  }
  if (cues.length > 1200) throw new Error("تعداد سطرهای متن بیش از حد مجاز است.");
  return cues.every(cue => cue.start !== undefined) ? cues.sort((a, b) => a.start! - b.start!) : cues;
}

export function activeLyricIndex(cues: LyricCue[], time: number): number {
  if (!Number.isFinite(time)) return -1;
  let active = -1;
  for (let index = 0; index < cues.length; index++) {
    const cue = cues[index];
    if (cue.start !== undefined && cue.start <= time) {
      if (active < 0 || cue.start >= cues[active].start!) active = index;
    }
  }
  return active >= 0 && cues[active].text && (cues[active].end === undefined || time < cues[active].end!) ? active : -1;
}

export function geniusSearchUrl(title: string, artist: string) {
  return `https://genius.com/search?q=${encodeURIComponent(`${artist} ${title}`.trim().slice(0, 300))}`;
}
