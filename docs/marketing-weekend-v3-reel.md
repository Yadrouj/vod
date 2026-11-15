# Weekend reel v3 — fast ad and corrected SarvNema pronunciation

18-second 1080×1920 / 30fps revision. The 33-second v2 and 30-second original
exports remain intact. The message is shorter, photo punch-ins and typography
arrive faster, transitions take 240ms instead of 440ms, and the original score
runs at 150 BPM instead of 120. Voice is still Eleven v4 / Jessica via OpenRouter,
using excited/rushed short sentences, with pitch-preserving 1.09× post-production
tempo (up to 1.28× only if a measured clip requires it). The brand take itself is
not requested with the rushed tag. Alibaba fonts and selected original artwork stay.

## Brand pronunciation

**Sarv** means the cypress tree; it ends in the consonant /v/. It is not “sar o”
or “sar va”. Readable text/captions use `سرونما`. TTS uses
`/sæɾv/ /neˈmɒː/` separately from the readable caption; this does not insert the
Persian conjunction. Eleven v4 supports slash-delimited IPA natively. See
[official pronunciation controls](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices#ipa-with-eleven-v4).

Several short variants were tested rather than asserting that adding diacritics
was enough. The selected take's unprompted Scribe v2 transcription was
`سرو نما! همین الان شروع کن`, without a conjunction. Other spellings produced
ambiguous ASR output and were rejected. ASR is a sanity check, not a human acoustic
or phonetic guarantee; this environment cannot listen to audio. The selected raw
voice clip is included locally for listening. Voice generation IDs and request
hashes are retained, with no credentials in files or Git.

## Reproduce

Prerequisites and key safety: [v2 tooling](marketing-weekend-v2-reel.md).

```powershell
node scripts/marketing/prepare-weekend-v2.mjs --v3
node scripts/marketing/openrouter-voice.mjs --v3 --key-stdin
node scripts/marketing/render-date-night.mjs --weekend-v3 --preview-only
node scripts/marketing/render-date-night.mjs --weekend-v3
```

Default output: `.media-cache/marketing/sarvnema-weekend-v3/`, override
`WEEKEND_V3_OUTPUT`. Set `PLAYWRIGHT_MODULE` / `FFMPEG_BINARY` if needed as in v2.
No key is needed for rendering existing audio. A six-clip initial script estimate
was about $0.021; extra pronunciation probes/transcriptions are additional tiny
paid requests, not included in that initial estimate. This is not a billing total.

Optional, explicit paid QA commands (never run automatically during rendering):

```powershell
node scripts/marketing/openrouter-voice.mjs --v3 --verify-pronunciation --key-stdin
node scripts/marketing/openrouter-voice.mjs --v3 --pronunciation-candidates --key-stdin
# After setting the plan to exactly match the selected take, copy it without API use:
node scripts/marketing/select-weekend-voice.mjs 1
```

The second command generates three short brand takes and transcribes each without
a spelling hint. Selection checks the entire request and SHA-256 signature, so an
old or differently pronounced take cannot silently be assigned to the new plan.

Deliverables include MP4, cover, caption, SRT, selected voice MP3, six storyboard
images and source/voice/render/ASR manifests. Free applies to the watch-together
feature, not licences or access to every film; the qualification/disclosure remains
in video and caption. No Instagram or website publication.

## Verification

```powershell
node --test scripts/tests/weekend-v3-reel.test.mjs scripts/tests/weekend-v2-reel.test.mjs scripts/tests/weekend-reel.test.mjs scripts/tests/date-night-reel.test.mjs scripts/tests/reel-soundtrack.test.mjs
npx eslint scripts/marketing/*.mjs scripts/tests/weekend-v3-reel.test.mjs --max-warnings=0
```

The render checks all 540 frames, exact 18-second duration, H.264/AAC decode,
BT.709, fast-start, browser playback and true-peak headroom. Original/v2 previews
are regression-checked; no prior final MP4 is overwritten.
