import type { Metadata, Viewport } from "next";
import { AppMessageCenter } from "@/components/app-message-center";
import { WatchTogetherLauncher } from "@/components/watch-together-launcher";
import { BRAND_DESCRIPTION, BRAND_MARK, BRAND_NAME, BRAND_SLOGAN } from "@/lib/brand";
import { isRtl } from "@/lib/i18n";
import { getLocale } from "@/lib/server-locale";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";
import "./watch-together-overrides.css";
import "./mobile-ux-overrides.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: BRAND_NAME,
    template: `%s | ${BRAND_NAME}`,
  },
  description: `${BRAND_SLOGAN} ${BRAND_DESCRIPTION}`,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  keywords: ["دانلود فیلم", "دانلود سریال", "دانلود آهنگ", "پخش آنلاین فیلم", "پخش آنلاین موسیقی", "تماشای همزمان", "شنیدن همزمان"],
  applicationName: BRAND_NAME,
  icons: {
    icon: BRAND_MARK,
    apple: BRAND_MARK,
  },
  openGraph: {
    title: BRAND_NAME,
    description: `${BRAND_SLOGAN} ${BRAND_DESCRIPTION}`,
    siteName: BRAND_NAME,
    type: "website",
  },
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
      <body>
        {children}
        <WatchTogetherLauncher locale={locale} />
        <AppMessageCenter />
      </body>
    </html>
  );
}
