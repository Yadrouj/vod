/** Exact, accent/punctuation-insensitive identity matching. No substring joins. */
export function identityKey(value) {
  return String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function matchingArtistSlugs(artists, profile) {
  const keys = new Set([profile.name, profile.nameFa, profile.slug, ...(profile.aliases || [])].map(identityKey).filter(Boolean));
  return artists.filter(artist => [artist.name, artist.slug, ...(artist.aliases || [])].some(name => keys.has(identityKey(name)))).map(artist => artist.slug);
}

export function recordingKey(value) {
  return identityKey(String(value || '').replace(/\((?:\d{4}\s+)?(?:re-?master(?:ed)?|mono|stereo|original version)[^)]*\)/gi, ''));
}

/** Only compare works already attributed to the verified singer. */
export function findRecordingMatch(recording, tracks, aliases = []) {
  const expected = recordingKey(recording.title);
  return tracks.find(track => [track.title, track.persianTitle].filter(Boolean).some(title => {
    if (recordingKey(title) === expected) return true;
    return aliases.some(alias => {
      const prefix = `${alias} - `;
      return title.toLowerCase().startsWith(prefix.toLowerCase()) && recordingKey(title.slice(prefix.length)) === expected;
    });
  })) || null;
}
