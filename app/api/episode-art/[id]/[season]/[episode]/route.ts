type Props = {
  params: Promise<{ id: string; season: string; episode: string }>;
};

export const runtime = "nodejs";

const palettes = [
  ["#172a46", "#5f2c82", "#f2c14e"],
  ["#321f3f", "#b23a48", "#ffd166"],
  ["#123d4a", "#087e8b", "#f5b700"],
  ["#1d3557", "#457b9d", "#f1faee"],
  ["#392f5a", "#9e4770", "#f4d35e"],
  ["#253237", "#5c6b73", "#e0fbfc"],
];

export async function GET(_request: Request, { params }: Props) {
  const { id, season, episode } = await params;
  if (!/^tt\d+$/.test(id) || !/^\d{1,3}$/.test(season) || !/^\d{1,3}$/.test(episode)) return new Response(null, { status: 404 });

  const seasonNumber = Number(season);
  const episodeNumber = Number(episode);
  const palette = palettes[(seasonNumber * 97 + episodeNumber * 31 + id.length) % palettes.length];
  const code = `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
  const label = escapeXml(id.toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-labelledby="title">
  <title id="title">${code} episode artwork</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette[0]}"/><stop offset="0.55" stop-color="${palette[1]}"/><stop offset="1" stop-color="#090b12"/></linearGradient>
    <radialGradient id="glow" cx="78%" cy="18%" r="70%"><stop stop-color="${palette[2]}" stop-opacity=".72"/><stop offset="1" stop-color="${palette[2]}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="640" height="360" fill="url(#bg)"/>
  <rect width="640" height="360" fill="url(#glow)"/>
  <circle cx="522" cy="90" r="112" fill="none" stroke="${palette[2]}" stroke-opacity=".3" stroke-width="2"/>
  <circle cx="522" cy="90" r="76" fill="none" stroke="${palette[2]}" stroke-opacity=".22" stroke-width="16"/>
  <path d="M0 298 C130 236 205 342 330 278 S514 237 640 292 V360 H0Z" fill="#05070c" fill-opacity=".55"/>
  <text x="42" y="58" fill="${palette[2]}" font-family="Arial,sans-serif" font-size="16" font-weight="700" letter-spacing="4">SARVNEMA · EPISODE ART</text>
  <text x="42" y="220" fill="#fff" font-family="Arial,sans-serif" font-size="82" font-weight="800">${code}</text>
  <text x="46" y="258" fill="#fff" fill-opacity=".68" font-family="Arial,sans-serif" font-size="14" letter-spacing="3">${label}</text>
  <text x="42" y="320" fill="#fff" fill-opacity=".72" font-family="Arial,sans-serif" font-size="15">Unique artwork generated for this episode</text>
</svg>`;
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
