"use client";

import Link from "next/link";
import { use } from "react";
import { Icon, type IconName } from "@/components/icons";
import TrainerAvatar from "@/components/TrainerAvatar";
import { useLang } from "@/components/LangProvider";
import { tTag } from "@/lib/i18n";
import {
  getTrainer,
  plansByTrainer,
  type MarketPlan,
  type Trainer,
  type TrainerContacts,
} from "@/lib/marketplace";

export default function TrainerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, lang, n } = useLang();
  const trainer = getTrainer(id);

  if (!trainer) {
    return (
      <div className="px-4 pt-6">
        <BackLink label={t("mkt.title")} />
        <p className="mt-10 text-center text-muted">{t("trn.notFound")}</p>
      </div>
    );
  }

  const name = lang === "fa" ? trainer.nameFa : trainer.name;
  const plans = plansByTrainer(trainer.id);

  return (
    <div className="px-4 pb-24 pt-6">
      <BackLink label={t("mkt.title")} />

      {/* hero */}
      <div className="mt-3 overflow-hidden rounded-3xl bg-card ring-1 ring-line">
        <div
          className="h-20"
          style={{ background: `linear-gradient(120deg, ${trainer.color}, ${trainer.color}44)` }}
        />
        <div className="px-4 pb-4">
          <div className="-mt-10 flex items-end gap-3">
            <TrainerAvatar trainer={trainer} size="size-20 text-2xl" className="ring-4 ring-card" />
            <div className="mb-1 min-w-0 flex-1">
              <h1 className="flex items-center gap-1.5 text-lg font-extrabold text-ink">
                <span className="truncate">{name}</span>
                <Icon name="verified" className="size-5 flex-shrink-0 text-brand" />
              </h1>
              <p className="truncate text-xs text-muted">
                {lang === "fa" ? trainer.credFa : trainer.cred}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-muted">
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" className="size-3.5 text-faint" />
              {lang === "fa" ? trainer.cityFa : trainer.city}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="star" className="size-3.5 text-amber-400" />
              {n(trainer.rating.toFixed(1))}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="users" className="size-3.5 text-faint" />
              {n(trainer.clients.toLocaleString(lang === "fa" ? "fa-IR" : "en-US"))} {t("trn.clients")}
            </span>
          </div>

          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand ring-1 ring-brand/20">
            <Icon name="verified" className="size-3.5" /> {t("trn.verified")}
          </p>
        </div>
      </div>

      {/* stats */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat icon="star" value={n(trainer.rating.toFixed(1))} label={t("trn.rating")} />
        <Stat icon="medal" value={n(trainer.years)} label={t("trn.yearsExp")} />
        <Stat icon="calendar" value={n(plans.length)} label={t("trn.plansN", { n: "" }).trim() || "plans"} />
      </div>

      {/* contact */}
      <Section title={t("trn.contact")} icon="message">
        <ContactRow contacts={trainer.contacts} name={name} />
      </Section>

      {/* about */}
      <Section title={t("trn.about")} icon="user">
        <p className="text-sm leading-relaxed text-muted">
          {lang === "fa" ? trainer.bioFa : trainer.bio}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {trainer.specialties.map((s) => (
            <span
              key={s.en}
              className="inline-flex items-center gap-1 rounded-full bg-card2 px-2.5 py-1 text-[11px] font-bold text-muted ring-1 ring-line"
            >
              <Icon name={s.icon as IconName} className="size-3.5 text-brand" />
              {lang === "fa" ? s.fa : s.en}
            </span>
          ))}
        </div>
      </Section>

      {/* their plans */}
      <Section
        title={t("trn.plans")}
        icon="dumbbell"
        right={<span className="text-xs font-bold text-faint">{t("trn.plansN", { n: n(plans.length) })}</span>}
      >
        <div className="space-y-2">
          {plans.map((p) => (
            <PlanRow key={p.id} plan={p} />
          ))}
        </div>
      </Section>

      {/* news */}
      {trainer.news.length > 0 && (
        <Section title={t("trn.news")} icon="newspaper">
          <div className="space-y-2.5">
            {trainer.news.map((it, i) => (
              <div key={i} className="rounded-2xl bg-card2 p-3 ring-1 ring-line">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-ink">{lang === "fa" ? it.titleFa : it.title}</p>
                  <span className="flex-shrink-0 text-[10px] font-semibold text-faint">
                    {new Date(it.date).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {lang === "fa" ? it.bodyFa : it.body}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function ContactRow({ contacts, name }: { contacts: TrainerContacts; name: string }) {
  const items: { icon: IconName; label: string; href: string; cls: string }[] = [];
  if (contacts.instagram)
    items.push({ icon: "instagram", label: "Instagram", href: `https://instagram.com/${contacts.instagram}`, cls: "text-pink-400" });
  if (contacts.telegram)
    items.push({ icon: "telegram", label: "Telegram", href: `https://t.me/${contacts.telegram}`, cls: "text-sky-400" });
  if (contacts.phone)
    items.push({ icon: "phone", label: contacts.phone, href: `tel:${contacts.phone}`, cls: "text-emerald-400" });
  if (contacts.email)
    items.push({ icon: "mail", label: "Email", href: `mailto:${contacts.email}`, cls: "text-amber-400" });
  if (contacts.website)
    items.push({ icon: "globe", label: contacts.website, href: `https://${contacts.website}`, cls: "text-violet-400" });

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((it) => (
        <a
          key={it.label}
          href={it.href}
          target={it.href.startsWith("http") ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-card2 px-3 py-2.5 text-xs font-bold text-ink ring-1 ring-line transition-colors hover:bg-card3"
          dir="ltr"
        >
          <Icon name={it.icon} className={`size-4 ${it.cls}`} />
          <span className="truncate">{it.label}</span>
        </a>
      ))}
    </div>
  );
}

function PlanRow({ plan }: { plan: MarketPlan }) {
  const { lang } = useLang();
  const isGym = plan.kind === "gym";
  return (
    <Link
      href={`/market/${plan.id}`}
      className="flex items-center gap-3 rounded-2xl bg-card2 p-3 ring-1 ring-line transition-colors hover:bg-card3"
    >
      <span
        className={`flex size-9 flex-shrink-0 items-center justify-center rounded-xl ${
          isGym ? "bg-brand/15 text-brand" : "bg-sky-500/15 text-sky-300"
        }`}
      >
        <Icon name={isGym ? "dumbbell" : "utensils"} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{lang === "fa" ? plan.nameFa : plan.name}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {plan.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full bg-card px-2 py-0.5 text-[10px] font-bold text-faint ring-1 ring-line">
              {tTag(lang, tag)}
            </span>
          ))}
        </div>
      </div>
      <Icon name="chevronRight" className="size-4 flex-shrink-0 text-faint flip-rtl" />
    </Link>
  );
}

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-card p-3 text-center ring-1 ring-line">
      <Icon name={icon} className="mx-auto size-5 text-brand" />
      <p className="mt-1 text-lg font-extrabold text-ink">{value}</p>
      <p className="text-[10px] font-bold text-faint">{label}</p>
    </div>
  );
}

function Section({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon: IconName;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <Icon name={icon} className="size-4 text-brand" /> {title}
        </h2>
        {right}
      </div>
      <div className="rounded-2xl bg-card p-4 ring-1 ring-line">{children}</div>
    </section>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link href="/market" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
      <Icon name="chevronLeft" className="size-4 flip-rtl" /> {label}
    </Link>
  );
}
