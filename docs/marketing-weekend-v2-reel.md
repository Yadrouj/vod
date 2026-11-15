# Weekend reel v2 — expressive female narration and Alibaba typography

Separate 33-second, 1080×1920, 30fps version of the [colorful weekend ad](marketing-weekend-reel.md).
The existing 30-second male-voice export is preserved. This version uses the supplied
Alibaba regular, bold and black fonts, the previously selected original family/couple
artwork, and a more energetic original 120 BPM dance-pop score with claps, stereo
synth fills, risers and scene-synchronized impacts. No commercial music samples.

## Actual speech provider

Six Persian clips were generated through OpenRouter's `/api/v1/audio/speech`, using
`elevenlabs/eleven-v4`, preset female voice `jessica`, and inline delivery tags
including `[excited]`, `[warmly]`, `[smiling]` and `[joyfully]`. No Edge-TTS fallback.
Discovery uses `/api/v1/models?output_modalities=speech`, including voice validation
and a $0.20 estimated-charge guard. These clips total 384 Unicode characters including
tags; the live quoted estimate was $0.03072, not a claim about the final billed charge.
There are no automatic paid retries. Verified clips are reused by request hash.

Documentation: [OpenRouter TTS](https://openrouter.ai/docs/guides/overview/multimodal/tts)
and [ElevenLabs integration](https://openrouter.ai/blog/announcements/elevenlabs-on-openrouter/).
V4 delivery uses inline tags rather than an unsupported speed setting. The 33-second
edit gives all six measured recordings their natural duration; the render manifest
records source durations and any time adjustment. Music automatically ducks under narration.

## Reproduce

Prerequisites: original selected weekend artwork in its existing ignored output
folder; user-provided licensed fonts; FFmpeg and Playwright as documented in the
[date-night tooling](marketing-date-night-reel.md).

```powershell
$env:ALIBABA_FONT_DIR='C:\path\to\supplied\fonts'
$env:PLAYWRIGHT_MODULE='C:\path\to\playwright-core\index.mjs'
node scripts/marketing/prepare-weekend-v2.mjs
# Enter a key at the non-echoing terminal prompt; never pass it as an argument.
node scripts/marketing/openrouter-voice.mjs --key-stdin
node scripts/marketing/render-date-night.mjs --weekend-v2 --preview-only
node scripts/marketing/render-date-night.mjs --weekend-v2
```

`OPENROUTER_API_KEY` may alternatively be provided by a secure process environment.
Do not paste credentials into source, shell command arguments, files or Git. Rotate
any key previously exposed in chat. The helper saves only audio, request hashes,
public script text, voice/model names and generation IDs—not credentials or headers.
Error output avoids raw remote bodies and transport errors. Use `--auth-check` for
an optional read-only credential check. Rendering cached clips requires no API key.

`WEEKEND_V2_OUTPUT` overrides `.media-cache/marketing/sarvnema-weekend-v2/`.
Font filenames accepted by the preparation script are the three supplied
`alibaba-{weight}.woff2-{hash}.ttf` files. Their actual format is verified as TrueType.
The font binaries are only copied into the ignored local ad output; they are not
committed, distributed as source, or installed on the production website.

Outputs: `sarvnema-weekend-v2-fa.mp4`, cover JPG, six storyboard JPGs, Persian SRT,
caption, narration, voice clips, music/mix WAVs and source/voice/render manifests.
The storyboard timings are 0–3, 3–8.5, 8.5–15.5, 15.5–21.5, 21.5–26 and 26–33s.
The free-feature qualification and AI imagery/voice disclosure remain visible.
No Instagram upload or production deployment is performed.

## Verification

```powershell
node --test scripts/tests/weekend-v2-reel.test.mjs scripts/tests/weekend-reel.test.mjs scripts/tests/date-night-reel.test.mjs scripts/tests/reel-soundtrack.test.mjs
npx eslint scripts/marketing/*.mjs scripts/tests/weekend-v2-reel.test.mjs --max-warnings=0
```

Tests use mocked speech responses, not paid calls. The renderer checks the motion/
narration timeline, font loading, all 990 encoded frames, H.264/AAC decode, BT.709,
fast-start, real Edge playback, exact duration and audio true-peak headroom. Visual
checks use all six storyboard frames. The shared original weekend and date-night
timelines retain their previous defaults.
