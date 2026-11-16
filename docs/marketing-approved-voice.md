# Approved SarvNema voice — reuse for future ads

The user approved the weekend-v4 narrator's pronunciation on **2026-11-16**.
Use preset **`sarvnema-fa-commercial-male`** for future SarvNema ads unless the
user requests a different voice. This is the male **Brian** preset with
**Eleven v4 through OpenRouter**, not the earlier Jessica/Farid voices.

Canonical configuration:
[sarvnema-fa-commercial-male.json](../scripts/marketing/voice-presets/sarvnema-fa-commercial-male.json).
It preserves provider/model, voice name, Persian language, seed 17, stability .5,
similarity .75, style .55, speaker boost, MP3 output and brand IPA
`/sæɾv/ /neˈmɒː/` — sarv is the cypress tree, not “sar o”.

Keep one continuous performance, warm and lightly playful, with phrase-dependent
pace and short natural pauses. Do not stitch independently generated sentences,
remove internal pauses, add joke words or uniformly accelerate the voice. The
approved recording has roughly .28–.52s sentence gaps and .48s before the CTA;
these are references, not guaranteed synthesis settings.

```js
import { getApprovedNarrator, getApprovedVoicePreset } from './approved-voice-preset.mjs';
const preset = getApprovedVoicePreset();
plan.voice = getApprovedNarrator();
plan.pronunciation = preset.pronunciation;
plan.narration.mode = preset.delivery.mode;
plan.narrationTempo = preset.delivery.postprocessTempo;
// Put the new campaign's script in plan.narration.input, using the saved brand IPA.
```

The existing v4 builder uses this preset. A regression test verifies that its
entire approved API request hash remains identical; no new TTS call is needed
just to save/reuse this configuration. Earlier campaigns retain their own voices.

Exact approved reference audio and request metadata have a dedicated local archive:

- `.media-cache/marketing/voice-presets/sarvnema-fa-commercial-male/reference.mp3`
- `.media-cache/marketing/voice-presets/sarvnema-fa-commercial-male/reference-request.json`

The original remains at `.media-cache/marketing/sarvnema-weekend-v4/voice/narration.mp3`.
The preset records its audio SHA-256, full request hash and generation ID. Reference
media is ignored by Git; copy that local archive separately if moving workstations.
Only configuration, docs and tests are committed. No credentials are saved and no
new narration, deployment or voice cloning is performed. New scripts or provider
updates can change delivery even with the same settings/seed; use the recording
as the exact approved reference and check brand pronunciation when making new ads.

Verification (no paid API calls):

```powershell
node --test scripts/tests/approved-voice-preset.test.mjs scripts/tests/weekend-v4-reel.test.mjs scripts/tests/weekend-v3-reel.test.mjs scripts/tests/weekend-v2-reel.test.mjs
```
