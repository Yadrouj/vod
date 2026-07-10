"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { showInAppMessage } from "@/components/InAppMessages";
import { SocialGate } from "@/components/Social";
import { Icon, type IconName } from "@/components/icons";
import TrainerAvatar from "@/components/TrainerAvatar";
import { useLang } from "@/components/LangProvider";
import { Button } from "@/components/ui";
import { useSocial } from "@/lib/hooks";
import { trainerGalleryFor } from "@/lib/gymGallery";
import { tTag } from "@/lib/i18n";
import {
  fetchCoachChat,
  fetchCoachFollowStats,
  openDirectCoachChat,
  sendCoachChat,
  setCoachFollowState,
  type CoachChatMessage,
  type CoachFollowStats,
  type CoachPrivateRequest,
} from "@/lib/social";
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
  const gallery = trainerGalleryFor(trainer.id, name);
  const isPartner = trainer.isPartner === true;
  const profileLabel = isPartner ? t("trn.verified") : lang === "fa" ? "پروفایل عمومی" : "Public profile";
  const audienceLabel = isPartner ? t("trn.clients") : lang === "fa" ? "مخاطب عمومی" : "public audience";

  return (
    <div className="px-4 pb-24 pt-6">
      <BackLink label={t("mkt.title")} />

      {/* hero */}
      <div className="relative mt-3 min-h-80 overflow-hidden rounded-3xl bg-black ring-1 ring-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={gallery[0]?.src} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.24)_42%,rgba(0,0,0,0.94)_100%),linear-gradient(90deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.22)_54%,rgba(0,0,0,0.72)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(ellipse_at_bottom,rgba(0,0,0,0.98)_0%,rgba(0,0,0,0.62)_46%,rgba(0,0,0,0)_74%)]" />
        <div className="relative z-10 flex min-h-80 flex-col justify-end p-4 text-white">
          <div className="flex items-end gap-3">
            <TrainerAvatar trainer={trainer} size="size-24 text-2xl" className="ring-4 ring-black/50 shadow-2xl" />
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand">
                {profileLabel}
              </p>
              <h1 className="mt-1 flex items-center gap-1.5 text-2xl font-black leading-tight drop-shadow-[0_8px_22px_rgba(0,0,0,0.95)]">
                <span className="truncate">{name}</span>
                <Icon name="verified" className="size-5 flex-shrink-0 text-brand" />
              </h1>
              <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-white/72">
                {lang === "fa" ? trainer.credFa : trainer.cred}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-white/82">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
              <Icon name="pin" className="size-3.5 text-brand" />
              {lang === "fa" ? trainer.cityFa : trainer.city}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-amber-200 ring-1 ring-amber-300/20">
              <Icon name="star" className="size-3.5" />
              {n(trainer.rating.toFixed(1))}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
              <Icon name="users" className="size-3.5 text-brand" />
              {n(trainer.clients.toLocaleString(lang === "fa" ? "fa-IR" : "en-US"))} {audienceLabel}
            </span>
          </div>
        </div>
      </div>

      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Icon name="library" className="size-4 text-brand" />
            {lang === "fa" ? "گالری مربی" : "Coach gallery"}
          </h2>
          <span className="text-[10px] font-bold text-faint">Training photos</span>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x scroll-smooth gap-3 overflow-x-auto px-4 pb-2">
          {gallery.map((image) => (
            <figure key={image.src} className="w-[78vw] max-w-80 flex-shrink-0 snap-start overflow-hidden rounded-3xl bg-card ring-1 ring-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt={image.alt} loading="lazy" className="h-44 w-full object-cover" />
              <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-[10px] font-bold text-faint">
                <span className="truncate">{image.alt}</span>
                <span className="flex-shrink-0 text-brand">{image.credit}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* stats */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat icon="star" value={n(trainer.rating.toFixed(1))} label={t("trn.rating")} />
        <Stat icon="medal" value={n(trainer.years)} label={t("trn.yearsExp")} />
        <Stat icon="calendar" value={n(plans.length)} label={isPartner ? t("trn.plansN", { n: "" }).trim() || "plans" : lang === "fa" ? "برنامه نمونه" : "sample plans"} />
      </div>

      <TrainerFollowBox trainer={trainer} coachName={name} />

      {/* contact */}
      <Section title={t("trn.contact")} icon="message">
        <ContactRow contacts={trainer.contacts} />
        {!isPartner && (
          <p className="mt-3 rounded-2xl bg-card2 p-3 text-xs leading-6 text-muted ring-1 ring-line">
            {lang === "fa"
              ? "این یک پروفایل عمومی بر اساس منابع باز است و به معنی همکاری، تایید یا پاسخ‌گویی مستقیم این شخص در رمق نیست."
              : "This is a public directory profile based on open sources, not a Ramagh partnership or endorsement."}
          </p>
        )}
      </Section>

      <Section title={isPartner ? (lang === "fa" ? "چت مستقیم با مربی" : "Direct coach chat") : lang === "fa" ? "ارتباط رسمی" : "Official contact"} icon="message">
        <DirectTrainerChat trainer={trainer} coachName={name} />
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
        title={isPartner ? t("trn.plans") : lang === "fa" ? "برنامه‌های نمونه مرتبط" : "Related sample plans"}
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

function TrainerFollowBox({ trainer, coachName }: { trainer: Trainer; coachName: string }) {
  const { lang, n } = useLang();
  const social = useSocial();
  const [stats, setStats] = useState<CoachFollowStats | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchCoachFollowStats(trainer.id, social?.userId).then((next) => {
      if (!cancelled) setStats(next);
    });
    return () => {
      cancelled = true;
    };
  }, [trainer.id, social?.userId]);

  const followers = stats?.followers ?? 0;
  const followed = stats?.followed === true;

  async function toggleFollow() {
    if (!social || busy) return;
    setBusy(true);
    try {
      const next = await setCoachFollowState({
        trainerId: trainer.id,
        userId: social.userId,
        follow: !followed,
      });
      if (next) {
        setStats(next);
        showInAppMessage({
          tone: next.followed ? "success" : "info",
          body: next.followed
            ? lang === "fa"
              ? `${coachName} به فالوینگت اضافه شد.`
              : `${coachName} added to your following.`
            : lang === "fa"
            ? `${coachName} از فالوینگت حذف شد.`
            : `${coachName} removed from your following.`,
          durationMs: 2400,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-3 rounded-2xl bg-card p-3 ring-1 ring-line">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-faint">
            {lang === "fa" ? "فالوورها" : "Followers"}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-sm font-black text-ink">
            <Icon name="users" className="size-4 text-brand" />
            {n(followers.toLocaleString(lang === "fa" ? "fa-IR" : "en-US"))}
          </p>
        </div>
        {social === undefined ? (
          <span className="text-xs font-bold text-muted">...</span>
        ) : social === null ? (
          <Link href="/profile" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-card2 px-3 text-xs font-black text-brand ring-1 ring-line">
            {lang === "fa" ? "ساخت پروفایل برای فالو" : "Create profile to follow"}
          </Link>
        ) : (
          <Button
            onClick={toggleFollow}
            disabled={busy}
            variant={followed ? "secondary" : "primary"}
            className="min-h-10 px-4"
          >
            <Icon name={followed ? "verified" : "users"} className="size-4" />
            {busy
              ? "..."
              : followed
              ? lang === "fa"
                ? "دنبال می‌کنی"
                : "Following"
              : lang === "fa"
              ? "فالو"
              : "Follow"}
          </Button>
        )}
      </div>
    </section>
  );
}

function DirectTrainerChat({ trainer, coachName }: { trainer: Trainer; coachName: string }) {
  const { lang } = useLang();
  const social = useSocial();
  const [thread, setThread] = useState<CoachPrivateRequest | null>(null);
  const [messages, setMessages] = useState<CoachChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const copy =
    lang === "fa"
      ? {
          title: "بدون پرداخت، مستقیم پیام بده.",
          hint: "برای سؤال سریع، هماهنگی یا شروع مشاوره، همین‌جا چت را باز کن.",
          opening: "در حال باز کردن...",
          start: "شروع چت مستقیم",
          empty: "چت باز شد. اولین پیام را بفرست.",
          placeholder: "پیامت را برای مربی بنویس...",
          send: "ارسال پیام",
        }
      : {
          title: "Message this coach directly.",
          hint: "Ask a quick question, coordinate, or start a consultation from here.",
          opening: "Opening...",
          start: "Start direct chat",
          empty: "Chat is open. Send the first message.",
          placeholder: "Write your message to the coach...",
          send: "Send message",
        };

  if (trainer.isPartner !== true) {
    return (
      <div className="rounded-2xl bg-card2 p-3 ring-1 ring-line">
        <p className="text-sm font-bold text-ink">
          {lang === "fa" ? "برای ارتباط، فقط از کانال‌های رسمی استفاده کن." : "Use official channels for contact."}
        </p>
        <p className="mt-1 text-xs leading-6 text-muted">
          {lang === "fa"
            ? "این شخص فعلا شریک تاییدشده رمق نیست؛ چت داخلی و پرداخت مستقیم برای این پروفایل غیرفعال است."
            : "This person is not currently a verified Ramagh partner, so in-app chat and direct payment are disabled."}
        </p>
        <div className="mt-3">
          <ContactRow contacts={trainer.contacts} />
        </div>
        {trainer.sourceUrl && (
          <a
            href={trainer.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-black text-brandink"
          >
            <Icon name="globe" className="size-4" />
            {lang === "fa" ? "مشاهده منبع رسمی" : "Open official source"}
          </a>
        )}
      </div>
    );
  }

  if (social === undefined) {
    return <p className="py-3 text-center text-xs text-muted">...</p>;
  }

  if (social === null) {
    return <SocialGate />;
  }

  async function openChat() {
    if (!social || busy) return;
    setBusy(true);
    try {
      const request = await openDirectCoachChat({
        trainerId: trainer.id,
        userId: social.userId,
        customerName: social.username,
        coachName,
      });
      if (request) {
        setThread(request);
        const rows = await fetchCoachChat(social.userId, request.id);
        setMessages(rows);
      }
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!social || !thread || !text.trim() || busy) return;
    setBusy(true);
    try {
      const message = await sendCoachChat({
        requestId: thread.id,
        userId: social.userId,
        customerName: social.username,
        coachName,
        role: "customer",
        text: text.trim(),
      });
      if (message) {
        setMessages((cur) => [...(cur ?? []), message]);
        setText("");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!thread) {
    return (
      <div className="rounded-2xl bg-card2 p-3 ring-1 ring-line">
        <p className="text-sm font-bold text-ink">{copy.title}</p>
        <p className="mt-1 text-xs text-muted">{copy.hint}</p>
        <Button onClick={openChat} disabled={busy} className="mt-3 w-full">
          <Icon name="message" className="size-4" />
          {busy ? copy.opening : copy.start}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card2 p-3 ring-1 ring-line">
      <div className="max-h-72 space-y-2 overflow-y-auto pe-1">
        {messages == null && <p className="py-3 text-center text-xs text-muted">...</p>}
        {messages?.length === 0 && (
          <p className="rounded-xl bg-card p-3 text-center text-xs text-muted ring-1 ring-line">
            {copy.empty}
          </p>
        )}
        {messages?.map((message) => (
          <DirectMessage key={message.id} message={message} />
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="mt-3 w-full resize-none rounded-xl bg-base2 px-3 py-2 text-sm text-ink outline-none ring-1 ring-line focus:ring-brand"
        placeholder={copy.placeholder}
      />
      <Button onClick={send} disabled={busy || !text.trim()} className="mt-2 w-full">
        {copy.send}
      </Button>
    </div>
  );
}

function DirectMessage({ message }: { message: CoachChatMessage }) {
  const isCoach = message.role === "coach";
  return (
    <div className={`flex ${isCoach ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[86%] rounded-2xl px-3 py-2 text-sm ring-1 ${isCoach ? "bg-card text-ink ring-line" : "bg-brand text-brandink ring-brand"}`}>
        <p className="whitespace-pre-line leading-relaxed">{message.text}</p>
      </div>
    </div>
  );
}

function ContactRow({ contacts }: { contacts: TrainerContacts }) {
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
    items.push({ icon: "globe", label: contacts.website, href: contacts.website.startsWith("http") ? contacts.website : `https://${contacts.website}`, cls: "text-violet-400" });
  if (contacts.youtube)
    items.push({ icon: "globe", label: "YouTube", href: contacts.youtube.startsWith("http") ? contacts.youtube : `https://youtube.com/${contacts.youtube}`, cls: "text-red-400" });
  if (contacts.x)
    items.push({ icon: "globe", label: "X", href: contacts.x.startsWith("http") ? contacts.x : `https://x.com/${contacts.x}`, cls: "text-ink" });

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
