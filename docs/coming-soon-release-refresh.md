# Coming-soon and publisher refresh

Checked on 2026-11-10: the three reported FamilyMovie entries had empty local
links, but their public `/api/media/single?id=...` records supplied releases:
VisionQuest 70, Carrie 64, Nocturne 15. A HEAD request to one file per title
returned HTTP 200, video/x-matroska, and approximately 0.99/1.24/1.36 GB. This
verifies file availability, not complete viewing or codec compatibility.

Detail pages now show a coming-soon notice only if there are no release download
links or playable external references. It is calculated, not a permanent tag.
Existing FamilyMovie catalogue records with no fresh files are refreshed from
that publisher's fixed public endpoint when opened. Title, year, type and source
ID must match; dead, trailer and soon-expiring downloads are excluded using the
existing source adapter. Fresh releases avoid the extra request. Requests are
coalesced, cached for five minutes, time out after eight seconds, and back off
one minute after failures. No authentication or private endpoint is used.

Known live counts feed subsequent index reads and discovery cards. Homepage
computed-data caching can delay the visible card update by up to its 30-second
refresh period. This is not a claim of continuously polling every publisher.
The existing scheduled public-source scraper continues rebuilding the catalogue
and indexes independently. Publisher failures retain existing catalogue links.
