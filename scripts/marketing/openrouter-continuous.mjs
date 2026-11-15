import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { voiceRequest, requestSpeech, VOICE_MODEL } from './openrouter-voice.mjs';

export function continuousVoiceRequest(plan) {
  assert.equal(plan.narration.mode, 'continuous');
  const body = voiceRequest(plan, 0);
  body.input = plan.narration.input;
  delete body.provider.options.elevenlabs.previous_text;
  delete body.provider.options.elevenlabs.next_text;
  return body;
}

export async function requestWordTranscript(bytes, key, fetcher = fetch, format = 'mp3') {
  assert.ok(bytes.length > 1500 && bytes.length < 1_000_000, 'Only a short campaign narration may be transcribed');
  let response;
  try {
    response = await fetcher('https://openrouter.ai/api/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'elevenlabs/scribe-v2', input_audio: { data: bytes.toString('base64'), format }, response_format: 'verbose_json', timestamp_granularities: ['word'] }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch { throw Error('Narration transcription transport failed'); }
  if (!response.ok) throw Error(`Narration transcription HTTP ${response.status}`);
  const result = await response.json();
  assert.ok(typeof result.text === 'string' && result.text.length > 50, 'Expected full narration transcription');
  assert.ok(Array.isArray(result.words) && result.words.length > 15, 'Expected word timestamps for scene synchronization');
  return { text: result.text, words: result.words, duration: result.duration, usage: result.usage };
}

export async function generateContinuousVoice(output, plan, key) {
  const catalogue = await fetch('https://openrouter.ai/api/v1/models?output_modalities=speech', { signal: AbortSignal.timeout(25_000) }).then(response => response.json());
  const model = catalogue.data?.find(model => model.id === VOICE_MODEL);
  assert.ok(model?.supported_voices.includes(plan.voice.name), 'Requested voice must be advertised by OpenRouter');
  const body = continuousVoiceRequest(plan), characters = [...body.input].length, estimatedUSD = characters * Number(model.pricing.prompt);
  assert.ok(estimatedUSD > 0 && estimatedUSD <= .2, 'Stop if narration estimate exceeds $0.20');
  console.log(JSON.stringify({ model: VOICE_MODEL, voice: plan.voice.name, gender: plan.voice.gender, characters, estimatedUSD }));
  const dir = path.join(output, 'voice'); await mkdir(dir, { recursive: true });
  const signature = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const file = path.join(dir, 'narration.mp3'), metadata = path.join(dir, 'narration.json');
  let record; try { record = JSON.parse(await readFile(metadata, 'utf8')); } catch { /* No verified cache. */ }
  if (record?.signature !== signature || !((await stat(file).catch(() => null))?.size > 1500)) {
    const result = await requestSpeech(body, key);
    record = { model: VOICE_MODEL, provider: 'OpenRouter / ElevenLabs', voice: plan.voice.name, gender: plan.voice.gender, synthetic: true, continuous: true, generationId: result.generationId, signature, file: 'narration.mp3', input: body.input, characters, estimatedUSD };
    await writeFile(file, result.bytes); await writeFile(metadata, JSON.stringify(record, null, 2) + '\n');
    console.log('CONTINUOUS MALE NARRATION GENERATED');
  } else console.log('CONTINUOUS NARRATION CACHED');
  const transcriptFile = path.join(dir, 'narration-transcript.json');
  let transcript; try { transcript = JSON.parse(await readFile(transcriptFile, 'utf8')); } catch { /* No verified cache. */ }
  if (transcript?.signature !== signature) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const binaries = path.join(root, '.media-cache/reel-tools/python/imageio_ffmpeg/binaries');
    const ffmpeg = process.env.FFMPEG_BINARY || path.join(binaries, (await readdir(binaries)).find(name => /^ffmpeg.*\.exe$/.test(name)));
    const compressed = path.join(dir, 'narration-stt.ogg');
    await promisify(execFile)(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', file, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'libopus', '-b:a', '20k', '-application', 'voip', compressed], { windowsHide: true });
    transcript = { ...await requestWordTranscript(await readFile(compressed), key, fetch, 'ogg'), signature, note: 'Unprompted ASR for text/word timing; not a human assessment of intonation or accent' };
    await writeFile(transcriptFile, JSON.stringify(transcript, null, 2) + '\n');
  }
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify({ ...record, transcript: 'narration-transcript.json' }, null, 2) + '\n');
  console.log(`NARRATION TRANSCRIPT: ${transcript.text}`);
}
