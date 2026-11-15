import assert from 'node:assert/strict';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const normalize = text => text.normalize('NFKC').replace(/[\u064b-\u065f\u0670]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[^\p{L}\p{N}]/gu, '');

export function alignContinuousPlan(base, transcript, sourceDuration) {
  const plan = structuredClone(base);
  assert.equal(plan.narration.mode, 'continuous');
  assert.ok(sourceDuration > 8 && sourceDuration < 35, 'Expected a short campaign narration');
  const words = transcript.words.map(word => ({ text: String(word.word || word.text || ''), start: Number(word.start), end: Number(word.end) })).filter(word => normalize(word.text));
  assert.ok(words.length > 15);
  for (const [i, word] of words.entries()) {
    assert.ok(Number.isFinite(word.start) && word.start >= 0 && word.end >= word.start && word.end <= sourceDuration + .3);
    if (i) assert.ok(word.start >= words[i - 1].start, 'Transcript must be chronological');
  }
  const anchors = [0];
  for (const term of ['خانواده', 'وقت', 'لینک', 'تماشا', 'سرو']) {
    let index = words.findIndex((word, i) => i > anchors.at(-1) && normalize(word.text).startsWith(term));
    assert.ok(index > anchors.at(-1), `Missing narration anchor: ${term}; review transcript before rendering`);
    if (term === 'لینک' && normalize(words[index - 1].text) === 'یه') index--;
    anchors.push(index);
  }
  const lead = plan.narration.start;
  plan.duration = Math.max(18, Math.ceil(sourceDuration + lead + 1));
  const starts = anchors.map((anchor, i) => i ? Math.round((lead + words[anchor].start - .04) * plan.fps) / plan.fps : 0);
  for (const [i, scene] of plan.scenes.entries()) {
    const start = starts[i], end = starts[i + 1] ?? plan.duration;
    assert.ok(end - start > .45, `Scene too short: ${scene.id}`);
    Object.assign(scene, { start, end, voiceStart: Math.max(start, lead + words[anchors[i]].start), voiceEnd: Math.min(end, lead + words[(anchors[i + 1] ?? words.length) - 1].end) });
    assert.ok(scene.voiceEnd > scene.voiceStart);
  }
  plan.narration.alignment = { source: 'Scribe v2 unprompted word timestamps', words: words.length, sourceDuration, tempo: 1, humanListeningVerified: false };
  return plan;
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const output = path.resolve(root, process.env.WEEKEND_V4_OUTPUT || '.media-cache/marketing/sarvnema-weekend-v4');
  const planPath = path.join(output, 'render-plan.json'), plan = JSON.parse(await readFile(planPath, 'utf8'));
  const transcript = JSON.parse(await readFile(path.join(output, 'voice/narration-transcript.json'), 'utf8'));
  const voice = JSON.parse(await readFile(path.join(output, 'voice/narration.json'), 'utf8'));
  assert.equal(transcript.signature, voice.signature, 'Transcript must match this generated take');
  const binaries = path.join(root, '.media-cache/reel-tools/python/imageio_ffmpeg/binaries');
  const ffmpeg = process.env.FFMPEG_BINARY || path.join(binaries, (await readdir(binaries)).find(name => /^ffmpeg.*\.exe$/.test(name)));
  const { stderr } = await promisify(execFile)(ffmpeg, ['-hide_banner', '-i', path.join(output, 'voice/narration.mp3'), '-f', 'null', '-'], { windowsHide: true });
  const match = stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/); assert.ok(match);
  const duration = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  const aligned = alignContinuousPlan(plan, transcript, duration);
  await writeFile(planPath, JSON.stringify(aligned, null, 2) + '\n');
  await writeFile(path.join(output, 'pronunciation-review.json'), JSON.stringify({ text: transcript.text, pronunciation: plan.pronunciation, generationId: voice.generationId, note: 'Unprompted ASR; not a human-listening or phonetic guarantee' }, null, 2) + '\n');
  console.log(JSON.stringify({ duration: aligned.duration, sourceDuration: duration, scenes: aligned.scenes.map(({ id, start, end }) => ({ id, start, end })) }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
