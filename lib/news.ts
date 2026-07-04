// News & announcements: static app news + reminders computed from local state.

import type { IconName } from "@/components/icons";
import type { Program, Session } from "./types";
import type { DietProfile } from "./nutrition";
import { tFocus, type Lang } from "./i18n";

export interface NewsItem {
  id: string;
  kind: "reminder" | "news";
  icon: IconName;
  title: string;
  body?: string;
  href?: string;
}

/** App news (newest first). Bump ids when adding entries. */
const APP_NEWS: Record<Lang, NewsItem[]> = {
  fa: [
    {
      id: "n-analysis",
      kind: "news",
      icon: "sparkles",
      title: "جدید: آنالیز بدن",
      body: "عکس بدنت را بفرست و آنالیز اختصاصی بگیر.",
      href: "/analysis",
    },
    {
      id: "n-coach",
      kind: "news",
      icon: "sparkles",
      title: "مربی هوشمند رمق فعال شد",
      body: "سؤال‌هایت را درباره‌ی تمرین و تغذیه بپرس.",
      href: "/coach",
    },
    {
      id: "n-market",
      kind: "news",
      icon: "store",
      title: "بازار برنامه‌ها حرفه‌ای شد",
      body: "برنامه‌های تخصصی از مربی‌های خبره.",
      href: "/market",
    },
  ],
  en: [
    {
      id: "n-analysis",
      kind: "news",
      icon: "sparkles",
      title: "New: Body Analysis",
      body: "Send your photos, get a personal analysis.",
      href: "/analysis",
    },
    {
      id: "n-coach",
      kind: "news",
      icon: "sparkles",
      title: "AI Coach is live",
      body: "Ask anything about training & nutrition.",
      href: "/coach",
    },
    {
      id: "n-market",
      kind: "news",
      icon: "store",
      title: "Marketplace went pro",
      body: "Expert-authored plans with categories.",
      href: "/market",
    },
  ],
};

export function buildNews(
  lang: Lang,
  program: Program | undefined,
  sessions: Session[] | undefined,
  dietProfile: DietProfile | undefined | null
): NewsItem[] {
  const items: NewsItem[] = [];
  const todayEn = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Reminder: today's workout not done yet
  const todayDay = program?.days.find(
    (d) => d.label === todayEn && d.exercises.length > 0
  );
  const doneToday = (sessions ?? []).some((s) => s.startedAt >= startOfDay.getTime());
  if (todayDay && !doneToday) {
    const focus = todayDay.focus.map((f) => tFocus(lang, f)).join(" + ");
    items.push({
      id: "r-today",
      kind: "reminder",
      icon: "timer",
      title: lang === "fa" ? "یادآوری تمرین امروز" : "Today's workout",
      body:
        lang === "fa"
          ? `امروز ${focus || "تمرین"} داری — بزن بریم!`
          : `${focus || "Workout"} is on today's plan — let's go!`,
      href: `/workout/${todayDay.id}`,
    });
  }

  // Reminder: 3+ idle days
  const last = (sessions ?? [])[0]?.startedAt;
  if (last && Date.now() - last > 3 * 24 * 60 * 60 * 1000) {
    items.push({
      id: "r-idle",
      kind: "reminder",
      icon: "flame",
      title: lang === "fa" ? "چند روزه تمرین نکردی" : "It's been a few days",
      body:
        lang === "fa"
          ? "بدنت منتظرته — یک جلسه‌ی سبک شروع کن."
          : "Your body misses you — start with a light session.",
      href: "/program",
    });
  }

  // Reminder: no diet plan yet
  if (!dietProfile) {
    items.push({
      id: "r-diet",
      kind: "reminder",
      icon: "diet",
      title: lang === "fa" ? "برنامه‌ی تغذیه نداری" : "No nutrition plan yet",
      body:
        lang === "fa"
          ? "کالری و وعده‌هایت را در ۱ دقیقه بساز."
          : "Build your calories & meals in a minute.",
      href: "/diet",
    });
  }

  return [...items, ...APP_NEWS[lang]];
}
