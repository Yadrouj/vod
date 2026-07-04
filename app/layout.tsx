import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import CoachFab from "@/components/CoachFab";
import SectionTracker from "@/components/SectionTracker";
import { LangProvider } from "@/components/LangProvider";

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
          <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-base ring-1 ring-line/50 shadow-[0_0_60px_-20px_rgb(0_0_0/0.9)]">
            <main className="flex-1 pb-24">{children}</main>
          </div>
          <SectionTracker />
          <CoachFab />
          <BottomNav />
        </LangProvider>
      </body>
    </html>
  );
}
