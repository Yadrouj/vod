import type { Metadata, Viewport } from "next";
import { isRtl } from "@/lib/i18n";
import { getLocale } from "@/lib/server-locale";
import "./globals.css";

export const metadata: Metadata = {
  title: "VOD Archive",
  description: "Search films and series matched from IMDb data and DonyayeSerial links.",
  applicationName: "VOD Archive"
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"}>
      <body>{children}</body>
    </html>
  );
}
