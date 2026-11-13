import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { AppMessageCenter } from "@/components/app-message-center";
import { AudienceBoundary } from "@/components/audience-boundary";
import { NavigationFeedback } from "@/components/navigation-feedback";
import { MobileAppShell } from "@/components/mobile-app-shell";
import { StructuredData } from "@/components/structured-data";
import { WatchTogetherLauncher } from "@/components/watch-together-launcher";
import { BRAND_MARK, BRAND_NAME } from "@/lib/brand";
import { isRtl } from "@/lib/i18n";
import { siteJsonLd } from "@/lib/landing-seo";
import { getLocale } from "@/lib/server-locale";
import { SITE_URL } from "@/lib/seo";
import { SiteSectionLinks } from '@/components/site-section-links';
import "./globals.css";
import "./watch-together-overrides.css";
import "./mobile-ux-overrides.css";
import "./media-theme.css";
import "./cinema-discovery.css";
import "./mobile-app.css";
import "./soft-surfaces.css";
import "./mobile-player.css";
import "./product-polish.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "سرونما | موتور جستجوی فیلم، سریال و موسیقی",
    template: '%s | سرونما',
  },
  description: "سرونما، موتور جستجوی فیلم، سریال و موسیقی؛ جستجو بر اساس نام، ژانر، سال و امتیاز IMDb، مقایسهٔ منابع و کیفیت‌ها، پخش آنلاین و تجربهٔ تماشای هم‌زمان.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  keywords: ["دانلود فیلم", "دانلود سریال", "دانلود آهنگ", "فیلم جدید", "سریال جدید", "قسمت جدید سریال", "موزیک جدید", "پخش آنلاین فیلم", "پخش آنلاین موسیقی", "تماشای هم‌زمان", "شنیدن هم‌زمان موسیقی"],
  applicationName: BRAND_NAME,
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: BRAND_NAME },
  authors: [{ name: "سرونما" }],
  creator: "سرونما",
  publisher: "سرونما",
  category: "فیلم، سریال و موسیقی",
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  icons: {
    icon: BRAND_MARK,
    apple: "/app-icon/192",
  },
  openGraph: {
    title: "سرونما | موتور جستجوی فیلم، سریال و موسیقی",
    description: "موتور جستجوی فیلم، سریال و موسیقی؛ پیدا کردن آثار، مقایسهٔ کیفیت‌ها و منابع، پخش آنلاین و تماشای هم‌زمان.",
    siteName: BRAND_NAME,
    type: "website",
    locale: "fa_IR",
    alternateLocale: "en_US",
  },
  twitter: { card: "summary", title: "سرونما | موتور جستجوی فیلم، سریال و موسیقی", description: "جستجوی فیلم، سریال و آهنگ، مقایسهٔ منابع و پخش آنلاین در سرونما." },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

// Keep this public measurement ID in the application so analytics is enabled
// on every deployment. A future environment-specific property can still
// override it without requiring a code change.
const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "G-DTDGSJLLXV";
const hasGoogleAnalytics = Boolean(googleAnalyticsId && /^G-[A-Z0-9]+$/u.test(googleAnalyticsId));

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"}>
      <body>
        <StructuredData data={siteJsonLd()} />
        <Suspense fallback={null}>
          <NavigationFeedback />
        </Suspense>
        <AudienceBoundary measurementId={googleAnalyticsId} adultChrome={<>
          <SiteSectionLinks />
          <MobileAppShell locale={locale} />
          <WatchTogetherLauncher locale={locale} />
          <AppMessageCenter />
          {hasGoogleAnalytics ? <GoogleAnalytics measurementId={googleAnalyticsId} /> : null}
        </>}>{children}</AudienceBoundary>
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
