# SarvNema — cinematic date-night reel

A second, distinct 36-second Persian vertical reel (1080×1920, 30fps). The story
introduces two films, then invites a partner into SarvNema's free watch-together
feature. Features real promotional film images, scrolling scene transitions,
parallax, kinetic Persian type, animated invitation/synchronization graphics,
and an original 120 BPM cinematic electronic soundtrack. No movie/trailer audio
or commercial music recording is included. Images remain their owners' work;
their public availability is not a blanket advertising licence.

## Editorial verification — 2026-11-15

- **The Odyssey**: Christopher Nolan; Matt Damon; a mythic voyage home.
  [Universal's official page](https://www.universalpicturesathome.com/movies/the-odyssey-2026)
  lists official digital release as **November 17, 2026**. Both narration and the
  visible movie card say this; the reel does not claim it is digitally available
  on the verification date. Recheck this date before later publication.
- **Project Hail Mary**: Ryan Gosling; a science teacher must solve the mystery
  of a dying sun to save Earth. Streaming release verified through
  [Amazon MGM's announcement](https://www.aboutamazon.com/news/entertainment/project-hail-mary-ryan-gosling-amazon-mgm-studios).
- Both appear in [IMDb's popular adventure-epic chart](https://www.imdb.com/chart/titles/in0000015/).
  No exact current weekly rank or rating is invented or burned into the reel.
- **Free** applies to the SarvNema watch-together feature, not the rights to
  films, third-party subscriptions or Internet service. This qualification is
  included visibly and in the suggested caption. Film source availability varies.

The room-creation image is an existing real local product capture, not a fake
screen showing a film actually streaming. The two participant icons illustrate
the feature; they are not user testimonials or recordings of private rooms.

## Voice and sound

Narration uses **fa-IR-FaridNeural**, the Iranian Persian male synthetic voice,
not a clone or a recording of any actor. Voice locale/gender are listed in
[Microsoft's voice documentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support).
Generated through the [edge-tts client](https://github.com/rany2/edge-tts) using
only the public promotional script. The synthetic narration is disclosed in the
video, MP4 metadata and caption. No account credentials are needed or embedded.
Consider applicable provider terms and image permissions before paid advertising.

All six utterances have measured durations and are placed in non-overlapping
windows. If a clip exceeds its window, a small tempo adjustment fits it; the
renderer rejects adjustment above 1.28× instead of silently cutting words.
Music ducks underneath narration. Speech is EQ'd/compressed and the complete
mix is normalized toward −16 LUFS with true-peak headroom.

## Reproduce

Existing first-reel product captures are reused; if absent, run
`scripts/marketing/capture-product.mjs` against the local preview first.
Use the same isolated FFmpeg and Playwright setup as [the first reel](marketing-reel.md).
The application and production server are not changed.

```powershell
python -m pip install --target .media-cache/reel-tools/voice-python edge-tts==7.3.1
$env:PLAYWRIGHT_MODULE='C:\path\to\playwright-core\index.mjs'
node scripts/marketing/prepare-date-night.mjs
python scripts/marketing/synthesize-date-night.py
node scripts/marketing/render-date-night.mjs --preview-only
node scripts/marketing/render-date-night.mjs
node --test scripts/tests/date-night-reel.test.mjs scripts/tests/reel-soundtrack.test.mjs
npx eslint scripts/marketing/*.mjs scripts/tests/date-night-reel.test.mjs --max-warnings=0
```

`DATE_NIGHT_OUTPUT` overrides the ignored default artifact folder
`.media-cache/marketing/sarvnema-date-night/`. `FFMPEG_BINARY` and
`PLAYWRIGHT_CHANNEL` override local tools. No application dependency is added.

Outputs: MP4, cover, six scene previews, Persian SRT, suggested caption, narration
text, original score, individual voice clips, final mix and source/render manifests.
The renderer checks all 1080 frames, duration, H.264/AAC, limited-range BT.709,
fast-start MP4 atom order, actual Edge playback, and final audio true-peak level.
Only reproducible scripts, plan, tests and docs go to Git; generated media stays
local. Nothing is posted to Instagram or deployed to production automatically.
