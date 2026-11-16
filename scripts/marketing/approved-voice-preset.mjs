import { readFileSync } from 'node:fs';

const preset = JSON.parse(readFileSync(new URL('./voice-presets/sarvnema-fa-commercial-male.json', import.meta.url), 'utf8'));

/** Independent copy: campaign edits must not mutate the user's approved preset. */
export function getApprovedVoicePreset() {
  return structuredClone(preset);
}

export function getApprovedNarrator() {
  const approved = getApprovedVoicePreset();
  return { ...approved.voice, preset: approved.id, responseFormat: approved.responseFormat, generationOptions: approved.generationOptions };
}
