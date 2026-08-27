import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "سرونما | فیلم، سریال و موسیقی";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const font = await readFile(join(process.cwd(), "public/fonts/IRANSansXFaNum-Bold.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          color: "#ffffff",
          background: "radial-gradient(circle at 84% 14%, #24583d 0%, #111615 30%, #050505 74%)",
          fontFamily: "IranSans",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px", color: "#9cf1bb", fontSize: 30 }}>
          <span style={{ width: 22, height: 22, borderRadius: 999, background: "#9cf1bb", boxShadow: "0 0 38px #9cf1bb" }} />
          SARVNEMA.IR
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ fontSize: 82, fontWeight: 700, lineHeight: 1.25 }}>سرونما</div>
          <div style={{ fontSize: 40, color: "#d6d6d6" }}>فیلم، سریال و موسیقی؛ هر داستان در یک قاب روشن</div>
        </div>
        <div style={{ display: "flex", gap: "15px", color: "#b4f7cb", fontSize: 27 }}>
          <span>پخش آنلاین</span><span>•</span><span>تماشای هم‌زمان</span><span>•</span><span>موسیقی جدید</span>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "IranSans", data: font, weight: 700 }] },
  );
}
