import assert from 'node:assert/strict';
import { VOICE_MODEL } from './openrouter-voice.mjs';

export function buildWeekendV2Plan(base) {
  const plan = structuredClone(base);
  assert.deepEqual(plan.scenes.map(scene => scene.id), ['hook', 'family', 'couple', 'together', 'free', 'outro']);
  plan.voice = { provider: 'openrouter', model: VOICE_MODEL, name: 'jessica', gender: 'female', synthetic: true };
  plan.fontFamily = 'Alibaba'; plan.template = 'weekend';
  // Give the expressive performance room: do not truncate or rush the delivered voice.
  plan.duration = 33;
  const timing = [
    [0, 3, .12, 2.85], [3, 8.5, 3.3, 8.15], [8.5, 15.5, 8.75, 15.1],
    [15.5, 21.5, 15.75, 21.1], [21.5, 26, 21.75, 25.7], [26, 33, 26.2, 32.7],
  ];
  const tags = ['[excited]', '[warmly] [cheerfully]', '[smiling] [playfully]', '[curious] [encouraging]', '[excited] [confident]', '[joyfully] [excited]'];
  for (const [i, scene] of plan.scenes.entries()) {
    const [start, end, voiceStart, voiceEnd] = timing[i];
    Object.assign(scene, { start, end, voiceStart, voiceEnd, audioTags: tags[i] });
  }
  plan.mp4Title = 'SarvNema weekend - Alibaba type and expressive Eleven v4 female narration';
  plan.mp4Comment = 'Eleven v4 / Jessica synthetic female Persian narration; user-provided Alibaba typefaces; original energetic score; original AI-generated fictional lifestyle imagery';
  return plan;
}
