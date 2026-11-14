import { writeFile } from 'node:fs/promises';

/** Original procedural score: no third-party songs, recordings or samples. */
export async function createSoundtrack(file, duration = 30, sampleRate = 48000) {
  const length = Math.round(duration * sampleRate), left = new Float64Array(length), right = new Float64Array(length);
  const tau = Math.PI * 2, beat = 60 / 96;
  const chords = [[0, 7.5, [110, 164.8138, 220, 261.6256, 329.6276, 493.8833]], [7.5, 15, [87.3071, 130.8128, 174.6141, 220, 329.6276, 440]], [15, 22.5, [130.8128, 164.8138, 195.9977, 261.6256, 329.6276, 440]], [22.5, 27.5, [97.9989, 146.8324, 195.9977, 220, 293.6648, 391.9954]], [27.5, 30, [110, 164.8138, 220, 261.6256, 329.6276, 440]]];
  const add = (start, seconds, tone, pan = 0) => {
    const offset = Math.round(start * sampleRate), count = Math.min(Math.round(seconds * sampleRate), length - offset);
    for (let j = 0; j < count; j++) { const value = tone(j / sampleRate, j); left[offset + j] += value * Math.sqrt((1 - pan) / 2); right[offset + j] += value * Math.sqrt((1 + pan) / 2); }
  };
  for (const [start, end, notes] of chords) for (const [voice, hz] of notes.entries()) {
    const seconds = Math.min(end - start + 1.2, duration - start), pan = (voice % 2 ? 1 : -1) * .48;
    add(start, seconds, t => {
      const attack = Math.min(1, t / 1.5), release = Math.min(1, (seconds - t) / 1.3), tremolo = .87 + .13 * Math.sin(tau * .16 * t + voice);
      return attack * release * tremolo * .021 * (Math.sin(tau * hz * t) + .22 * Math.sin(tau * hz * 2 * t) + .09 * Math.sin(tau * (hz * 1.0018) * t));
    }, pan);
  }
  for (let n = 0; n * beat < 28; n++) {
    const start = n * beat, chord = chords.find(c => start >= c[0] && start < c[1]), hz = chord[2][[3, 4, 5, 4, 2, 4, 3, 5][n % 8]];
    const intensity = start < 3 ? .025 : start < 9 ? .034 : start < 22 ? .044 : .031;
    add(start, 1.9, t => intensity * Math.min(1, t / .009) * Math.exp(-3.4 * t) * (Math.sin(tau * hz * t) + .25 * Math.sin(tau * hz * 2 * t) + .08 * Math.sin(tau * hz * 4 * t)), Math.sin(n * .8) * .65);
    if (start >= 9 && start < 25.5 && n % 2 === 0) add(start, .25, t => .045 * Math.exp(-20 * t) * Math.sin(tau * (51 * t + 2 * (1 - Math.exp(-22 * t)))));
  }
  let state = 822173, low = 0;
  const noise = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2147483648 - 1; };
  for (const cut of [3.15, 8.7, 15.7, 21.65, 25.75]) add(Math.max(0, cut - .55), .9, t => {
    low += (noise() - low) * .07; const envelope = Math.sin(Math.PI * t / .9) ** 3; return low * envelope * .075;
  }, .1);
  for (const [i, hz] of [440, 659.2551, 880].entries()) add(26.6 + i * .15, 3.3 - i * .15, t => .027 * Math.min(1, t / .015) * Math.exp(-1.7 * t) * (Math.sin(tau * hz * t) + .17 * Math.sin(tau * hz * 3 * t)), (i - 1) * .35);
  const output = Buffer.alloc(44 + length * 4);
  output.write('RIFF'); output.writeUInt32LE(output.length - 8, 4); output.write('WAVEfmt ', 8); output.writeUInt32LE(16, 16); output.writeUInt16LE(1, 20); output.writeUInt16LE(2, 22); output.writeUInt32LE(sampleRate, 24); output.writeUInt32LE(sampleRate * 4, 28); output.writeUInt16LE(4, 32); output.writeUInt16LE(16, 34); output.write('data', 36); output.writeUInt32LE(length * 4, 40);
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const gain = .82 / Math.max(peak, .01);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate, fade = Math.min(1, t / .65, (duration - t) / 1.2);
    output.writeInt16LE(Math.round(Math.tanh(left[i] * gain) * fade * 30000), 44 + i * 4);
    output.writeInt16LE(Math.round(Math.tanh(right[i] * gain) * fade * 30000), 46 + i * 4);
  }
  await writeFile(file, output);
  return { duration, sampleRate, channels: 2, source: 'Original procedural ambient/piano score, 96 BPM; no external recordings' };
}
