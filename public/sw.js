/* Only the offline shell is cached. Never persist RSC, rooms, APIs, or media. */
const SHELL_CACHE = "sarvnema-offline-v1";
self.addEventListener("install", event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.add("/offline.html")));
  // No skipWaiting: an update must not replace an active playback session.
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("sarvnema-offline-") && key !== SHELL_CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || request.mode !== "navigate" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || request.headers.has("range")) return;
  // Let file/download navigations fail normally instead of returning HTML as media.
  if (!/^(?:\/|\/browse|\/music(?:\/[^.]*)?|\/watch(?:-together)?\/[^./]+|\/tt\d+)$/.test(url.pathname)) return;
  event.respondWith(fetch(request).catch(async () => (await caches.match("/offline.html")) || new Response("Offline", { status: 503 })));
});
