import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getApprovedNarrator, getApprovedVoicePreset } from '../marketing/approved-voice-preset.mjs';
import { buildWeekendV4Plan } from '../marketing/weekend-v4-plan.mjs';
import { continuousVoiceRequest } from '../marketing/openrouter-continuous.mjs';

test('approved narrator keeps exact Brian generation settings, Persian pronunciation and continuous delivery', () => {
  const preset = getApprovedVoicePreset(), narrator = getApprovedNarrator();
  assert.equal(preset.id, 'sarvnema-fa-commercial-male');
  assert.equal(preset.approvedOn, '2026-11-16');
  assert.equal(narrator.preset, preset.id); assert.equal(narrator.model, 'elevenlabs/eleven-v4');
  assert.equal(narrator.name, 'brian'); assert.equal(narrator.gender, 'male');
  assert.deepEqual(narrator.generationOptions, { seed: 17, language_code: 'fa', voice_settings: { stability: .5, similarity_boost: .75, style: .55, use_speaker_boost: true } });
  assert.equal(preset.pronunciation.ipa, '/sæɾv/ /neˈmɒː/');
  assert.equal(preset.delivery.mode, 'continuous'); assert.equal(preset.delivery.postprocessTempo, 1);
  assert.match(preset.reference.audioSha256, /^[a-f0-9]{64}$/);
});

test('reusing a preset cannot mutate its approved settings for the next campaign', () => {
  const copy = getApprovedVoicePreset(); copy.voice.name = 'other'; copy.generationOptions.voice_settings.style = 1;
  copy.pronunciation.ipa = 'wrong'; copy.delivery.tags.push('[laughing]');
  const narrator = getApprovedNarrator(); narrator.generationOptions.seed = 9;
  const original = getApprovedVoicePreset();
  assert.equal(original.voice.name, 'brian'); assert.equal(original.generationOptions.voice_settings.style, .55);
  assert.equal(original.generationOptions.seed, 17); assert.equal(original.pronunciation.ipa, '/sæɾv/ /neˈmɒː/');
  assert.ok(!original.delivery.tags.includes('[laughing]'));
});

test('wiring the reusable preset into the approved ad leaves its full speech request hash unchanged', async () => {
  const base = JSON.parse(await readFile(new URL('../marketing/weekend-plan.json', import.meta.url), 'utf8'));
  const body = continuousVoiceRequest(buildWeekendV4Plan(base));
  assert.equal(createHash('sha256').update(JSON.stringify(body)).digest('hex'), getApprovedVoicePreset().reference.requestSha256);
  body.provider.options.elevenlabs.voice_settings.style = 1;
  assert.equal(getApprovedVoicePreset().generationOptions.voice_settings.style, .55);
});
