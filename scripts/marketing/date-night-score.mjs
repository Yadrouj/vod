import { writeFile } from 'node:fs/promises';

/** Original 120 BPM trailer/electronic cue. All instruments are synthesized. */
export async function createDateNightScore(file, duration = 36, sampleRate = 48000) {
  const count = Math.round(duration * sampleRate), left = new Float64Array(count), right = new Float64Array(count);
  const tau = 2 * Math.PI, beat = .5;
  let seed = 78125;
  const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; };
  const add = (start, seconds, fn, pan = 0) => {
    const offset = Math.round(start * sampleRate), length = Math.max(0, Math.min(Math.ceil(seconds * sampleRate), count - offset));
    for (let i = 0; i < length; i++) { const v = fn(i / sampleRate); left[offset + i] += v * Math.sqrt((1 - pan) / 2); right[offset + i] += v * Math.sqrt((1 + pan) / 2); }
  };
  const harmony = [[73.4162, 146.8324, 174.6141, 220], [58.2705, 116.5409, 146.8324, 174.6141], [87.3071, 130.8128, 174.6141, 220], [65.4064, 130.8128, 164.8138, 195.9977]];
  for (let start = 0, index = 0; start < duration; start += 4, index++) {
    const chord = harmony[index % 4];
    for (const [voice, hz] of chord.entries()) add(start, 4.7, t => {
      const envelope = Math.min(1, t / .6) * Math.max(0, Math.min(1, (4.7 - t) / .8));
      return .027 * envelope * (Math.sin(tau * hz * t) + .26 * Math.sin(tau * hz * 2 * t) + .12 * Math.sin(tau * hz * 3.002 * t));
    }, (voice % 2 ? 1 : -1) * .5);
  }
  for (let index = 0; index * beat < duration - .5; index++) {
    const start = index * beat, chord = harmony[Math.floor(start / 4) % 4], drive = start < 4 ? .55 : start < 24 ? 1 : .78;
    if (index % 2 === 0) add(start, .4, t => drive * .16 * Math.exp(-12 * t) * Math.sin(tau * (48 * t + 3.8 * (1 - Math.exp(-30 * t)))));
    if (index % 4 === 2) { let filtered = 0; add(start, .22, t => { filtered += .32 * (noise() - filtered); return drive * .09 * filtered * Math.exp(-21 * t); }); }
    for (const sub of [0, .25]) add(start + sub, .045, t => noise() * .022 * drive * Math.exp(-100 * t), sub ? .3 : -.3);
    const hz = chord[1 + index % 3] * 2;
    add(start, .45, t => .034 * drive * Math.min(1, t / .006) * Math.exp(-7 * t) * (Math.sin(tau * hz * t) + .18 * Math.sin(tau * hz * 2 * t)), Math.sin(index * .9) * .5);
    if (start > 3 && start < 30) add(start, .26, t => .037 * Math.exp(-12 * t) * Math.sin(tau * chord[0] * t));
  }
  for (const cut of [4, 11, 18, 24, 30]) {
    let low = 0;
    add(cut - .38, .7, t => { low += (noise() - low) * .13; return low * Math.sin(Math.PI * t / .7) ** 3 * .19; }, -.15);
    add(cut, .85, t => .18 * Math.exp(-7 * t) * (Math.sin(tau * (35 * t + 1.8 * (1 - Math.exp(-15 * t)))) + .12 * noise()));
  }
  for (const [i, hz] of [293.6648, 440, 587.3295].entries()) add(30.2 + i * .1, 3.6, t => .045 * Math.min(1, t / .01) * Math.exp(-1.7 * t) * Math.sin(tau * hz * t), (i - 1) * .3);
  let peak = .01;
  for (let i = 0; i < count; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const output = Buffer.alloc(44 + count * 4);
  output.write('RIFF'); output.writeUInt32LE(output.length - 8, 4); output.write('WAVEfmt ', 8); output.writeUInt32LE(16, 16); output.writeUInt16LE(1, 20); output.writeUInt16LE(2, 22); output.writeUInt32LE(sampleRate, 24); output.writeUInt32LE(sampleRate * 4, 28); output.writeUInt16LE(4, 32); output.writeUInt16LE(16, 34); output.write('data', 36); output.writeUInt32LE(count * 4, 40);
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate, fade = Math.min(1, t / .03, (duration - t) / .9), gain = .75 / peak;
    output.writeInt16LE(Math.round(Math.tanh(left[i] * gain) * 30000 * fade), 44 + i * 4);
    output.writeInt16LE(Math.round(Math.tanh(right[i] * gain) * 30000 * fade), 46 + i * 4);
  }
  await writeFile(file, output);
  return { duration, sampleRate, channels: 2, bpm: 120, externalSamples: false, style: 'Original cinematic rhythmic electronic score and synchronized transition impacts' };
}
