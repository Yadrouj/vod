import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const API = 'https://openrouter.ai/api/v1';
export const VOICE_MODEL = 'elevenlabs/eleven-v4';

export function voiceRequest(plan, sceneIndex) {
  assert.equal(plan.voice.model, VOICE_MODEL, 'This export requires Eleven v4, without model fallback');
  assert.ok(['female', 'male'].includes(plan.voice.gender), 'Voice gender must be explicitly declared');
  const scene = plan.scenes[sceneIndex];
  const options = { seed: 17, language_code: 'fa', voice_settings: { stability: .5, similarity_boost: .75, style: .55, use_speaker_boost: true } };
  if (scene.ttsPreviousText) options.previous_text = scene.ttsPreviousText;
  else if (sceneIndex) options.previous_text = plan.scenes[sceneIndex - 1].ttsText || plan.scenes[sceneIndex - 1].spoken;
  if (sceneIndex + 1 < plan.scenes.length) options.next_text = plan.scenes[sceneIndex + 1].ttsText || plan.scenes[sceneIndex + 1].spoken;
  return { model: VOICE_MODEL, input: `${scene.audioTags || '[excited]'} ${scene.ttsText || scene.spoken}`, voice: plan.voice.name, response_format: 'mp3', provider: { options: { elevenlabs: options } } };
}

export async function requestSpeech(body, key, fetcher = fetch) {
  assert.equal(body.model, VOICE_MODEL);
  let response;
  try {
    response = await fetcher(`${API}/audio/speech`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'SarvNema weekend ad voiceover' }, body: JSON.stringify(body), signal: AbortSignal.timeout(90_000) });
  } catch {
    throw Error('OpenRouter speech transport failed; no audio saved and no fallback used');
  }
  // Do not print remote error bodies or request headers: they may contain credentials.
  if (!response.ok) throw Error(`OpenRouter speech HTTP ${response.status}; no audio saved and no fallback used`);
  const type = response.headers.get('content-type') || '';
  assert.ok(type.includes('audio/'), 'Expected audio, not an error or text response');
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.length > 1500 && bytes.length < 5_000_000, 'Expected bounded narration audio');
  return { bytes, generationId: response.headers.get('x-generation-id') };
}

async function transientKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY.trim();
  assert.ok(process.argv.includes('--key-stdin'), 'Set OPENROUTER_API_KEY or use --key-stdin; never put the key in arguments or files');
  const input = process.stdin;
  if (input.isTTY) input.setRawMode(true);
  input.setEncoding('utf8'); input.resume();
  console.log('WAITING FOR TRANSIENT API KEY; terminal input echo disabled');
  return new Promise((resolve, reject) => {
    let value = '';
    const onData = chunk => {
      if (chunk.includes('\u0003')) { cleanup(); reject(Error('Cancelled')); return; }
      value += chunk;
      if (/[\r\n]/.test(value)) { cleanup(); resolve(value.trim()); value = ''; }
    };
    const cleanup = () => { input.off('data', onData); input.pause(); if (input.isTTY) input.setRawMode(false); };
    input.on('data', onData);
  });
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const key = await transientKey(); assert.ok(key, 'Empty API key');
  const auth = await fetch(`${API}/auth/key`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20_000) });
  console.log(`AUTH CHECK HTTP ${auth.status}`);
  if (!auth.ok) throw Error('OpenRouter authentication failed; no paid generation attempted');
  if (process.argv.includes('--auth-check')) return;
  const edition = process.argv.includes('--v4') ? 'v4' : process.argv.includes('--v3') ? 'v3' : 'v2';
  const output = path.resolve(root, process.env[`WEEKEND_${edition.toUpperCase()}_OUTPUT`] || `.media-cache/marketing/sarvnema-weekend-${edition}`);
  const plan = JSON.parse(await readFile(path.join(output, 'render-plan.json'), 'utf8'));
  if (plan.narration?.mode === 'continuous') {
    const { generateContinuousVoice } = await import('./openrouter-continuous.mjs');
    await generateContinuousVoice(output, plan, key); return;
  }
  if (process.argv.includes('--pronunciation-candidates')) {
    assert.ok(plan.pronunciation, 'Candidate review requires a pronunciation-controlled plan');
    const texts = ['/sæɾv/ /neˈmɒː/! همین الان شروع کن!', 'Sarv Nema! همین الان شروع کن!', 'سَرو‌نِما! همین الان شروع کن!'];
    const catalogue = await fetch(`${API}/models?output_modalities=speech`, { signal: AbortSignal.timeout(25_000) }).then(response => response.json());
    const model = catalogue.data?.find(model => model.id === VOICE_MODEL);
    assert.ok(model?.supported_voices.includes(plan.voice.name));
    const estimate = texts.reduce((sum, text) => sum + [...`[excited] ${text}`].length, 0) * Number(model.pricing.prompt);
    assert.ok(estimate > 0 && estimate <= .05, 'Pronunciation probe TTS estimate must be below $0.05');
    for (const [i, ttsText] of texts.entries()) {
      const candidate = structuredClone(plan), scene = candidate.scenes.at(-1); scene.ttsText = ttsText; scene.audioTags = '[excited]';
      const body = voiceRequest(candidate, candidate.scenes.length - 1);
      body.provider.options.elevenlabs.previous_text = 'نام این برند از درخت سَرو گرفته شده است.';
      const clip = await requestSpeech(body, key);
      const file = `brand-candidate-${i + 1}.mp3`;
      await writeFile(path.join(output, 'voice', file), clip.bytes);
      const response = await fetch(`${API}/audio/transcriptions`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'elevenlabs/scribe-v2', input_audio: { data: clip.bytes.toString('base64'), format: 'mp3' } }), signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw Error(`Candidate transcription HTTP ${response.status}`);
      const transcript = await response.json();
      const record = { model: VOICE_MODEL, voice: plan.voice.name, file, body, generationId: clip.generationId, signature: createHash('sha256').update(JSON.stringify(body)).digest('hex'), transcript: transcript.text, note: 'ASR is a sanity check, not a human phonetic review' };
      await writeFile(path.join(output, 'voice', `brand-candidate-${i + 1}.json`), JSON.stringify(record, null, 2) + '\n');
      console.log(JSON.stringify({ candidate: i + 1, ttsText, transcript: transcript.text }));
    }
    return;
  }
  if (process.argv.includes('--verify-pronunciation')) {
    // One short independent ASR check, no spelling hint. Not a substitute for human listening.
    assert.ok(plan.pronunciation, 'Pronunciation check requires a pronunciation-controlled plan');
    const bytes = await readFile(path.join(output, 'voice', 'outro.mp3'));
    assert.ok(bytes.length > 1500 && bytes.length < 128_000, 'Check only a short final voice clip');
    const response = await fetch(`${API}/audio/transcriptions`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'elevenlabs/scribe-v2', input_audio: { data: bytes.toString('base64'), format: 'mp3' } }), signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw Error(`Pronunciation transcription HTTP ${response.status}`);
    const result = await response.json();
    const record = { model: 'elevenlabs/scribe-v2', text: result.text, usage: result.usage, pronunciation: plan.pronunciation, note: 'Independent unprompted ASR sanity check, not a phonetic or human-listening guarantee' };
    await writeFile(path.join(output, 'pronunciation-review.json'), JSON.stringify(record, null, 2) + '\n');
    console.log(JSON.stringify(record)); return;
  }
  const models = await fetch(`${API}/models?output_modalities=speech`, { signal: AbortSignal.timeout(25_000) }).then(r => r.json());
  const model = models.data?.find(m => m.id === VOICE_MODEL);
  assert.ok(model?.supported_voices.includes(plan.voice.name), 'Requested model and voice must be advertised by OpenRouter');
  const bodies = plan.scenes.map((_, i) => voiceRequest(plan, i));
  const chars = bodies.reduce((sum, body) => sum + [...body.input].length, 0);
  const estimate = chars * Number(model.pricing.prompt);
  assert.ok(estimate > 0 && estimate <= .2, 'Stop if the estimated narration charge exceeds $0.20');
  console.log(JSON.stringify({ model: VOICE_MODEL, voice: plan.voice.name, characters: chars, estimatedUSD: Math.round(estimate * 10000) / 10000 }));
  const voiceDir = path.join(output, 'voice'); await mkdir(voiceDir, { recursive: true });
  const manifest = [];
  for (const [i, body] of bodies.entries()) {
    const scene = plan.scenes[i], target = path.join(voiceDir, `${scene.id}.mp3`), metadata = path.join(voiceDir, `${scene.id}.json`);
    const signature = createHash('sha256').update(JSON.stringify(body)).digest('hex');
    let cached; try { cached = JSON.parse(await readFile(metadata, 'utf8')); } catch { /* No verified cache. */ }
    if (cached?.signature === signature && (await stat(target).catch(() => null))?.size > 1500) { manifest.push(cached); console.log(`VOICE CACHED ${scene.id}`); continue; }
    const result = await requestSpeech(body, key);
    const record = { scene: scene.id, model: VOICE_MODEL, provider: 'OpenRouter / ElevenLabs', voice: plan.voice.name, gender: plan.voice.gender, synthetic: true, text: scene.spoken, ttsText: scene.ttsText || scene.spoken, audioTags: scene.audioTags, generationId: result.generationId, signature, file: `${scene.id}.mp3` };
    await writeFile(target, result.bytes); await writeFile(metadata, JSON.stringify(record, null, 2) + '\n');
    manifest.push(record); console.log(`ELEVEN V4 VOICE READY ${scene.id}`);
  }
  await writeFile(path.join(voiceDir, 'manifest.json'), JSON.stringify({ model: VOICE_MODEL, voice: plan.voice.name, gender: plan.voice.gender, synthetic: true, clips: manifest, characters: chars, estimatedUSD: estimate }, null, 2) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
