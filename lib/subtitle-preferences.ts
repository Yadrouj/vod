export type SubtitleAppearance = { size: number; color: string; textOpacity: number; background: string; backgroundOpacity: number };
export const DEFAULT_SUBTITLE_APPEARANCE: SubtitleAppearance = { size: 100, color: "#ffffff", textOpacity: 100, background: "#000000", backgroundOpacity: 65 };

export function normalizeSubtitleAppearance(value: Partial<SubtitleAppearance> | null): SubtitleAppearance {
  const number = (n: unknown, fallback: number, min: number, max: number) => typeof n === "number" && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  const color = (s: unknown, fallback: string) => typeof s === "string" && /^#[a-f\d]{6}$/i.test(s) ? s : fallback;
  const defaults = DEFAULT_SUBTITLE_APPEARANCE;
  return { size: number(value?.size, defaults.size, 75, 175), color: color(value?.color, defaults.color), textOpacity: number(value?.textOpacity, defaults.textOpacity, 20, 100), background: color(value?.background, defaults.background), backgroundOpacity: number(value?.backgroundOpacity, defaults.backgroundOpacity, 0, 100) };
}

export function subtitleColor(hex: string, opacity: number) {
  return `${hex}${Math.round(opacity * 2.55).toString(16).padStart(2, "0")}`;
}

export function subtitleOffset(value: number) {
  return Number.isFinite(value) ? Math.round(Math.min(120, Math.max(-120, value)) * 10) / 10 : 0;
}

/** Preserve original timestamps: repeated adjustments must never accumulate. */
export function shiftNativeCues(track: TextTrack, offset: number, originals: Map<TextTrackCue, { start: number; end: number }>) {
  for (const cue of Array.from(track.cues ?? [])) {
    const original = originals.get(cue) ?? { start: cue.startTime, end: cue.endTime };
    originals.set(cue, original);
    const start = Math.max(0, original.start + offset);
    const end = Math.max(start + .05, original.end + offset);
    // Assign the end first when moving forward so intermediate ranges stay valid.
    if (end > cue.endTime) cue.endTime = end;
    cue.startTime = start;
    cue.endTime = end;
  }
}
