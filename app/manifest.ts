import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "سرونما | موتور جستجوی فیلم، سریال و موسیقی",
    short_name: "سرونما",
    description: "موتور جستجوی فیلم، سریال و موسیقی؛ پیدا کردن آثار، منابع دانلود و پخش آنلاین در سرونما.",
    start_url: "/",
    id: "/",
    scope: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    lang: "fa-IR",
    dir: "rtl",
    categories: ["entertainment", "music", "video"],
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/brand/sarvnema-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "فیلم و سریال", url: "/browse" },
      { name: "موسیقی", url: "/music" },
    ],
  };
}
