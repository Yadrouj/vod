import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createWeekendScore } from '../marketing/weekend-score.mjs';

test('weekend story has six continuous scenes, family/partner framing and a distinct palette', async () => {
  const plan = JSON.parse(await readFile(new URL('../marketing/weekend-plan.json', import.meta.url), 'utf8'));
  assert.equal(plan.duration, 30); assert.equal(plan.fps, 30);
  assert.deepEqual(plan.scenes.map(scene => scene.id), ['hook', 'family', 'couple', 'together', 'free', 'outro']);
  assert.equal(plan.voice.name, 'fa-IR-FaridNeural'); assert.equal(plan.voice.synthetic, true);
  let cursor = 0;
  for (const scene of plan.scenes) {
    assert.equal(scene.start, cursor); assert.ok(scene.end > scene.start);
    assert.ok(scene.voiceStart >= scene.start && scene.voiceEnd <= scene.end && scene.voiceEnd > scene.voiceStart);
    assert.ok(scene.spoken.length > 10 && scene.caption.length > 10); cursor = scene.end;
  }
  assert.equal(cursor, plan.duration); assert.ok(plan.palette.includes('#ff2799') && plan.palette.includes('#46e9ec'));
  assert.match(plan.claimScope, /only.*watch-together/);
  assert.ok(plan.instagramCaption.includes('سن و سلیقه') && plan.instagramCaption.includes('خیالی'));
  const html = await readFile(new URL('../marketing/weekend-reel.html', import.meta.url), 'utf8');
  assert.ok(html.includes('data-in="iris"') && html.includes('data-in="vertical"') && html.includes('data-in="horizontal"'));
  assert.ok(html.includes('window.renderFrame') && html.includes('هوش مصنوعی'));
  assert.ok(html.includes('/assets/family.png') && html.includes('/assets/couple.png'));
  const prompts = JSON.parse(await readFile(new URL('../marketing/weekend-image-prompts.json', import.meta.url), 'utf8'));
  assert.equal(prompts.mode, 'built-in image_gen'); assert.deepEqual(Object.keys(prompts.prompts), ['family', 'couple']);
});

test('original upbeat soundtrack is deterministic non-clipping stereo with clean fades', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sarvnema-weekend-'));
  const file = path.join(dir, 'score.wav'); t.after(async () => { await unlink(file); await rmdir(dir); });
  const result = await createWeekendScore(file, 2, 8000), bytes = await readFile(file);
  assert.equal(result.bpm, 120); assert.equal(result.externalSamples, false);
  assert.equal(bytes.subarray(0, 4).toString(), 'RIFF'); assert.equal(bytes.readUInt16LE(22), 2);
  assert.equal(bytes.length, 44 + 16000 * 4); assert.equal(bytes.readInt16LE(44), 0);
  let energy = 0, peak = 0, stereo = false;
  for (let i = 44; i < bytes.length; i += 4) {
    const left = bytes.readInt16LE(i), right = bytes.readInt16LE(i + 2);
    energy += left * left + right * right; peak = Math.max(peak, Math.abs(left), Math.abs(right)); stereo ||= left !== right;
  }
  assert.ok(energy > 1e8 && peak < 32767 && stereo);
  assert.ok(Math.abs(bytes.readInt16LE(bytes.length - 4)) < 100);
  await createWeekendScore(file, 2, 8000); assert.deepEqual(await readFile(file), bytes);
});
