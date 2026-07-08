import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  RangeRequestsPlugin,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // The bundled exercise dataset (too large for the precache) — cache at runtime so
    // the library works offline after first load.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith("/data/"),
      handler: new StaleWhileRevalidate({ cacheName: "exercise-data" }),
    },
    // Demo videos come through our same-origin proxy (/api/media). Cache them so
    // recently-watched clips replay offline; RangeRequestsPlugin serves seeks from cache.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith("/api/media"),
      handler: new CacheFirst({
        cacheName: "musclewiki-video",
        plugins: [
          new RangeRequestsPlugin(),
          new ExpirationPlugin({
            maxEntries: 120,
            maxAgeSeconds: 30 * 24 * 60 * 60,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // Map tiles for the "nearby gyms" feature (CARTO dark basemap). CacheFirst so
    // browsed areas — and an explicit "download offline Tehran map" — persist offline.
    {
      matcher: ({ url }) => url.hostname.endsWith("basemaps.cartocdn.com"),
      handler: new CacheFirst({
        cacheName: "map-tiles",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 4000,
            maxAgeSeconds: 60 * 24 * 60 * 60,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // Poster/thumbnail images load fine cross-origin — cache them too.
    {
      matcher: ({ url }) => url.hostname === "media.musclewiki.com",
      handler: new CacheFirst({
        cacheName: "musclewiki-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 300,
            maxAgeSeconds: 30 * 24 * 60 * 60,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
