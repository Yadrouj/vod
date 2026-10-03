# Magazine image generation record

Mode: new image generation using the built-in image generation tool; no reference image, no celebrity likeness, no existing logo modification. All four returned images were visually inspected. Sharp was used only for aspect-preserving resize/format conversion to 1600×900 WebP (quality 85), not image composition or semantic editing. The illustrations are explicitly labeled in the article UI and editorial policy.

Assets are stored under `public/media/magazine/` and covered by the repository's Git LFS rule. Fetch LFS objects during deployment, not only their text pointers.

| Asset | Role |
| --- | --- |
| editorial-cinema-music.webp | Cinema, series and general editorial cover |
| music.webp | Music and artist articles |
| festivals.webp | Festival guides; fictional venue, not a documentary event photograph |
| together.webp | Shared viewing/listening guides |

Prompt record (production descriptions):

1. **Cinema and music:** photorealistic-natural wide 16:9 premium Persian film/music magazine hero; sophisticated still life of an analog film projector, vinyl turntable and headphones on a dark walnut desk, warm projection beam and softly lit cinematic backdrop; deep evergreen, amber accents, natural grain, realistic materials, ample breathing room; no lettering, logos, watermark or celebrity faces.
2. **Music:** premium photorealistic wide 16:9 editorial still life of a vinyl turntable, headphones and carefully arranged records with subtle Persian textile detail; deep green interior, warm golden light, tactile realistic materials; tasteful contemporary composition, no text, logos, watermark or recognizable celebrity.
3. **Festivals:** premium photorealistic wide 16:9 editorial illustration of a generic film-festival venue and red carpet at blue hour; subtle warm lights, cinematic architectural composition, elegant atmosphere; no actual branded festival venue, no readable text, logos, watermark or identifiable celebrities.
4. **Together:** premium photorealistic wide 16:9 editorial illustration of friends seen from behind enjoying a shared film evening, a television and laptop suggesting remote company, cozy contemporary room; evergreen and warm gold accents, natural light and believable materials; no readable interfaces, text, logos, watermark or recognizable people.

No claim is made that these covers are actual stills from the linked films or photographs of a particular festival. These initial category-level covers are retained as historical assets; the new 30-article collection below supersedes their shared use.

## Branded editorial revision — 2026-10-03

Mode: built-in image editing, one call per cover. Image 1 was each existing cover above; Image 2 was a PNG format conversion of `public/brand/sarvnema-logo.svg`. The actual logo and all input/output images were visually inspected. Sharp only resized and converted returned images (WebP quality 85, 1599×900); it did not add the logo or alter the scene. Originals remain in place. Four topic-level covers serve all 30 articles; these are not 30 different illustrations.

Shared final prompt:

> Edit Image 1, a SarvNema magazine article cover. Image 2 is the real SarvNema logo identity reference, NOT an edit target. Preserve the entire photographic scene, subjects, colors, composition and wide 16:9 framing of Image 1. Add only a small tasteful publisher signature in the upper right corner with generous 5% edge padding: the exact white cypress play symbol from Image 2 beside the exact wordmark 'SarvNema'. Omit the tagline entirely. Signature should be subtle but clearly legible, approximately 15% of image width, over a very soft dark translucent backing only if needed for contrast. No article title, no other text, no other changes. Professional editorial branding suitable for a Persian cinema and music magazine.

Selected project assets:

- `public/media/magazine/editorial-cinema-music-branded.webp`
- `public/media/magazine/music-branded.webp`
- `public/media/magazine/festivals-branded.webp`
- `public/media/magazine/together-branded.webp`

Generated originals are retained in the session's generated-images directory. Branded versions use new paths to avoid immutable-cache collisions.

## Thirty individual article banners — 2026-10-03

Every first-month article now has its own asset at `public/media/magazine/articles/{slug}.webp`. There are 30 distinct files, not four reused images. Final production prompts, topic motifs and archive-reference URLs are recorded in `content/magazine/image-plan.json`.

Mode: built-in imagegen, one call per article. Existing film stills/posters were used as supporting references where available; the SarvNema logo was the brand reference. The banners are AI-assisted editorial designs, not newly discovered film stills or documentary photographs. All selected outputs were inspected. A conceptual cover was selected for the character-development essay; original Breaking Bad photographs remain in the article's separate title gallery. The artist-memory cover uses blank music packaging rather than an invented album or artist portrait.

Sharp performs resize/format conversion only: 1600×900 WebP, quality 85. Artwork and publisher-logo placement are generated by imagegen. `scripts/tests/magazine-banners.test.mjs` checks dimensions, format, size and 30 different SHA-256 hashes. All assets remain under Git LFS.

The article gallery reads the current full title record used by the About tab: up to two original photographs per title and up to three related titles. Original photos are mirrored as small WebP assets under `public/media/magazine/stills/` using `node --import tsx scripts/cache-magazine-stills.mjs` (resize/format only, no AI edits). The manifest matches each exact source URL and title ID; newly changed galleries fall back to the current source, never to a different film's cached photo. Full-size original links remain available.

Only named trailers/teasers/previews qualify. Valid direct trailer URLs use an inline mobile-friendly video with no autoplay or eager download. Expired signed URLs are omitted; the original IMDb video page is offered when an actual video ID exists. Playback errors retain that fallback instead of leaving a broken video.

Discovery URLs:

- Main sitemap index: `https://sarvnema.ir/sitemap.xml`
- Magazine sitemap, including published article covers: `https://sarvnema.ir/mag/sitemap.xml`
- Archive parts: `https://sarvnema.ir/sitemap/0.xml`, `https://sarvnema.ir/sitemap/1.xml` (the index follows the actual part count).

Drafts and future articles are not included. Daily publishing remains at 09:00 Asia/Tehran; revising a cover preserves its original publication date and does not publish the next queued article.
