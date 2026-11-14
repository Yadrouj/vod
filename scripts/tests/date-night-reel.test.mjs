import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createDateNightScore } from '../marketing/date-night-score.mjs';

test('date-night reel has six continuous scenes and bounded Persian narration', async () => {
  const plan = JSON.parse(await readFile(new URL('../marketing/date-night-plan.json', import.meta.url), 'utf8'));
  assert.equal(plan.duration, 36); assert.equal(plan.fps, 30);
  assert.equal(plan.scenes.length, 6); assert.equal(plan.voice.name, 'fa-IR-FaridNeural'); assert.equal(plan.voice.synthetic, true);
  let cursor = 0;
  for (const scene of plan.scenes) {
    assert.equal(scene.start, cursor); assert.ok(scene.end > scene.start);
    assert.ok(scene.voiceStart >= scene.start && scene.voiceEnd <= scene.end && scene.voiceEnd > scene.voiceStart);
    assert.ok(scene.spoken.length > 10 && scene.caption.length > 10); cursor = scene.end;
  }
  assert.equal(cursor, plan.duration);
  assert.deepEqual(plan.films.map(film => film.id), ['tt33764258', 'tt12042730']);
  assert.ok(plan.films[0].availability.includes('2026-11-17'));
  assert.match(plan.claimScope, /only.*watch-together/);
  const html = await readFile(new URL('../marketing/date-night-reel.html', import.meta.url), 'utf8');
  assert.ok(html.includes('۱۷ نوامبر') && html.includes('قابلیت تماشای همزمان'));
  assert.ok(html.includes('window.renderFrame') && html.includes('روایت با صدای مصنوعی فارسی'));
});

test('cinematic rhythmic score is original deterministic non-clipping stereo PCM', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sarvnema-date-night-'));
  const file = path.join(dir, 'score.wav'); t.after(async () => { await unlink(file); await rmdir(dir); });
  const result = await createDateNightScore(file, 2, 8000), bytes = await readFile(file);
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
  await createDateNightScore(file, 2, 8000); assert.deepEqual(await readFile(file), bytes);
});
