import { writeFile } from 'node:fs/promises';

/** Original bright 120 BPM dance-pop cue; no external songs or samples. */
export async function createWeekendScore(file, duration = 30, sampleRate = 48000, { hype = false, cuts = [3, 8, 13, 19, 24] } = {}) {
  const count = Math.round(duration * sampleRate), left = new Float64Array(count), right = new Float64Array(count), tau = Math.PI * 2;
  let seed = 571122;
  const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; };
  const add = (start, seconds, fn, pan = 0) => {
    const offset = Math.round(start * sampleRate), length = Math.max(0, Math.min(Math.round(seconds * sampleRate), count - offset));
    for (let i = 0; i < length; i++) { const value = fn(i / sampleRate); left[offset + i] += value * Math.sqrt((1 - pan) / 2); right[offset + i] += value * Math.sqrt((1 + pan) / 2); }
  };
  const chords = [[73.4162, 293.6648, 369.9944, 440], [97.9989, 293.6648, 391.9954, 493.8833], [61.7354, 246.9417, 293.6648, 369.9944], [110, 277.1826, 329.6276, 440]];
  for (let n = 0; n * .5 < duration - .25; n++) {
    const start = n * .5, notes = chords[Math.floor(start / 4) % 4];
    add(start, .29, t => .16 * Math.exp(-16 * t) * Math.sin(tau * (53 * t + 2.4 * (1 - Math.exp(-34 * t)))));
    if (n % 2 === 1) { let prev = 0; add(start, .12, t => { const raw = noise(), high = raw - prev; prev = raw; return high * .065 * Math.exp(-27 * t); }, .12); }
    for (const off of [.25, .375]) add(start + off, .05, t => noise() * (off === .25 ? .026 : .014) * Math.exp(-95 * t), off === .25 ? -.45 : .45);
    const bass = notes[0] * (n % 8 === 7 ? 2 : 1);
    add(start + .05, .35, t => .077 * Math.min(1, t / .009) * Math.exp(-6 * t) * (Math.sin(tau * bass * t) + .24 * Math.sin(tau * bass * 2 * t)));
    if (n % 2 === 0) for (const [i, hz] of notes.slice(1).entries()) add(start + .25, .62, t => .033 * Math.min(1, t / .005) * Math.exp(-5 * t) * (Math.sin(tau * hz * t) + .28 * Math.sin(tau * hz * 2.002 * t)), (i - 1) * .5);
    const lead = notes[1 + [0, 1, 2, 1, 0, 2, 1, 2][n % 8]] * (n % 4 === 3 ? 2 : 1);
    add(start + .125, .46, t => .033 * Math.min(1, t / .004) * Math.exp(-8 * t) * (Math.sin(tau * lead * t) + .13 * Math.sin(tau * lead * 3 * t)), Math.sin(n) * .55);
    if (hype) {
      // More forward offbeat synth, brighter stereo lead and layered claps.
      add(start + .25, .22, t => .036 * Math.min(1, t / .003) * Math.exp(-11 * t) * (Math.sin(tau * notes[2] * t) + .3 * Math.sin(tau * notes[2] * 3 * t)), -.2);
      if (n % 2 === 1) for (const off of [0, .013, .027]) add(start + off, .105, t => noise() * .028 * Math.exp(-30 * t), off ? .45 : -.45);
      if (n % 4 === 3) for (let i = 0; i < 3; i++) add(start + i * .083, .23, t => .027 * Math.exp(-14 * t) * Math.sin(tau * notes[1 + i] * 2 * t), (i - 1) * .65);
    }
  }
  for (const cut of cuts.filter(cut => Number.isFinite(cut) && cut >= .7 && cut < duration)) {
    let low = 0;
    add(cut - .22, .5, t => { low += .2 * (noise() - low); return .12 * low * Math.sin(Math.PI * t / .5) ** 2; }, -.2);
    for (const [i, hz] of [587.3295, 739.9888, 880].entries()) add(cut + i * .035, .8, t => .034 * Math.exp(-5 * t) * Math.sin(tau * hz * t), (i - 1) * .35);
    if (hype) {
      add(cut - .7, .7, t => .026 * Math.sin(Math.PI * t / .7) ** 2 * Math.sin(tau * (240 * t + 450 * t * t)), .4);
      for (let i = 0; i < 4; i++) add(cut - .5 + i * .125, .07, t => noise() * (.018 + i * .006) * Math.exp(-50 * t), i % 2 ? .5 : -.5);
    }
  }
  let peak = .01;
  for (let i = 0; i < count; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const output = Buffer.alloc(44 + count * 4);
  output.write('RIFF'); output.writeUInt32LE(output.length - 8, 4); output.write('WAVEfmt ', 8); output.writeUInt32LE(16, 16); output.writeUInt16LE(1, 20); output.writeUInt16LE(2, 22); output.writeUInt32LE(sampleRate, 24); output.writeUInt32LE(sampleRate * 4, 28); output.writeUInt16LE(4, 32); output.writeUInt16LE(16, 34); output.write('data', 36); output.writeUInt32LE(count * 4, 40);
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate, fade = Math.min(1, t / .025, (duration - t) / .55), gain = .77 / peak;
    output.writeInt16LE(Math.round(Math.tanh(left[i] * gain) * fade * 30000), 44 + i * 4);
    output.writeInt16LE(Math.round(Math.tanh(right[i] * gain) * fade * 30000), 46 + i * 4);
  }
  await writeFile(file, output);
  return { duration, sampleRate, channels: 2, bpm: 120, externalSamples: false, hype, style: hype ? 'Original high-energy dance-pop with layered claps, stereo synth fills, risers and transition impacts' : 'Original upbeat major-key dance-pop, electronic percussion and beat-synchronized transition chimes' };
}
