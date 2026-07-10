"use client";

import Link from "next/link";
import { useState } from "react";
import { Chip, PageHeader, cn } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import TrainerAvatar from "@/components/TrainerAvatar";
import ClubLeaderboard from "@/components/ClubLeaderboard";
import MarketSocialBox from "@/components/MarketSocialBox";
import MarketTools from "@/components/MarketTools";
import SocialFeed from "@/components/SocialFeed";
import { useLang } from "@/components/LangProvider";
import { tTag } from "@/lib/i18n";
import {
  ALL_PLANS,
  CATEGORIES,
  CATEGORY_EN,
  CATEGORY_FA,
  categoryOf,
  trainerOf,
  trainersForPlanKind,
  type MarketCategory,
  type MarketPlan,
} from "@/lib/marketplace";

type Section = "tools" | "exercise" | "nutrition" | "gyms" | "stores" | "social";

const MARKET_TABS: { id: Section; icon: IconName; key: string }[] = [
  { id: "social", icon: "users", key: "mkt.secSocial" },
  { id: "exercise", icon: "dumbbell", key: "mkt.secExercise" },
  { id: "tools", icon: "sparkles", key: "ابزارها" },
  { id: "nutrition", icon: "diet", key: "mkt.secNutrition" },
  { id: "gyms", icon: "pin", key: "mkt.secGyms" },
  { id: "stores", icon: "store", key: "mkt.secStores" },
];

export default function MarketPage() {
  const { t, lang } = useLang();
  const [section, setSection] = useState<Section>("social");
  const [cat, setCat] = useState<MarketCategory | "all">("all");
  const [adSeed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const kind = section === "nutrition" ? "diet" : "gym";
  const plans = ALL_PLANS.filter(
    (p) => p.kind === kind && (cat === "all" || categoryOf(p) === cat)
  );
  const catLabel = (c: MarketCategory) => (lang === "fa" ? CATEGORY_FA[c] : CATEGORY_EN[c]);
  const isPlans = section === "exercise" || section === "nutrition";
  const sectionTrainers = isPlans ? trainersForPlanKind(kind) : [];
  const sponsorableTrainers = sectionTrainers.filter((tr) => tr.id !== "t1");
  const sponsoredTrainer = isPlans ? pickPromoted(sponsorableTrainers, adSeed + (kind === "diet" ? 9 : 3)) : null;
  const organicTrainers = prioritizeTrainer(
    sponsoredTrainer ? sectionTrainers.filter((tr) => tr.id !== sponsoredTrainer.id) : sectionTrainers,
    "t1"
  );
  const sponsorablePlans = plans.filter((plan) => trainerOf(plan).id !== "t1");
  const sponsoredPlan = isPlans ? pickPromoted(sponsorablePlans, adSeed + (kind === "diet" ? 17 : 5)) : null;
  const organicPlans = sponsoredPlan ? plans.filter((plan) => plan.id !== sponsoredPlan.id) : plans;

  return (
    <div className="px-4 pb-4 pt-6">
      <PageHeader title={t("mkt.title")} />

      <div className="no-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 py-0.5" role="tablist" aria-label={t("mkt.title")}>
        {MARKET_TABS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={section === s.id}
            onClick={() => setSection(s.id)}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-2xl px-3.5 text-xs font-black transition-colors",
              section === s.id ? "bg-brand text-brandink shadow-[0_2px_10px_-2px_rgb(184_242_74/0.5)]" : "bg-card2 text-muted ring-1 ring-line hover:text-ink"
            )}
          >
            <Icon name={s.icon} className="size-4" /> {s.key.startsWith("mkt.") ? t(s.key) : s.key}
          </button>
        ))}
      </div>

      {section === "tools" && <MarketTools />}

      {/* ---- Plans (exercise / nutrition) ---- */}
      {isPlans && (
        <>
          {/* coaches rail */}
          <div className="mt-4 flex items-center gap-1.5">
            <Icon name="users" className="size-4 text-brand" />
            <h2 className="text-sm font-bold text-ink">{t("trn.coaches")}</h2>
          </div>
          <div className="no-scrollbar -mx-1 mt-2 flex gap-3 overflow-x-auto px-1 py-1">
            {sponsoredTrainer && (
              <Link href={`/market/trainer/${sponsoredTrainer.id}`} className="relative flex w-20 flex-shrink-0 flex-col items-center gap-1 rounded-2xl bg-brand/10 px-2 py-2 text-center ring-2 ring-brand/70">
                <span className="absolute -top-1 rounded-full bg-brand px-1.5 py-0.5 text-[8px] font-black text-brandink">
                  تبلیغات
                </span>
                <TrainerAvatar trainer={sponsoredTrainer} size="size-14" className="mt-1" />
                <span className="w-full truncate text-[10px] font-black text-ink">
                  {(lang === "fa" ? sponsoredTrainer.nameFa : sponsoredTrainer.name).replace(/^Ø¯Ú©ØªØ±\s|^Dr\.\s/, "")}
                </span>
              </Link>
            )}
            {organicTrainers.map((tr) => (
              <Link key={tr.id} href={`/market/trainer/${tr.id}`} className="flex w-16 flex-shrink-0 flex-col items-center gap-1 text-center">
                <TrainerAvatar trainer={tr} size="size-14" />
                <span className="w-full truncate text-[10px] font-bold text-muted">
                  {(lang === "fa" ? tr.nameFa : tr.name).replace(/^دکتر\s|^Dr\.\s/, "")}
                </span>
              </Link>
            ))}
          </div>

          {/* category chips */}
          <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 py-0.5">
            <Chip label={t("mkt.allCats")} active={cat === "all"} onClick={() => setCat("all")} />
            {CATEGORIES.map((c) => (
              <Chip key={c} label={catLabel(c)} active={cat === c} onClick={() => setCat(cat === c ? "all" : c)} />
            ))}
          </div>

          <div className="mt-4 space-y-2.5">
            {sponsoredPlan && <PlanCard plan={sponsoredPlan} sponsored />}
            {organicPlans.map((p) => (
              <PlanCard key={p.id} plan={p} />
            ))}
            {plans.length === 0 && <p className="py-10 text-center text-sm text-muted">{t("lib.noMatch")}</p>}
          </div>
        </>
      )}

      {/* ---- Gyms finder CTA ---- */}
      {section === "gyms" && (
        <PlaceCta
          href="/gyms"
          icon="pin"
          title={t("gym.title")}
          desc={t("mkt.gymsCta")}
          btn={t("mkt.gymsCtaBtn")}
          accent="brand"
        />
      )}

      {/* ---- Stores finder CTA ---- */}
      {section === "stores" && (
        <PlaceCta
          href="/stores"
          icon="store"
          title={t("store.title")}
          desc={t("store.subtitle")}
          btn={t("mkt.storesCtaBtn")}
          accent="sky"
        />
      )}

      {/* ---- Social feed ---- */}
      {section === "social" && (
        <div className="mt-4">
          <MarketSocialBox onOpenSocial={() => setSection("social")} />
          <div className="mb-3 flex items-center gap-2">
            <Icon name="users" className="size-4 text-brand" />
            <div>
              <h2 className="text-sm font-bold text-ink">{t("feed.title")}</h2>
              <p className="text-[11px] text-faint">{t("feed.subtitle")}</p>
            </div>
          </div>
          <div className="mb-4">
            <ClubLeaderboard />
            <Link href="/club" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand">
              {lang === "fa" ? "ورود به باشگاه" : "Open club"}
              <Icon name="chevronRight" className="size-3.5 flip-rtl" />
            </Link>
          </div>
          <SocialFeed />
        </div>
      )}
    </div>
  );
}

function PlaceCta({
  href,
  icon,
  title,
  desc,
  btn,
  accent,
}: {
  href: string;
  icon: IconName;
  title: string;
  desc: string;
  btn: string;
  accent: "brand" | "sky";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "mt-4 block overflow-hidden rounded-3xl p-5 text-center ring-1",
        accent === "brand" ? "bg-brand/10 ring-brand/25" : "bg-sky-500/10 ring-sky-500/25"
      )}
    >
      <span className={cn("mx-auto flex size-14 items-center justify-center rounded-2xl", accent === "brand" ? "bg-brand/20 text-brand" : "bg-sky-500/20 text-sky-300")}>
        <Icon name={icon} className="size-7" />
      </span>
      <p className="mt-3 text-lg font-extrabold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{desc}</p>
      <span className={cn("mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold", accent === "brand" ? "bg-brand text-brandink" : "bg-sky-500 text-white")}>
        {btn} <Icon name="chevronRight" className="size-4 flip-rtl" />
      </span>
    </Link>
  );
}

function PlanCard({ plan, sponsored = false }: { plan: MarketPlan; sponsored?: boolean }) {
  const { lang } = useLang();
  const isGym = plan.kind === "gym";
  const trainer = trainerOf(plan);
  const trainerName = lang === "fa" ? trainer.nameFa : trainer.name;
  const trainerLabel =
    trainer.isPartner === true
      ? trainerName
      : lang === "fa"
        ? `پروفایل عمومی: ${trainerName}`
        : `Public profile: ${trainerName}`;
  const trainerMeta =
    trainer.isPartner === true
      ? lang === "fa"
        ? trainer.credFa
        : trainer.cred
      : lang === "fa"
        ? "لینک رسمی و منابع باز"
        : "official links and open sources";

  return (
    <Link
      href={`/market/${plan.id}`}
      className={cn(
        "block rounded-2xl bg-card p-4 ring-1 transition-colors hover:bg-card2",
        sponsored ? "ring-2 ring-brand/70 shadow-[0_0_34px_-18px_rgb(184_242_74/0.95)]" : "ring-line"
      )}
    >
      {sponsored && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-brand/12 px-3 py-2 text-[11px] font-black text-brand ring-1 ring-brand/30">
          <span className="inline-flex items-center gap-1">
            <Icon name="sparkles" className="size-3.5" />
            تبلیغات
          </span>
          <span className="text-faint">اسپانسر شده برای دیده‌شدن بیشتر</span>
        </div>
      )}
      <div className="flex items-start gap-3">
        <span className={cn("flex size-10 flex-shrink-0 items-center justify-center rounded-xl", isGym ? "bg-brand/15 text-brand" : "bg-sky-500/15 text-sky-300")}>
          <Icon name={isGym ? "dumbbell" : "diet"} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink">{lang === "fa" ? plan.nameFa : plan.name}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{lang === "fa" ? plan.descFa : plan.desc}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {plan.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-card2 px-2 py-0.5 text-[10px] font-bold text-faint ring-1 ring-line">
                {tTag(lang, tag)}
              </span>
            ))}
          </div>
          <div className="mt-2.5 flex items-center gap-2 border-t border-line/60 pt-2">
            <TrainerAvatar trainer={trainer} size="size-6" />
            <span className="truncate text-[11px] font-bold text-muted">{trainerLabel}</span>
            <span className="truncate text-[10px] text-faint">· {trainerMeta}</span>
          </div>
        </div>
        <Icon name="chevronRight" className="size-5 flex-shrink-0 text-faint flip-rtl" />
      </div>
    </Link>
  );
}

function pickPromoted<T extends { id: string }>(items: T[], seedValue: number): T | null {
  if (!items.length) return null;
  const pool = items.slice(0, Math.min(items.length, 20));
  return pool[seedValue % pool.length] ?? null;
}

function prioritizeTrainer<T extends { id: string }>(items: T[], id: string): T[] {
  const target = items.find((item) => item.id === id);
  if (!target) return items;
  return [target, ...items.filter((item) => item.id !== id)];
}
