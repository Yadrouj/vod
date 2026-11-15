import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { buildWeekendV3Plan, BRAND_IPA } from '../marketing/weekend-v3-plan.mjs';
import { voiceRequest } from '../marketing/openrouter-voice.mjs';
import { createWeekendScore } from '../marketing/weekend-score.mjs';

const base = JSON.parse(await readFile(new URL('../marketing/weekend-plan.json', import.meta.url), 'utf8'));

test('fast ad nearly halves the long edit, keeps continuous scene/voice windows and truthful free-feature claims', () => {
  const plan = buildWeekendV3Plan(base);
  assert.equal(plan.duration, 18); assert.ok(plan.duration / 33 < .55);
  assert.equal(base.duration, 30); assert.equal(plan.fontFamily, 'Alibaba');
  assert.equal(plan.voice.model, 'elevenlabs/eleven-v4'); assert.equal(plan.voice.name, 'jessica');
  assert.equal(plan.motion.style, 'punchy'); assert.ok(plan.motion.transitionSeconds < .3);
  assert.equal(plan.score.bpm, 150); assert.equal(plan.narrationTempo, 1.09);
  let cursor = 0;
  for (const scene of plan.scenes) {
    assert.equal(scene.start, cursor); assert.ok(scene.end > scene.start);
    assert.ok(scene.voiceStart >= scene.start && scene.voiceEnd <= scene.end);
    assert.ok(scene.caption && scene.spoken && scene.display.length);
    cursor = scene.end;
  }
  assert.equal(cursor, plan.duration); assert.equal(plan.claimScope, base.claimScope);
  assert.ok(plan.coverTime < plan.scenes[0].end);
});

test('brand pronunciation is explicit, spoken text is separate from readable captions and unsupported speed is absent', () => {
  const plan = buildWeekendV3Plan(base), final = plan.scenes.at(-1), body = voiceRequest(plan, 5);
  assert.equal(plan.pronunciation.romanization, 'sarv-nema'); assert.match(BRAND_IPA, /^\/.*v.*\/$/);
  assert.ok(body.input.includes(final.ttsText)); assert.ok(!body.input.includes('سَرو نِما'));
  assert.ok(body.input.includes('/sæɾv/ /neˈmɒː/'));
  assert.ok(body.provider.options.elevenlabs.previous_text.includes('درخت سَرو'));
  assert.equal(final.audioTags, '[excited]');
  assert.ok(final.caption.startsWith('سرونما'));
  assert.ok(!JSON.stringify(body).includes('speed'));
  assert.equal(voiceRequest(plan, 4).provider.options.elevenlabs.next_text, final.ttsText);
});

test('150 BPM ad music really changes its rhythm, not just its metadata', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sarvnema-weekend-v3-')), file = path.join(dir, 'score.wav');
  t.after(async () => { await unlink(file); await rmdir(dir); });
  const result = await createWeekendScore(file, 2, 8000, { hype: true, bpm: 150, cuts: [1.2] }), bytes = await readFile(file);
  assert.equal(result.bpm, 150); assert.equal(result.externalSamples, false);
  assert.equal(bytes.length, 44 + 16000 * 4); assert.equal(bytes.readInt16LE(44), 0);
  await createWeekendScore(file, 2, 8000, { hype: true, bpm: 150, cuts: [1.2] }); assert.deepEqual(await readFile(file), bytes);
  await createWeekendScore(file, 2, 8000, { hype: true, bpm: 120, cuts: [1.2] }); assert.notDeepEqual(await readFile(file), bytes);
  await assert.rejects(createWeekendScore(file, 2, 8000, { bpm: 0 }), /BPM/);
});
