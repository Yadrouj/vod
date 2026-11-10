import { fetchHostedFile, hostedCoverUrl, loadHostedMusic } from "@/lib/hosted-music";

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^hosted-[a-f0-9]{20}$/.test(id)) return new Response(null, { status: 404 });
  const track = (await loadHostedMusic())?.tracks.find(t => t.id === id);
  if (!track) return new Response(null, { status: 404 });
  const url = hostedCoverUrl(track);
  if (url) {
    try {
      const upstream = await fetchHostedFile(url, new Headers({ Accept: "image/*" }), request.signal);
      const type = upstream.headers.get("content-type")?.split(";")[0];
      if (upstream.ok && ["image/jpeg", "image/png", "image/webp"].includes(type || "")) {
        return new Response(upstream.body, { headers: { "Content-Type": type!, "Cache-Control": "public, max-age=86400, s-maxage=604800", "X-Content-Type-Options": "nosniff" } });
      }
      await upstream.body?.cancel();
    } catch { /* A temporary artwork outage should not break music playback. */ }
  }
  // Original code-native archive artwork, never presented as an authentic album cover.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#163d35"/><stop offset="1" stop-color="#11171f"/></linearGradient></defs><rect width="600" height="600" fill="url(#g)"/><circle cx="300" cy="235" r="130" fill="none" stroke="#bce8ce" stroke-opacity=".25" stroke-width="35"/><circle cx="300" cy="235" r="30" fill="#bce8ce"/><text x="300" y="440" fill="#fff" text-anchor="middle" font-family="sans-serif" font-size="28">${escape(track.artist.name.slice(0, 35))}</text><text x="300" y="485" fill="#bce8ce" text-anchor="middle" font-family="sans-serif" font-size="19">${escape((track.album?.title || track.title).slice(0, 42))}</text><text x="300" y="555" fill="#a4b8b2" text-anchor="middle" font-family="sans-serif" font-size="16">SARVNEMA · ARCHIVE ARTWORK</text></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox", "X-Content-Type-Options": "nosniff" } });
}
