# SarvNema — bold weekend movie-night teaser

Thirty-second Persian Instagram Reel, 1080×1920, 30fps. This is a separate
creative direction from the earlier black/gold cinema reel: hot pink, electric
violet, tangerine, cyan and acid yellow; upbeat original dance-pop rather than
a dark trailer cue. The existing SarvNema mark is preserved, recolored in white
or ink for contrast. The website itself, its palette and production are unchanged.

## Story

| Time | Scene | Copy |
| --- | --- | --- |
| 0–3s | Moving photo cards, oversized type, play sticker | آخر هفته‌ست! فیلم رو روشن کن! |
| 3–8s | Original family lifestyle image | یه فیلم خوب، یه عالمه خنده! |
| 8–13s | Original adult-couple lifestyle image | یه قرار دونفره، با طعم سینما! |
| 13–19s | Conceptual two-screen animation and flying invite | از هم دورین؟ با هم ببینین! |
| 19–24s | High-contrast free-feature message | تماشای همزمان توی سرونما رایگانه! |
| 24–30s | Bright CTA, moving ticker and website address | آخر هفته رو با هم بساز! |

The transitions combine horizontal push, circular reveal and vertical cinematic
scroll; photography uses gentle camera movement. Confetti, play stickers, the
invitation graphic, ticker and typography are deterministic code-native motion.
This is animated campaign photography, not live-action footage or lip-synced video.

## Images — built-in image generation

Two images were created with the **built-in image_gen tool**, not the CLI/API
fallback. The selected outputs were copied into the workspace, keeping the
originals intact. The people are fictional advertising models, not customers,
testimonials or a recording of a private watch-together room. The family scene
contains parents and school-age children; the couple scene depicts adults.

Full final prompt set: [weekend-image-prompts.json](../scripts/marketing/weekend-image-prompts.json).

Selected image paths relative to the project:

- `.media-cache/marketing/sarvnema-weekend/assets/family.png`
- `.media-cache/marketing/sarvnema-weekend/assets/couple.png`

The output folder also includes `image-prompts.json` and `source-manifest.json`
with the selected artwork dimensions and SHA-256 hashes. No external film still,
trailer clip, commercial song or music sample is used in this version.

## Voice, music and truthful claims

Iranian Persian synthetic male voice `fa-IR-FaridNeural`, not a cloned actor.
Only the public promotional script is sent to the speech service. The original
120 BPM major-key dance-pop score is synthesized locally. Six measured voice
segments are mixed with automatic music ducking, EQ/compression and true-peak
headroom. AI-generated imagery and voice are disclosed in the caption, video
and metadata. Public voice text, not secrets or archive data, is synthesized.

**Free** describes the watch-together feature only, not film rights, source
subscriptions or Internet charges. This qualification is shown in the video and
caption. The suggested caption reminds viewers to choose a film appropriate to
the age and taste of their group. The imagery does not promise that all titles
are suitable for children, or that two people shown are real service users.

## Reproduce

Use the isolated FFmpeg/Playwright/voice tools documented in
[the date-night reel](marketing-date-night-reel.md). Generate the two new images
with the recorded prompts before rendering; there is no automatic paid API call.

```powershell
$env:PLAYWRIGHT_MODULE='C:\path\to\playwright-core\index.mjs'
node scripts/marketing/prepare-weekend.mjs --family=C:\path\family.png --couple=C:\path\couple.png
python scripts/marketing/synthesize-date-night.py --weekend
node scripts/marketing/render-date-night.mjs --weekend --preview-only
node scripts/marketing/render-date-night.mjs --weekend
```

If selected images already exist in the output folder, omit `--family` and
`--couple`; preparation preserves them rather than overwriting. `WEEKEND_OUTPUT`
selects another artifact folder. Default: `.media-cache/marketing/sarvnema-weekend/`.
The shared renderer's original date-night mode remains the default, unchanged.

The output contains MP4, cover JPG, six storyboard JPGs, Persian SRT, narration
text, caption, six synthetic-voice MP3s, original soundtrack WAV, final mix and
source/render manifests. Only source, prompts, tests and docs go to Git; generated
media stays local. No Instagram upload or production deployment is performed.

## Verification

```powershell
node --test scripts/tests/weekend-reel.test.mjs scripts/tests/date-night-reel.test.mjs scripts/tests/reel-soundtrack.test.mjs
npx eslint scripts/marketing/*.mjs scripts/tests/weekend-reel.test.mjs --max-warnings=0
```

Rendering checks all 900 frames, 30-second duration, H.264/AAC, limited-range
BT.709 color, MP4 fast-start order, real Edge playback and audio peak headroom.
The tests cover narration windows, continuous timeline, distinct color palette,
disclosure/claim scope, deterministic music, stereo output and non-clipping fades.
