"use client";

// Local admin panel: usage stats, marketplace size, feedback inbox, and the
// body-analysis responder (reply with text + image/PDF attachments).
// Reads this device's data — ready to point at a backend later.

import { useEffect, useRef, useState } from "react";
import { Button, PageHeader, Spinner, cn } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { addAnalysisMsg, FREE_USAGE_LIMIT } from "@/lib/db";
import {
  useAccount,
  useAnalysisThread,
  useFeedbackList,
  useSectionStats,
  useSessions,
  useUsage,
} from "@/lib/hooks";
import { ALL_PLANS, DIET_PLANS, GYM_PLANS } from "@/lib/marketplace";
import { fetchCoachData, mediaUrl, type CoachApplication, type CoachProgram } from "@/lib/social";

const SECTION_FA: Record<string, string> = {
  home: "خانه",
  program: "برنامه تمرین",
  workout: "اجرای تمرین",
  library: "کتابخانه",
  diet: "تغذیه",
  market: "بازار",
  coach: "مربی هوشمند",
  history: "تاریخچه",
  profile: "پروفایل",
  analysis: "آنالیز بدن",
  support: "پشتیبانی",
  login: "ورود",
  onboarding: "شروع",
};

export default function AdminPage() {
  const { t, lang, n } = useLang();
  const stats = useSectionStats();
  const feedback = useFeedbackList();
  const sessions = useSessions();
  const account = useAccount();
  const usage = useUsage();
  const analysis = useAnalysisThread();

  // Access gate — the panel is only reachable with the admin code.
  const [gateChecked, setGateChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    setUnlocked(sessionStorage.getItem("ramagh-admin-ok") === "1");
    setGateChecked(true);
  }, []);

  function submitCode(e: React.FormEvent) {
    e.preventDefault();
    const expected = process.env.NEXT_PUBLIC_ADMIN_CODE || "ramagh1404";
    if (code === expected) {
      sessionStorage.setItem("ramagh-admin-ok", "1");
      setUnlocked(true);
      setWrong(false);
    } else {
      setWrong(true);
    }
  }

  if (!gateChecked) return <Spinner />;

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-sm px-6 pt-24">
        <h1 className="text-center text-lg font-extrabold text-ink">
          {t("adm.locked")}
        </h1>
        <form onSubmit={submitCode} className="mt-5 space-y-3">
          <input
            type="password"
            dir="ltr"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setWrong(false);
            }}
            placeholder={t("adm.code")}
            className="h-11 w-full rounded-xl bg-base2 px-4 text-sm ring-1 ring-line focus:ring-2 focus:ring-brand"
          />
          {wrong && (
            <p className="text-xs font-semibold text-danger">{t("adm.wrong")}</p>
          )}
          <Button type="submit" className="w-full">
            {t("adm.enter")}
          </Button>
        </form>
      </div>
    );
  }

  if (!stats || !feedback || !sessions || analysis === undefined) return <Spinner />;

  const totalVisits = stats.reduce((n, s) => n + s.count, 0);
  const sorted = [...stats].sort((a, b) => b.count - a.count);
  const maxCount = sorted[0]?.count ?? 1;
  const users = account ? 1 : 0;
  const pendingAnalysis =
    analysis.length > 0 &&
    analysis[analysis.length - 1].from === "user";

  return (
    <div className="px-4 pt-6 pb-10">
      <PageHeader
        title={lang === "fa" ? "پنل مدیریت" : "Admin Panel"}
        subtitle={
          lang === "fa"
            ? "آمار این دستگاه — آماده‌ی اتصال به بک‌اند"
            : "This device's data — backend-ready"
        }
      />

      {/* KPI cards */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Kpi label={lang === "fa" ? "کاربر ثبت‌شده" : "Registered users"} value={users} />
        <Kpi label={lang === "fa" ? "تمرین کامل‌شده" : "Workouts done"} value={sessions.length} />
        <Kpi
          label={lang === "fa" ? "برنامه در بازار" : "Marketplace plans"}
          value={ALL_PLANS.length}
          sub={lang === "fa" ? `${GYM_PLANS.length} تمرین · ${DIET_PLANS.length} رژیم` : `${GYM_PLANS.length} gym · ${DIET_PLANS.length} diet`}
        />
        <Kpi
          label={lang === "fa" ? "اقدام مصرف‌شده" : "Actions used"}
          value={usage?.count ?? 0}
          sub={account ? (lang === "fa" ? "نامحدود" : "unlimited") : `/ ${FREE_USAGE_LIMIT}`}
        />
      </div>

      {/* Section usage */}
      <Section title={lang === "fa" ? `استفاده از بخش‌ها (${n(totalVisits)} بازدید)` : `Section usage (${totalVisits} visits)`}>
        <div className="space-y-2">
          {sorted.map((s) => (
            <div key={s.section} className="flex items-center gap-2">
              <span className="w-24 flex-shrink-0 truncate text-xs font-bold text-muted">
                {lang === "fa" ? SECTION_FA[s.section] ?? s.section : s.section}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-base2 ring-1 ring-line">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${(s.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="tnum w-8 text-end text-xs font-extrabold text-ink">{n(s.count)}</span>
            </div>
          ))}
          {sorted.length === 0 && (
            <p className="text-xs text-faint">{lang === "fa" ? "هنوز داده‌ای نیست." : "No data yet."}</p>
          )}
        </div>
      </Section>

      {/* Feedback inbox */}
      <Section
        title={
          lang === "fa" ? `صندوق بازخورد (${n(feedback.length)})` : `Feedback inbox (${feedback.length})`
        }
      >
        <div className="space-y-2">
          {feedback.map((f) => (
            <div key={f.id} className="rounded-xl bg-base2 p-3 ring-1 ring-line">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1",
                    f.type === "bug"
                      ? "bg-danger-dim text-danger ring-danger/25"
                      : f.type === "idea"
                      ? "bg-info-dim text-info ring-info/25"
                      : "bg-card2 text-muted ring-line"
                  )}
                >
                  {f.type === "bug" ? (lang === "fa" ? "مشکل" : "bug") : f.type === "idea" ? (lang === "fa" ? "پیشنهاد" : "idea") : (lang === "fa" ? "نظر" : "note")}
                </span>
                <span className="text-[10px] text-faint" dir="ltr">
                  {new Date(f.createdAt).toLocaleString(lang === "fa" ? "fa-IR" : "en-US")}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">{f.message}</p>
              {f.contact && (
                <p className="mt-1 text-xs font-bold text-brand" dir="ltr">
                  {f.contact}
                </p>
              )}
            </div>
          ))}
          {feedback.length === 0 && (
            <p className="text-xs text-faint">{lang === "fa" ? "بازخوردی ثبت نشده." : "No feedback yet."}</p>
          )}
        </div>
      </Section>

      {/* Analysis responder */}
      <Section
        title={
          (lang === "fa" ? "پاسخ آنالیز بدن " : "Body-analysis responder ") +
          (pendingAnalysis ? "🔴" : "🟢")
        }
      >
        <AnalysisResponder pending={pendingAnalysis} />
      </Section>

      {/* Coach registrations & submitted programs */}
      <Section title={t("adm.coaches")}>
        <CoachSubmissions />
      </Section>
    </div>
  );
}

function CoachSubmissions() {
  const { t, lang, n } = useLang();
  const [data, setData] = useState<{ applications: CoachApplication[]; programs: CoachProgram[] } | null>(null);

  useEffect(() => {
    fetchCoachData().then(setData).catch(() => setData({ applications: [], programs: [] }));
  }, []);

  if (!data) return <p className="text-xs text-faint">…</p>;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-bold text-faint">{t("adm.coachApps")} · {n(data.applications.length)}</p>
        <div className="space-y-2">
          {data.applications.map((a) => (
            <div key={a.id} className="flex items-start gap-2 rounded-xl bg-card2 p-2.5 ring-1 ring-line">
              {a.photoId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(a.photoId)!} alt="" className="size-10 flex-shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-card text-faint"><Icon name="user" className="size-5" /></span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">{a.name}</p>
                <p className="truncate text-[11px] text-muted">{a.cred}{a.city && ` · ${a.city}`}</p>
                {a.bio && <p className="mt-0.5 line-clamp-2 text-[11px] text-faint">{a.bio}</p>}
                <p className="mt-0.5 text-[10px] text-faint" dir="ltr">{[a.phone, a.instagram && `@${a.instagram}`, a.email].filter(Boolean).join(" · ")}</p>
              </div>
              <span className="rounded-full bg-warn/15 px-1.5 py-0.5 text-[9px] font-bold text-warn">{t("adm.pending")}</span>
            </div>
          ))}
          {data.applications.length === 0 && <p className="text-xs text-faint">{t("adm.noSubs")}</p>}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold text-faint">{t("adm.coachProgs")} · {n(data.programs.length)}</p>
        <div className="space-y-2">
          {data.programs.map((p) => (
            <div key={p.id} className="rounded-xl bg-card2 p-2.5 ring-1 ring-line">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink">{p.title}</p>
                <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[9px] font-bold text-brand">{t(p.kind === "diet" ? "coachreg.dietKind" : "coachreg.gymKind")}</span>
              </div>
              <p className="text-[11px] text-muted">{p.coachName}{p.goal && ` · ${p.goal}`}{p.days ? ` · ${n(p.days)}${lang === "fa" ? " روز" : "d"}` : ""}</p>
              {p.description && <p className="mt-0.5 line-clamp-3 text-[11px] text-faint">{p.description}</p>}
            </div>
          ))}
          {data.programs.length === 0 && <p className="text-xs text-faint">{t("adm.noSubs")}</p>}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: number; sub?: string }) {
  const { n } = useLang();
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-line">
      <p className="tnum text-2xl font-extrabold text-brand">{n(value)}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
      {sub && <p className="text-[10px] text-faint">{n(sub)}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      <div className="mt-2 rounded-2xl bg-card p-4 ring-1 ring-line">{children}</div>
    </div>
  );
}

function AnalysisResponder({ pending }: { pending: boolean }) {
  const { lang } = useLang();
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [pdf, setPdf] = useState<{ data: string; name: string } | null>(null);
  const [sent, setSent] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  function readFile(f: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(f);
    });
  }

  async function send() {
    if (!text.trim() && !image && !pdf) return;
    await addAnalysisMsg({
      from: "team",
      text: text.trim(),
      images: image ? [image] : [],
      pdf: pdf?.data ?? null,
      pdfName: pdf?.name ?? null,
    });
    setText("");
    setImage(null);
    setPdf(null);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  }

  return (
    <div className="space-y-3">
      {pending && (
        <p className="rounded-xl bg-warn-dim p-2.5 text-xs font-bold text-warn ring-1 ring-warn/25">
          {lang === "fa" ? "درخواست آنالیز در انتظار پاسخ است." : "An analysis request is waiting."}
        </p>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={lang === "fa" ? "متن آنالیز…" : "Analysis text…"}
        rows={3}
        className="w-full resize-none rounded-xl bg-base2 px-3 py-2.5 text-sm text-ink outline-none ring-1 ring-line placeholder:text-faint focus:ring-2 focus:ring-brand"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => imgRef.current?.click()}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-card2 px-3 text-xs font-bold text-muted ring-1 ring-line"
        >
          <Icon name="plus" className="size-3.5" /> {lang === "fa" ? "عکس" : "Image"}
          {image && " ✓"}
        </button>
        <button
          type="button"
          onClick={() => pdfRef.current?.click()}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-card2 px-3 text-xs font-bold text-muted ring-1 ring-line"
        >
          <Icon name="plus" className="size-3.5" /> PDF{pdf && " ✓"}
        </button>
        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setImage(await readFile(f));
          }}
        />
        <input
          ref={pdfRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setPdf({ data: await readFile(f), name: f.name });
          }}
        />
        <div className="flex-1" />
        <Button onClick={send} className="px-5">
          {lang === "fa" ? "ارسال پاسخ" : "Send reply"}
        </Button>
      </div>
      {sent && (
        <p className="text-xs font-bold text-success">
          {lang === "fa" ? "پاسخ در چت آنالیز کاربر قرار گرفت." : "Reply delivered to the user's analysis chat."}
        </p>
      )}
    </div>
  );
}
