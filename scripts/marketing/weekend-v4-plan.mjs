import { buildWeekendV3Plan } from './weekend-v3-plan.mjs';
import { getApprovedNarrator, getApprovedVoicePreset } from './approved-voice-preset.mjs';

export function buildWeekendV4Plan(base) {
  const plan = buildWeekendV3Plan(base);
  const approved = getApprovedVoicePreset();
  plan.voice = getApprovedNarrator(); plan.pronunciation = approved.pronunciation;
  plan.duration = 22; plan.narrationTempo = approved.delivery.postprocessTempo;
  const lines = [
    'آخَرِ هفته‌ست. آماده‌ای؟', 'خانواده، یا پارتنرت.', 'وقتِ فیلم دیدنه!',
    'یه لینک بفرست؛ از هر جا، با هم ببینید!', 'تماشای همزمان اونم رایگان!',
    'سَرونِما! ........همین الان شروع کن!',
  ];
  const timings = [[0, 2.8], [2.8, 5.3], [5.3, 7.5], [7.5, 12], [12, 16], [16, 22]];
  const deliveries = ['[curious]', '[playfully]', '[excited]', '[confident]', '[excited]', '[warmly]'];
  for (const [i, scene] of plan.scenes.entries()) {
    const [start, end] = timings[i];
    Object.assign(scene, { start, end, voiceStart: start + .16, voiceEnd: end - .16, spoken: lines[i], caption: lines[i].replace('........', '… '), audioTags: deliveries[i] });
    delete scene.ttsText; delete scene.ttsPreviousText;
  }
  plan.scenes[0].display = ['آخرِ هفته‌ست.', 'آماده‌ای؟'];
  plan.scenes[1].display = ['خانواده،', 'یا پارتنرت.'];
  plan.scenes[3].display = ['یه لینک بفرست؛', 'با هم ببینید!'];
  plan.scenes[4].eyebrow = 'تماشای همزمان، اونم';
  plan.narration = {
    mode: approved.delivery.mode, file: 'narration.mp3', start: .16,
    input: `[curious] ${lines[0]} [playfully] ${lines[1]} [excited] ${lines[2]} [confident] یه لینک بفرست؛ [rushed] از هر جا، با هم ببینید! [excited] تماشای همزمان، اونم رایگان! [warmly] ${approved.pronunciation.ipa}! ... [confident] همین الان شروع کن!`,
    direction: 'One continuous male commercial read: inviting opening, playful partner line, energetic film/link invitation, emphasis on free, warm brand then a brief pause and confident CTA. No laugh sound effects, joke words or stitched sentence clips.',
  };
  plan.mp4Title = 'SarvNema - expressive male weekend narrator, user-approved Persian script';
  plan.mp4Comment = 'Eleven v4 Brian synthetic male Persian narration; continuous expressive take aligned to scene timing, user-approved copy, Alibaba fonts, original energetic score and fictional campaign imagery';
  return plan;
}
