# Weekend reel v4 — user script, continuous male commercial narration

**Approved narrator:** the user selected this voice for future ads on 2026-11-16.
Reuse the [saved Brian voice preset](marketing-approved-voice.md), including its
brand pronunciation and delivery settings.

Uses the user's six approved Persian lines exactly in `spoken`/narration text,
including «با هم ببینید» and «تماشای همزمان اونم رایگان». The final dotted pause
is represented by an ellipsis in speech input, not read as punctuation. Human
captions show the brand normally; TTS uses the established `/sæɾv/ /neˈmɒː/`.

## Performance and continuity

Eleven v4 via OpenRouter, preset male voice `brian`. One continuous synthesis
instead of six independently stitched sentences preserves phrasing and continuity.
Direction progresses from curious/inviting to lightly playful, excited/confident,
a quicker link invitation, emphasis on free, a warm brand mention, a short pause,
and a confident CTA. There are no added jokes, laugh sound effects, or words not
approved by the user. This changes the video's narrator, not the ChatGPT app's voice.

No artificial tempo change, sentence slicing or internal silence removal. The
actual source is 15.15s; the video is 18s with lead-in and CTA hold. Unprompted
Scribe v2 recognized the entire approved text and `سرونما`. Its word timestamps
show sentence gaps around 0.28–0.52s and a 0.48s brand-to-CTA pause. These provide
timing/text checks, not a human listening guarantee for humor, accent or intonation.
The isolated MP3 is delivered for listening.

## Reproduce

Use the same FFmpeg, Playwright, original artwork and supplied Alibaba fonts as
[v3](marketing-weekend-v3-reel.md). All previous final MP4s and caption files remain
untouched; v4 has its own ignored artifact folder.

```powershell
node scripts/marketing/prepare-weekend-v2.mjs --v4
node scripts/marketing/openrouter-voice.mjs --v4 --key-stdin
node scripts/marketing/align-continuous-voice.mjs
node scripts/marketing/render-date-night.mjs --weekend-v4 --preview-only
node scripts/marketing/render-date-night.mjs --weekend-v4
```

Default output `.media-cache/marketing/sarvnema-weekend-v4/`; override
`WEEKEND_V4_OUTPUT`. Secure stdin/environment key handling remains unchanged—no
credential arguments, persistence or printing. TTS has a $0.20 estimate ceiling;
this take's quoted estimate was $0.02024, not a final billing total. The paid ASR
check is separate. Audio and transcript caches are bound to the full request hash.

The initial large MP3 transcription requests timed out. The helper creates a small
mono 16kHz / 20kbps Opus file only for ASR upload; the final mix uses the original
44.1kHz MP3, not the compressed analysis copy. A retry reuses the existing TTS
audio rather than regenerating it. No automatic paid retry loops.

Word-aligned cuts are generated from the transcript. Missing/unordered anchors,
stale transcripts and overlong audio fail validation. The renderer retains the
continuous audio intact and remaps the motion/music transition cues to word timing.
The free-feature qualification, synthetic-media disclosure, original 150 BPM
score and Alibaba typography remain. No website or Instagram publication.

Outputs include final H.264/AAC MP4, isolated male narration MP3, cover JPG,
caption, SRT, source/request/ASR/render manifests and six storyboards. Render
validation checks exact duration/540 frames, fast-start, BT.709, browser playback
and audio headroom. Font binaries and generated assets are not committed.

```powershell
node --test scripts/tests/weekend-v4-reel.test.mjs scripts/tests/weekend-v3-reel.test.mjs scripts/tests/weekend-v2-reel.test.mjs scripts/tests/weekend-reel.test.mjs scripts/tests/date-night-reel.test.mjs scripts/tests/reel-soundtrack.test.mjs
npx eslint scripts/marketing/*.mjs scripts/tests/weekend-v4-reel.test.mjs --max-warnings=0
```

Official API guidance: [Eleven v4 performance/IPA controls](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)
and [OpenRouter word-level transcription](https://openrouter.ai/docs/guides/overview/multimodal/stt).
