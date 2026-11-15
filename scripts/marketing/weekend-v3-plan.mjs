import { buildWeekendV2Plan } from './weekend-v2-plan.mjs';

// Sarv = the Persian cypress tree: final /v/, not a separate spoken "o" (and).
export const BRAND_IPA = '/sæɾv/ /neˈmɒː/';
export function buildWeekendV3Plan(base) {
  const plan = buildWeekendV2Plan(base);
  plan.duration = 18; plan.coverTime = 1.1;
  plan.motion = { style: 'punchy', transitionSeconds: .24, revealSeconds: .25 };
  plan.score = { hype: true, bpm: 150 };
  plan.narrationTempo = 1.09;
  plan.pronunciation = { brand: 'سرونما', romanization: 'sarv-nema', ipa: BRAND_IPA, meaning: 'sarv = cypress tree; no conjunction or extra vowel between sarv and nema' };
  const scenes = [
    { start: 0, end: 2, voiceStart: .02, voiceEnd: 1.9, spoken: 'آخر هفته‌ست! آماده‌ای؟', caption: 'آخر هفته‌ست! آماده‌ای؟', display: ['آخر هفته‌ست!', 'آماده‌ای؟'], eyebrow: 'فیلم رو روشن کن!' },
    { start: 2, end: 4.4, voiceStart: 2.08, voiceEnd: 4.25, spoken: 'خانواده، یا پارتنرت؟', caption: 'خانواده، یا پارتنرت؟', display: ['خانواده،', 'یا پارتنرت؟'], eyebrow: 'آدمای خودت رو خبر کن!' },
    { start: 4.4, end: 6.4, voiceStart: 4.48, voiceEnd: 6.25, spoken: 'وقتِ فیلم دیدنه!', caption: 'وقت فیلم دیدنه!', display: ['وقتِ', 'فیلم دیدنه!'], eyebrow: 'یه قرار سینمایی بچین!' },
    { start: 6.4, end: 10.4, voiceStart: 6.48, voiceEnd: 10.22, spoken: 'یه لینک بفرست؛ از هر جا، با هم ببین!', caption: 'یه لینک بفرست؛\nاز هر جا، با هم ببین!', display: ['یه لینک بفرست!', 'با هم ببین!'], eyebrow: 'حتی وقتی از هم دورین' },
    { start: 10.4, end: 13.6, voiceStart: 10.48, voiceEnd: 13.45, spoken: 'تماشای همزمان؟ رایگان!', caption: 'تماشای همزمان؟ رایگان!', display: ['رایگانه!'], eyebrow: 'تماشای همزمان توی سرونما' },
    { start: 13.6, end: 18, voiceStart: 13.68, voiceEnd: 17.75, spoken: 'سرونما! همین الان شروع کن!', ttsText: `${BRAND_IPA}! همین الان شروع کن!`, caption: 'سرونما!\nهمین الان شروع کن!', display: ['سرونما', 'همین الان!'], eyebrow: 'وقتِ با هم دیدنه!' },
  ];
  for (const [i, scene] of plan.scenes.entries()) Object.assign(scene, scenes[i], { audioTags: '[excited] [rushed]' });
  // Do not rush the brand itself; explicit syllables close sarv with /v/, not /o/.
  Object.assign(plan.scenes.at(-1), { audioTags: '[excited]', ttsPreviousText: 'نام این برند از درخت سَرو گرفته شده است.' });
  plan.mp4Title = 'SarvNema - fast weekend ad with corrected sarv-nema pronunciation';
  plan.mp4Comment = 'Eleven v4 Jessica synthetic female Persian narration with IPA brand pronunciation; 18-second punchy cut; Alibaba fonts; original 150 BPM score and fictional campaign imagery';
  return plan;
}
