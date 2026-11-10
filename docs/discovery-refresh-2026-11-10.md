# Discovery refresh — 2026-11-10

- News: ran `node scripts/scrape-vod-news.mjs`; 20 dated headlines retained,
  including a complete ten-item Tehran-day selection for November 10. Publisher
  dates are preserved, never rewritten to make old stories look new.
- Home: added a dated discovery strip, a weekly IMDb selection and a rail sorted
  by actual source/catalog modification timestamps. The weekly selection matches
  title, year and media type against existing routes; absent works are skipped.
- IMDb's direct movie and TV chart requests returned HTTP 202 challenges. The
  old September chart was not re-dated or presented as today's ranking. The new
  fallback cites IMDb's November 2 weekly report, for the week ending October 31:
  https://www.imdb.com/fr-ca/news/ni66091836/
  It is labelled as weekly, not live, and expires after 30 days. Direct refresh
  remains in the existing maintenance workflow and will take priority when valid.
- Banner: validated actual landscape artwork for MobLand (1920×1080) and
  The Terminal List (2133×1200). Weekly/recently updated titles with validated
  artwork lead the fallback hero; low-resolution posters are not stretched.
- Music: hosted arrivals now lead the hero; a dated strip links to arrivals,
  foreign music, playlists and artists. Newly imported recordings are explicitly
  distinguished from newly released songs. Existing catalogs were not rewritten.
- Kids: removed the homepage header shortcut, homepage kids rail and the kids
  shortcut in the homepage mobile library. The kids routes and data still exist.
- Mobile playback: kept the 16:9 picture, added breathing room below the watch
  header, and reserved a separate control area below inline portrait video.
  The center play button and tap surface use the picture area, not the controls.
  Shared room controls reserve additional space for chat/reactions. Fullscreen
  and landscape retain their overlay controls, without the inline reserve.

Validation: TypeScript; targeted ESLint (existing raw-image warning in NewsRail);
category/discovery unit tests; browser checks at 320, 390 and 430 pixels with no
horizontal overflow and no center-button/control overlap; homepage kids links
absent; weekly, updates, music and banner sections present.
