import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { AppMessageCenter } from "@/components/app-message-center";
import { StructuredData } from "@/components/structured-data";
import { WatchTogetherLauncher } from "@/components/watch-together-launcher";
import { BRAND_MARK, BRAND_NAME } from "@/lib/brand";
import { isRtl } from "@/lib/i18n";
import { siteJsonLd } from "@/lib/landing-seo";
import { getLocale } from "@/lib/server-locale";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";
import "./watch-together-overrides.css";
import "./mobile-ux-overrides.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "سرونما | دانلود فیلم، سریال و موسیقی جدید",
    template: `%s | ${BRAND_NAME}`,
  },
  description: "سرونما؛ مرجع فارسی جستجو، اطلاعات، پخش آنلاین و لینک منبع فیلم، سریال، قسمت جدید و موسیقی.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  keywords: ["دانلود فیلم", "دانلود سریال", "دانلود آهنگ", "فیلم جدید", "سریال جدید", "قسمت جدید سریال", "موزیک جدید", "پخش آنلاین فیلم", "پخش آنلاین موسیقی", "تماشای هم‌زمان", "شنیدن هم‌زمان موسیقی"],
  applicationName: BRAND_NAME,
  authors: [{ name: "سرونما" }],
  creator: "سرونما",
  publisher: "سرونما",
  category: "فیلم، سریال و موسیقی",
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  icons: {
    icon: BRAND_MARK,
    apple: BRAND_MARK,
  },
  openGraph: {
    title: "سرونما | فیلم، سریال و موسیقی",
    description: "دانلود و پخش آنلاین فیلم، سریال و موسیقی؛ همراه با اطلاعات، زیرنویس، پلی‌لیست و تماشای هم‌زمان.",
    siteName: BRAND_NAME,
    type: "website",
    locale: "fa_IR",
    alternateLocale: "en_US",
  },
  twitter: { card: "summary", title: "سرونما | فیلم، سریال و موسیقی", description: "فیلم، سریال، موسیقی و تجربهٔ تماشای هم‌زمان." },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};

const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
const hasGoogleAnalytics = Boolean(googleAnalyticsId && /^G-[A-Z0-9]+$/u.test(googleAnalyticsId));

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"}>
      <body>
        <StructuredData data={siteJsonLd()} />
        {children}
        <WatchTogetherLauncher locale={locale} />
        <AppMessageCenter />
        {hasGoogleAnalytics && googleAnalyticsId ? <GoogleAnalytics measurementId={googleAnalyticsId} /> : null}
      </body>
    </html>
  );
}

function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${measurementId}', { send_page_view: true });`}
      </Script>
    </>
  );
}
