import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Loopback aliases used by local browser tests; never allow arbitrary origins.
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  poweredByHeader: false,
  compress: true,
  async rewrites() {
    return [{ source: '/sitemap-:id(\\d+).xml', destination: '/sitemap/:id.xml' }];
  },
  async headers() {
    return [
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }] },
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/brand/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
