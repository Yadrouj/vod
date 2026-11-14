# SarvNema — cinematic Persian Instagram reel

A 30-second, 1080×1920, 30fps first-cut product reel. Black/ivory/gold brand
palette, real product captures, Persian typography, restrained motion, original
procedural ambient/piano soundtrack and no narration. Music gets a mint accent.
This is a local marketing artifact, not a site change or an Instagram upload.

## Story

| Time | Message | Visual |
| --- | --- | --- |
| 0–3.5s | امشب، چی ببینیم؟ | Actual catalog artwork, cinematic type |
| 3.5–9s | اسمش دقیق یادت نیست؟ | Genuine `breakng bud` → Breaking Bad search |
| 9–16s | دوریم؛ ولی با هم می‌بینیم | Series page and actual private-room setup |
| 16–22s | فقط دیدن نیست. وقتِ شنیدنه | Original vinyl graphic and actual product controls |
| 22–26s | فیلم. سریال. موسیقی. | Kinetic typography over the actual catalog |
| 26–30s | سرونما؛ موتور جستجوی فیلم، سریال و موسیقی | Existing logo and sarvnema.ir |

Artwork belongs to its original owners and appears incidentally in genuine
product demonstrations. No film/trailer footage or commercial song recording
was copied into the reel. The vinyl graphic is a promotional illustration, not
an invented app screen. Participant initials are illustrative, not testimonials.
The soundtrack contains synthesized notes/percussion, without external samples.

## Reproduce

Start the local production preview on port 3004. Install FFmpeg in an isolated,
ignored tool folder if it is not already available (the [imageio-ffmpeg project](https://github.com/imageio/imageio-ffmpeg)
ships binaries in its wheels):

```powershell
python -m pip install --target .media-cache/reel-tools/python --no-deps imageio-ffmpeg==0.6.0
$env:PLAYWRIGHT_MODULE='C:\path\to\playwright-core\index.mjs'
node scripts/marketing/render-instagram-reel.mjs --capture --preview-only
node scripts/marketing/render-instagram-reel.mjs
```

`FFMPEG_BINARY` and `PLAYWRIGHT_CHANNEL` can override the tools. Capture accepts
only loopback `REEL_BASE_URL`, does not sign into accounts, create rooms, post to
Instagram, or download film/audio streams. Existing production data stays intact.
`REEL_OUTPUT` selects the output folder; default:
`.media-cache/marketing/sarvnema-cinematic/`.

Outputs include MP4 (H.264 high/yuv420p/BT.709 + AAC stereo 48kHz, fast-start),
cover JPG, six storyboard JPGs, Persian SRT, suggested caption, soundtrack WAV,
and an output/capture manifest. The renderer decodes the finished video and checks
its streams/resolution/duration. Rendering runs offline after public screenshots
are captured; generated binaries/media are ignored and not deployed to the site.

## Verification

```powershell
node --test scripts/tests/reel-soundtrack.test.mjs
npx eslint scripts/marketing/*.mjs scripts/tests/reel-soundtrack.test.mjs --max-warnings=0
```

The delivered export was also played in a real headless Edge browser: 30 seconds,
1080×1920, no media error, playback time advancing. All 900 frames decoded without
errors. The MP4 places `moov` before `mdat` for fast-start playback. Full-range
browser JPEGs are converted to limited-range BT.709 before encoding; the browser
ICC profile is removed so phones do not inherit conflicting color metadata.
Audio is normalized toward −16 LUFS, with a −1.5 dBTP ceiling. The soundtrack
test checks deterministic stereo output, a silent start and non-clipping samples.
