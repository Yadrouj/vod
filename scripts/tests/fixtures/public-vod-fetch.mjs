// Network-free public API fixture. Fail closed for every unlisted request.
globalThis.fetch = async (value, options = {}) => {
  const url = new URL(value);
  if (url.hostname !== "familymovie.tr" || (options.method && options.method !== "GET")) throw new Error("Unexpected fixture request");
  if (url.pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /api/auth/\n", { status: 200 });
  if (url.pathname === "/api/media") {
    const offset = Number(url.searchParams.get("offset"));
    const items = [1,2,3].slice(offset, offset + 2).map(id => ({ id: String(id), title: `Fixture Film ${id}`, type: "movie", year: "2026", updatedAt: "2026-10-31T00:00:00Z" }));
    return Response.json({ items, total: 3, hasMore: offset + items.length < 3 });
  }
  if (url.pathname === "/api/media/single") {
    const id = url.searchParams.get("id");
    if (id === process.env.PUBLIC_VOD_FIXTURE_FAIL_ID) return new Response("Temporarily unavailable", { status: 503 });
    return Response.json({ id, title: `Fixture Film ${id}`, type: "movie", year: "2026", updatedAt: "2026-10-31T00:00:00Z", downloads: [
      { quality: "1080p", url: `https://cdn.example/Fixture.Film.${id}.2026.1080p.SoftSub.mkv?md5=fixture&expires=${Math.floor(Date.now()/1000) + 86400}` },
      { quality: "720p", url: `https://cdn.example/Fixture.Film.${id}.2026.Trailer.mp4` },
    ] });
  }
  throw new Error(`Unexpected fixture path: ${url.pathname}`);
};
