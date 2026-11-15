import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildWeekendV4Plan } from '../marketing/weekend-v4-plan.mjs';
import { continuousVoiceRequest, requestWordTranscript } from '../marketing/openrouter-continuous.mjs';
import { alignContinuousPlan } from '../marketing/align-continuous-voice.mjs';

const base = JSON.parse(await readFile(new URL('../marketing/weekend-plan.json', import.meta.url), 'utf8'));
const expected = ['آخَرِ هفته‌ست. آماده‌ای؟', 'خانواده، یا پارتنرت.', 'وقتِ فیلم دیدنه!', 'یه لینک بفرست؛ از هر جا، با هم ببینید!', 'تماشای همزمان اونم رایگان!', 'سَرونِما! ........همین الان شروع کن!'];

test('male edition preserves the user script, brand phonemes and a single expressive take without speeding it', () => {
  const plan = buildWeekendV4Plan(base), request = continuousVoiceRequest(plan);
  assert.deepEqual(plan.scenes.map(scene => scene.spoken), expected);
  assert.equal(base.duration, 30); assert.equal(plan.voice.name, 'brian'); assert.equal(plan.voice.gender, 'male');
  assert.equal(plan.narration.mode, 'continuous'); assert.equal(plan.narrationTempo, 1);
  assert.equal(request.voice, 'brian'); assert.equal(request.model, 'elevenlabs/eleven-v4');
  assert.match(request.input, /\[curious\].*\[playfully\].*\[excited\].*\[rushed\]/);
  assert.ok(request.input.includes('/sæɾv/ /neˈmɒː/! ... [confident] همین الان شروع کن!'));
  const options = request.provider.options.elevenlabs;
  assert.ok(!('previous_text' in options) && !('next_text' in options));
  assert.ok(!JSON.stringify(request).includes('speed')); assert.ok(!request.input.includes('[laughing]'));
  assert.equal(plan.claimScope, base.claimScope); assert.equal(plan.fontFamily, 'Alibaba');
});

const words = [
  ['آخر', .1, .38], ['هفته‌ست.', .5, 1.24], ['آماده‌ای؟', 1.58, 2.12],
  ['خانواده', 2.64, 3.44], ['یا', 3.7, 3.86], ['پارتنرت.', 3.94, 4.74],
  ['وقت', 5.08, 5.32], ['فیلم', 5.52, 5.78], ['دیدنه.', 5.84, 6.38],
  ['یه', 6.76, 6.84], ['لینک', 6.88, 7.1], ['بفرست', 7.14, 7.62],
  ['از', 8.02, 8.16], ['هر', 8.24, 8.46], ['جا', 8.5, 8.84], ['با', 8.86, 8.94], ['هم', 8.98, 9.14], ['ببینید.', 9.16, 9.6],
  ['تماشای', 9.88, 10.38], ['همزمان،', 10.52, 11.28], ['اونم', 11.38, 11.66], ['رایگان.', 11.74, 12.4],
  ['سرونما', 12.82, 13.46], ['همین', 13.94, 14.18], ['الان', 14.24, 14.44], ['شروع', 14.5, 14.72], ['کن', 14.78, 14.98],
].map(([word, start, end]) => ({ word, start, end }));

test('scene alignment follows actual words, preserving pauses and the complete audio with CTA reading time', () => {
  const original = buildWeekendV4Plan(base), plan = alignContinuousPlan(original, { words }, 15.15);
  assert.equal(original.duration, 22); assert.equal(plan.duration, 18);
  assert.equal(plan.narration.alignment.tempo, 1); assert.equal(plan.narration.alignment.words, 27);
  let cursor = 0;
  for (const scene of plan.scenes) {
    assert.equal(scene.start, cursor); assert.ok(scene.voiceStart >= scene.start && scene.voiceEnd <= scene.end);
    assert.ok(scene.voiceEnd > scene.voiceStart); cursor = scene.end;
  }
  assert.equal(cursor, plan.duration); assert.ok(plan.duration - plan.narration.start - 15.15 > 2);
  assert.ok(plan.scenes[3].start < 7 && plan.scenes[3].end === 10);
  const pause = words[23].start - words[22].end; assert.ok(pause > .4 && pause < .6);
  assert.throws(() => alignContinuousPlan(original, { words: words.filter(word => word.word !== 'خانواده') }, 15.15), /Missing narration anchor/);
  assert.throws(() => alignContinuousPlan(original, { words: [...words].reverse() }, 15.15), /chronological/);
});

test('word timing request is bounded, unprompted and redacts remote or transport failure details', async () => {
  const bytes = Buffer.alloc(2000, 1), key = 'mock-key-not-real';
  const result = await requestWordTranscript(bytes, key, async (url, init) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/audio/transcriptions');
    const body = JSON.parse(init.body); assert.equal(body.model, 'elevenlabs/scribe-v2');
    assert.equal(body.input_audio.format, 'ogg'); assert.equal(body.response_format, 'verbose_json');
    assert.deepEqual(body.timestamp_granularities, ['word']); assert.ok(!body.prompt && !body.language);
    return Response.json({ text: expected.join(' '), words, duration: 15.12, usage: { seconds: 15.12 } });
  }, 'ogg');
  assert.equal(result.words.length, 27); assert.ok(!JSON.stringify(result).includes(key));
  await assert.rejects(requestWordTranscript(bytes, key, async () => new Response(key, { status: 502 })), error => /HTTP 502/.test(error.message) && !error.message.includes(key));
  await assert.rejects(requestWordTranscript(bytes, key, async () => { throw Error(key); }), error => /transport failed/.test(error.message) && !error.message.includes(key));
  await assert.rejects(requestWordTranscript(Buffer.alloc(1), key), /short campaign/);
});
