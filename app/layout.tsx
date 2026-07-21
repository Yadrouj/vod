import type { Metadata, Viewport } from "next";
import { AppMessageCenter } from "@/components/app-message-center";
import { WatchTogetherLauncher } from "@/components/watch-together-launcher";
import { BRAND_DESCRIPTION, BRAND_MARK, BRAND_NAME, BRAND_SLOGAN } from "@/lib/brand";
import { isRtl } from "@/lib/i18n";
import { getLocale } from "@/lib/server-locale";
import "./globals.css";
import "./watch-together-overrides.css";

export const metadata: Metadata = {
  title: {
    default: BRAND_NAME,
    template: `%s | ${BRAND_NAME}`,
  },
  description: `${BRAND_SLOGAN} ${BRAND_DESCRIPTION}`,
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
