import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import BottomNav from "@/components/BottomNav";
import CoachFab from "@/components/CoachFab";
import AccountStatusSync from "@/components/AccountStatusSync";
import InAppMessages from "@/components/InAppMessages";
import SectionTracker from "@/components/SectionTracker";
import { LangProvider } from "@/components/LangProvider";
import ThemeProvider from "@/components/ThemeProvider";

const vazir = Vazirmatn({
  variable: "--font-vazir",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "رمق | Ramagh",
  description:
    "برنامه‌ی تمرین و تغذیه‌ی شخصی — بر پایه‌ی کتابخانه‌ی مسل‌ویکی، با تایمر، رژیم ایرانی و بازار برنامه‌ها.",
  applicationName: "رمق",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "رمق",
  },
};

export const viewport: Viewport = {
  themeColor: "#080b13",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className={`${vazir.variable} h-full antialiased`}>
      <body className="min-h-full">
        <LangProvider>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
            <InAppMessages />
            <AccountStatusSync />
            <SectionTracker />
            <CoachFab />
            <BottomNav />
          </ThemeProvider>
        </LangProvider>
      </body>
    </html>
  );
}
