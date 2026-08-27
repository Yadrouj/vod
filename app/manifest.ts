import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "سرونما | فیلم، سریال و موسیقی",
    short_name: "سرونما",
    description: "جستجو، پخش آنلاین و پیدا کردن فیلم، سریال و موسیقی در سرونما.",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    lang: "fa-IR",
    dir: "rtl",
    categories: ["entertainment", "music", "video"],
    icons: [
      { src: "/brand/sarvnema-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
