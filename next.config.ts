import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // Serwist injects a webpack config; declaring an (empty) turbopack config lets
  // `next dev` keep using Turbopack without the "webpack config, no turbopack config" error.
  turbopack: {},
};

// Serwist uses a webpack plugin, so production builds must run with `next build --webpack`
// (see the "build" script). Disabled in dev so `next dev` stays on Turbopack.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  cacheOnNavigation: true,
  reloadOnOnline: true,
});

export default withSerwist(nextConfig);
