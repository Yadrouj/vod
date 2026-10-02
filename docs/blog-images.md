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

No claim is made that these covers are actual stills from the linked films or photographs of a particular festival. Category-level cover reuse is intentional; the articles retain distinct titles, copy, topics and related works.

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
