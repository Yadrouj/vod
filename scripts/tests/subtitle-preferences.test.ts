import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SUBTITLE_APPEARANCE, normalizeSubtitleAppearance, shiftNativeCues, subtitleColor, subtitleOffset } from "../../lib/subtitle-preferences";

test("stored appearance accepts only valid colors and bounded finite values", () => {
  assert.deepEqual(normalizeSubtitleAppearance(null), DEFAULT_SUBTITLE_APPEARANCE);
  assert.deepEqual(normalizeSubtitleAppearance({ size: 900, color: "red;}body{display:none}", textOpacity: NaN, backgroundOpacity: -4 }), { ...DEFAULT_SUBTITLE_APPEARANCE, size: 175, backgroundOpacity: 0 });
  assert.equal(subtitleColor("#ffcc00", 0), "#ffcc0000");
  assert.equal(subtitleColor("#ffffff", 100), "#ffffffff");
});

test("embedded subtitle offsets are absolute, reversible, and never accumulate", () => {
  const cue = { startTime: 4, endTime: 7 } as TextTrackCue;
  const track = { cues: [cue] } as unknown as TextTrack;
  const originals = new Map<TextTrackCue, { start: number; end: number }>();
  shiftNativeCues(track, .5, originals);
  shiftNativeCues(track, .5, originals);
  assert.deepEqual([cue.startTime, cue.endTime], [4.5, 7.5]);
  shiftNativeCues(track, -8, originals);
  assert.deepEqual([cue.startTime, cue.endTime], [0, .05]);
  shiftNativeCues(track, 0, originals);
  assert.deepEqual([cue.startTime, cue.endTime], [4, 7]);
  assert.equal(subtitleOffset(.3000000004), .3);
  assert.equal(subtitleOffset(Infinity), 0);
});
