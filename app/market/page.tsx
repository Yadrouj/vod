"use client";

import Link from "next/link";
import { useState } from "react";
import { Chip, PageHeader, Segmented, cn } from "@/components/ui";
import { Icon } from "@/components/icons";
import TrainerAvatar from "@/components/TrainerAvatar";
import { useLang } from "@/components/LangProvider";
import { tTag } from "@/lib/i18n";
import {
  ALL_PLANS,
  CATEGORIES,
  CATEGORY_EN,
  CATEGORY_FA,
  categoryOf,
  trainerOf,
  type MarketCategory,
  type MarketPlan,
} from "@/lib/marketplace";

type Filter = "all" | "gym" | "diet";

export default function MarketPage() {
  const { t, lang } = useLang();
  const [filter, setFilter] = useState<Filter>("all");
  const [cat, setCat] = useState<MarketCategory | "all">("all");

  const plans = ALL_PLANS.filter(
    (p) =>
      (filter === "all" || p.kind === filter) &&
      (cat === "all" || categoryOf(p) === cat)
  );

  const catLabel = (c: MarketCategory) =>
    lang === "fa" ? CATEGORY_FA[c] : CATEGORY_EN[c];

  return (
    <div className="px-4 pt-6">
      <PageHeader title={t("mkt.title")} subtitle={t("mkt.subtitle", { n: ALL_PLANS.length })} />
      <div className="mt-4">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: t("mkt.all") },
            { value: "gym", label: t("mkt.workouts") },
            { value: "diet", label: t("mkt.diets") },
          ]}
        />
      </div>

      {/* category chips */}
      <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 py-0.5">
        <Chip label={t("mkt.allCats")} active={cat === "all"} onClick={() => setCat("all")} />
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={catLabel(c)}
            active={cat === c}
            onClick={() => setCat(cat === c ? "all" : c)}
          />
        ))}
      </div>

      <div className="mt-4 space-y-2.5">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} />
        ))}
        {plans.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">{t("lib.noMatch")}</p>
        )}
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: MarketPlan }) {
  const { t, lang } = useLang();
  const isGym = plan.kind === "gym";
  const trainer = trainerOf(plan);

  return (
    <Link
      href={`/market/${plan.id}`}
      className="block rounded-2xl bg-card p-4 ring-1 ring-line transition-colors hover:bg-card2"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 flex-shrink-0 items-center justify-center rounded-xl",
            isGym ? "bg-brand/15 text-brand" : "bg-sky-500/15 text-sky-300"
          )}
        >
          <Icon name={isGym ? "dumbbell" : "diet"} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink">{lang === "fa" ? plan.nameFa : plan.name}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">
            {lang === "fa" ? plan.descFa : plan.desc}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {plan.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-card2 px-2 py-0.5 text-[10px] font-bold text-faint ring-1 ring-line"
              >
                {tTag(lang, tag)}
              </span>
            ))}
          </div>
          {/* author strip */}
          <div className="mt-2.5 flex items-center gap-2 border-t border-line/60 pt-2">
            <TrainerAvatar trainer={trainer} size="size-6" />
            <span className="truncate text-[11px] font-bold text-muted">
              {lang === "fa" ? trainer.nameFa : trainer.name}
            </span>
            <span className="truncate text-[10px] text-faint">
              · {lang === "fa" ? trainer.credFa : trainer.cred}
            </span>
          </div>
        </div>
        <Icon name="chevronRight" className="size-5 flex-shrink-0 text-faint flip-rtl" />
      </div>
    </Link>
  );
}
