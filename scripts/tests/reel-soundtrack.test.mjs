import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, unlink, rmdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSoundtrack } from '../marketing/original-soundtrack.mjs';

test('original reel score produces deterministic, non-clipping stereo PCM with fades', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sarvnema-reel-'));
  const file = path.join(dir, 'score.wav');
  t.after(async () => { await unlink(file); await rmdir(dir); });
  const result = await createSoundtrack(file, 1, 8000);
  const bytes = await readFile(file);
  assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
  assert.equal(bytes.subarray(8, 12).toString(), 'WAVE');
  assert.equal(bytes.readUInt16LE(22), 2); assert.equal(bytes.readUInt32LE(24), 8000);
  assert.equal(bytes.length, 44 + 8000 * 4); assert.equal(result.duration, 1);
  let peak = 0, energy = 0, stereo = false;
  for (let i = 44; i < bytes.length; i += 4) {
    const left = bytes.readInt16LE(i), right = bytes.readInt16LE(i + 2);
    peak = Math.max(peak, Math.abs(left), Math.abs(right)); energy += left * left + right * right; stereo ||= left !== right;
  }
  assert.ok(peak > 1000 && peak < 32767 && energy > 1e8 && stereo);
  assert.equal(bytes.readInt16LE(44), 0);
  await createSoundtrack(file, 1, 8000);
  assert.deepEqual(await readFile(file), bytes);
});
