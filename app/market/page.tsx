"use client";

import Link from "next/link";
import { useState } from "react";
import { Chip, PageHeader, cn } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import TrainerAvatar from "@/components/TrainerAvatar";
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
  TRAINERS,
  type MarketCategory,
  type MarketPlan,
} from "@/lib/marketplace";

type Section = "exercise" | "nutrition" | "gyms" | "stores" | "social";

const SECTIONS: { id: Section; icon: IconName; key: string }[] = [
  { id: "exercise", icon: "dumbbell", key: "mkt.secExercise" },
  { id: "nutrition", icon: "diet", key: "mkt.secNutrition" },
  { id: "gyms", icon: "pin", key: "mkt.secGyms" },
  { id: "stores", icon: "store", key: "mkt.secStores" },
  { id: "social", icon: "users", key: "mkt.secSocial" },
];

export default function MarketPage() {
  const { t, lang } = useLang();
  const [section, setSection] = useState<Section>("exercise");
  const [cat, setCat] = useState<MarketCategory | "all">("all");

  const kind = section === "nutrition" ? "diet" : "gym";
  const plans = ALL_PLANS.filter(
    (p) => p.kind === kind && (cat === "all" || categoryOf(p) === cat)
  );
  const catLabel = (c: MarketCategory) => (lang === "fa" ? CATEGORY_FA[c] : CATEGORY_EN[c]);
  const isPlans = section === "exercise" || section === "nutrition";

  return (
    <div className="px-4 pb-4 pt-6">
      <PageHeader title={t("mkt.title")} />

      {/* section switcher */}
      <div className="no-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 py-0.5">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold transition-colors",
              section === s.id ? "bg-brand text-brandink shadow-[0_2px_10px_-2px_rgb(184_242_74/0.5)]" : "bg-card2 text-muted ring-1 ring-line"
            )}
          >
            <Icon name={s.icon} className="size-4" /> {t(s.key)}
          </button>
        ))}
      </div>

      {/* ---- Plans (exercise / nutrition) ---- */}
      {isPlans && (
        <>
          {/* coaches rail */}
          <div className="mt-4 flex items-center gap-1.5">
            <Icon name="users" className="size-4 text-brand" />
            <h2 className="text-sm font-bold text-ink">{t("trn.coaches")}</h2>
          </div>
          <div className="no-scrollbar -mx-1 mt-2 flex gap-3 overflow-x-auto px-1 py-1">
            {TRAINERS.map((tr) => (
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
            {plans.map((p) => (
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
          href="/gyms?type=stores"
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
          <div className="mb-3 flex items-center gap-2">
            <Icon name="users" className="size-4 text-brand" />
            <div>
              <h2 className="text-sm font-bold text-ink">{t("feed.title")}</h2>
              <p className="text-[11px] text-faint">{t("feed.subtitle")}</p>
            </div>
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

function PlanCard({ plan }: { plan: MarketPlan }) {
  const { lang } = useLang();
  const isGym = plan.kind === "gym";
  const trainer = trainerOf(plan);

  return (
    <Link href={`/market/${plan.id}`} className="block rounded-2xl bg-card p-4 ring-1 ring-line transition-colors hover:bg-card2">
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
            <span className="truncate text-[11px] font-bold text-muted">{lang === "fa" ? trainer.nameFa : trainer.name}</span>
            <span className="truncate text-[10px] text-faint">· {lang === "fa" ? trainer.credFa : trainer.cred}</span>
          </div>
        </div>
        <Icon name="chevronRight" className="size-5 flex-shrink-0 text-faint flip-rtl" />
      </div>
    </Link>
  );
}
