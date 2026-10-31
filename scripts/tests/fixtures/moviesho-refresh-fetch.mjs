const row = (href, size = "-") => `<tr><td><a href="${href}">${href}</a></td><td class="size">${size}</td></tr>`;
const listing = content => `<html><title>Index of</title><table>${content}</table></html>`;
const media = "https://sr1.moviesho.com/Movie/2026/10/Example.2026.1080p.Farsi.Dubbed.mkv";
globalThis.fetch = async value => {
  const url = new URL(value);
  if (url.hostname === "sr1.moviesho.com") {
    if (url.pathname === "/Movie/") return new Response(listing(row("2026/")));
    if (url.pathname === "/Movie/2026/") return new Response(listing(row("10/")));
    if (url.pathname === "/Movie/2026/10/") return new Response(listing(row(media.split("/").at(-1), "1 GB")));
    if (url.pathname === "/Series/") return new Response(listing(""));
  }
  if (url.hostname === "www.moviesho.com") {
    if (url.pathname === "/wp-json/wp/v2/search") return Response.json([{ url: "https://www.moviesho.com/example-2026/", title: "Example 2026", subtype: "post" }]);
    if (url.pathname === "/example-2026/") return new Response(`<a href="https://www.imdb.com/title/tt1234567/">IMDb</a><a href="${media}">1080p</a>`);
  }
  throw new Error(`Unexpected fixture request: ${url.href}`);
};
