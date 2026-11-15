import assert from 'node:assert/strict';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { voiceRequest } from './openrouter-voice.mjs';

// Select existing generated audio, with no API calls or credentials.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.resolve(root, process.env.WEEKEND_V3_OUTPUT || '.media-cache/marketing/sarvnema-weekend-v3');
const index = process.argv[2] || '1'; assert.match(index, /^[1-3]$/);
const plan = JSON.parse(await readFile(path.join(output, 'render-plan.json'), 'utf8'));
const candidate = JSON.parse(await readFile(path.join(output, 'voice', `brand-candidate-${index}.json`), 'utf8'));
const body = voiceRequest(plan, plan.scenes.length - 1);
assert.deepEqual(body, candidate.body, 'Plan must exactly match the selected generated take');
assert.equal(createHash('sha256').update(JSON.stringify(body)).digest('hex'), candidate.signature);
const scene = plan.scenes.at(-1);
const record = { scene: scene.id, model: plan.voice.model, provider: 'OpenRouter / ElevenLabs', voice: plan.voice.name, gender: 'female', synthetic: true, text: scene.spoken, ttsText: scene.ttsText, audioTags: scene.audioTags, generationId: candidate.generationId, signature: candidate.signature, file: 'outro.mp3' };
await copyFile(path.join(output, 'voice', candidate.file), path.join(output, 'voice', 'outro.mp3'));
await writeFile(path.join(output, 'voice', 'outro.json'), JSON.stringify(record, null, 2) + '\n');
const manifestPath = path.join(output, 'voice', 'manifest.json'), manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const pricePerCharacter = manifest.estimatedUSD / manifest.characters;
manifest.clips = manifest.clips.map(clip => clip.scene === scene.id ? record : clip);
manifest.characters = plan.scenes.reduce((sum, _, i) => sum + [...voiceRequest(plan, i).input].length, 0);
manifest.estimatedUSD = manifest.characters * pricePerCharacter;
manifest.extraReviewCallsNotIncludedInEstimate = true;
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
await writeFile(path.join(output, 'pronunciation-review.json'), JSON.stringify({ model: 'elevenlabs/scribe-v2', text: candidate.transcript, pronunciation: plan.pronunciation, generationId: candidate.generationId, note: 'Selected take: independent unprompted ASR recognized sarv/nema without a conjunction; not a human-listening guarantee' }, null, 2) + '\n');
console.log(`SELECTED BRAND TAKE ${index}: ${candidate.transcript}`);
