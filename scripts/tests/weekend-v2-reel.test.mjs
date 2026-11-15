import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { buildWeekendV2Plan } from '../marketing/weekend-v2-plan.mjs';
import { VOICE_MODEL, voiceRequest, requestSpeech } from '../marketing/openrouter-voice.mjs';
import { createWeekendScore } from '../marketing/weekend-score.mjs';

const base = JSON.parse(await readFile(new URL('../marketing/weekend-plan.json', import.meta.url), 'utf8'));

test('female Alibaba edition keeps the original intact and fits all measured voice clips without rushing', () => {
  const plan = buildWeekendV2Plan(base);
  assert.equal(base.duration, 30); assert.equal(base.voice.name, 'fa-IR-FaridNeural');
  assert.equal(plan.duration, 33); assert.equal(plan.fontFamily, 'Alibaba'); assert.equal(plan.template, 'weekend');
  assert.deepEqual(plan.voice, { provider: 'openrouter', model: VOICE_MODEL, name: 'jessica', gender: 'female', synthetic: true });
  const measuredSeconds = [2.59, 4.6, 6.03, 4.83, 3.71, 6.03];
  let cursor = 0;
  for (const [i, scene] of plan.scenes.entries()) {
    assert.equal(scene.start, cursor); assert.ok(scene.end > scene.start);
    assert.ok(scene.voiceStart >= scene.start && scene.voiceEnd <= scene.end);
    assert.ok(scene.voiceEnd - scene.voiceStart - .06 >= measuredSeconds[i]);
    assert.ok(scene.audioTags.includes('[')); cursor = scene.end;
  }
  assert.equal(cursor, plan.duration); assert.equal(plan.claimScope, base.claimScope);
  assert.throws(() => buildWeekendV2Plan({ ...base, scenes: [] }));
});

test('v4 request uses expressive inline tags and adjacent context, never unsupported speed or a fallback model', () => {
  const plan = buildWeekendV2Plan(base), body = voiceRequest(plan, 1);
  assert.equal(body.model, 'elevenlabs/eleven-v4'); assert.equal(body.voice, 'jessica'); assert.equal(body.response_format, 'mp3');
  assert.match(body.input, /^\[warmly\] \[cheerfully\]/);
  const options = body.provider.options.elevenlabs;
  assert.equal(options.language_code, 'fa'); assert.equal(options.previous_text, plan.scenes[0].spoken);
  assert.equal(options.next_text, plan.scenes[2].spoken); assert.equal(options.voice_settings.style, .55);
  assert.ok(!JSON.stringify(body).includes('speed'));
  assert.ok(!('previous_text' in voiceRequest(plan, 0).provider.options.elevenlabs));
  assert.ok(!('next_text' in voiceRequest(plan, 5).provider.options.elevenlabs));
  assert.throws(() => voiceRequest({ ...plan, voice: { ...plan.voice, model: 'other' } }, 0));
});

test('speech transport returns only audio and safe generation metadata; API failures do not echo credentials', async () => {
  const body = voiceRequest(buildWeekendV2Plan(base), 0), key = 'mock-credential-not-real';
  let calls = 0;
  const result = await requestSpeech(body, key, async (url, init) => {
    calls++; assert.equal(url, 'https://openrouter.ai/api/v1/audio/speech');
    assert.equal(init.headers.Authorization, `Bearer ${key}`); assert.equal(init.method, 'POST');
    assert.equal(JSON.parse(init.body).model, VOICE_MODEL);
    return new Response(Buffer.alloc(2000, 1), { headers: { 'content-type': 'audio/mpeg', 'x-generation-id': 'mock-gen' } });
  });
  assert.equal(calls, 1); assert.equal(result.bytes.length, 2000); assert.equal(result.generationId, 'mock-gen');
  assert.equal(JSON.stringify(result).includes(key), false);
  await assert.rejects(requestSpeech(body, key, async () => new Response(`remote echoed ${key}`, { status: 401 })), error => error.message.includes('HTTP 401') && !error.message.includes(key));
  await assert.rejects(requestSpeech(body, key, async () => { throw Error(`unsafe transport ${key}`); }), error => error.message.includes('transport failed') && !error.message.includes(key));
  await assert.rejects(requestSpeech(body, key, async () => new Response('{}', { headers: { 'content-type': 'application/json' } })), /Expected audio/);
  await assert.rejects(requestSpeech(body, key, async () => new Response(Buffer.alloc(10), { headers: { 'content-type': 'audio/mpeg' } })), /bounded narration/);
});

test('hyped original score is deterministic stereo, stays below clipping, and follows custom scene cuts', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sarvnema-weekend-v2-')), file = path.join(dir, 'score.wav');
  t.after(async () => { await unlink(file); await rmdir(dir); });
  const result = await createWeekendScore(file, 2, 8000, { hype: true, cuts: [1] }), bytes = await readFile(file);
  assert.equal(result.hype, true); assert.equal(result.externalSamples, false); assert.equal(result.bpm, 120);
  assert.equal(bytes.length, 44 + 16000 * 4); assert.equal(bytes.readInt16LE(44), 0);
  let peak = 0, stereo = false;
  for (let i = 44; i < bytes.length; i += 4) {
    const left = bytes.readInt16LE(i), right = bytes.readInt16LE(i + 2);
    peak = Math.max(peak, Math.abs(left), Math.abs(right)); stereo ||= left !== right;
  }
  assert.ok(peak > 1000 && peak < 32767 && stereo);
  await createWeekendScore(file, 2, 8000, { hype: true, cuts: [1] }); assert.deepEqual(await readFile(file), bytes);
  await createWeekendScore(file, 2, 8000, { hype: true, cuts: [1.5] }); assert.notDeepEqual(await readFile(file), bytes);
  await createWeekendScore(file, 2, 8000); assert.notDeepEqual(await readFile(file), bytes);
});
