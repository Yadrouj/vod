"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { useSocial } from "@/lib/hooks";
import { compressImage, registerCoach, submitCoachProgram } from "@/lib/social";

export default function CoachApplyPage() {
  const { t } = useLang();
  const social = useSocial();

  return (
    <div className="px-4 pb-24 pt-6">
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
        <Icon name="chevronLeft" className="size-4 flip-rtl" /> {t("prof.title")}
      </Link>
      <div className="mt-2">
        <PageHeader title={t("coachreg.title")} subtitle={t("coachreg.subtitle")} />
      </div>

      <RegisterCard userId={social?.userId ?? null} defaultName={social?.username ?? ""} />
      <ProgramCard userId={social?.userId ?? null} defaultName={social?.username ?? ""} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-3 block">
      <span className="text-[11px] font-bold text-faint">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "mt-1 w-full rounded-xl bg-base2 px-3 py-2.5 text-sm text-ink outline-none ring-1 ring-line focus:ring-brand";

function RegisterCard({ userId, defaultName }: { userId: string | null; defaultName: string }) {
  const { t } = useLang();
  const [f, setF] = useState({ name: defaultName, cred: "", city: "", phone: "", instagram: "", email: "", bio: "", specialties: "" });
  // useSocial() resolves after first render — fill the name once it arrives (if untouched).
  useEffect(() => {
    if (defaultName) setF((cur) => (cur.name ? cur : { ...cur, name: defaultName }));
  }, [defaultName]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPhoto(await compressImage(file, 512, 0.8).catch(() => null));
  }
  async function submit() {
    if (!f.name.trim() || !f.cred.trim()) return;
    setBusy(true);
    const ok = await registerCoach({ ...f, userId, photoData: photo });
    setBusy(false);
    if (ok) setDone(true);
  }

  if (done)
    return (
      <div className="mt-5 rounded-2xl bg-success-dim p-4 text-center ring-1 ring-success/25">
        <Icon name="verified" className="mx-auto size-8 text-success" />
        <p className="mt-2 text-sm font-bold text-success">{t("coachreg.registered")}</p>
      </div>
    );

  return (
    <section className="mt-5">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
        <Icon name="user" className="size-4 text-brand" /> {t("coachreg.reg")}
      </h2>
      <div className="rounded-2xl bg-card p-4 ring-1 ring-line">
        <Field label={t("coachreg.name")}><input className={inputCls} value={f.name} onChange={set("name")} /></Field>
        <Field label={t("coachreg.cred")}><input className={inputCls} value={f.cred} onChange={set("cred")} placeholder={t("coachreg.credPh")} /></Field>
        <div className="flex gap-3">
          <Field label={t("coachreg.city")}><input className={inputCls} value={f.city} onChange={set("city")} /></Field>
          <Field label={t("coachreg.phone")}><input className={inputCls} value={f.phone} onChange={set("phone")} dir="ltr" inputMode="tel" /></Field>
        </div>
        <div className="flex gap-3">
          <Field label={t("coachreg.instagram")}><input className={inputCls} value={f.instagram} onChange={set("instagram")} dir="ltr" /></Field>
          <Field label={t("coachreg.email")}><input className={inputCls} value={f.email} onChange={set("email")} dir="ltr" inputMode="email" /></Field>
        </div>
        <Field label={t("coachreg.specialties")}><input className={inputCls} value={f.specialties} onChange={set("specialties")} /></Field>
        <Field label={t("coachreg.bio")}><textarea rows={3} className={`${inputCls} resize-none`} value={f.bio} onChange={set("bio")} /></Field>

        <div className="mt-3 flex items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded-full bg-card2 px-3 py-1.5 text-xs font-bold text-muted ring-1 ring-line">
            <Icon name="library" className="size-4" /> {t("coachreg.photo")}
          </button>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="size-10 rounded-full object-cover ring-2 ring-brand/40" />
          )}
        </div>

        <button type="button" onClick={submit} disabled={busy || !f.name.trim() || !f.cred.trim()} className="mt-4 w-full rounded-2xl bg-brand py-2.5 text-sm font-bold text-brandink disabled:bg-card2 disabled:text-faint">
          {t("coachreg.submit")}
        </button>
      </div>
    </section>
  );
}

function ProgramCard({ userId, defaultName }: { userId: string | null; defaultName: string }) {
  const { t } = useLang();
  const [p, setP] = useState({ title: "", coachName: defaultName, kind: "gym", goal: "", level: "", days: 3, description: "" });
  useEffect(() => {
    if (defaultName) setP((cur) => (cur.coachName ? cur : { ...cur, coachName: defaultName }));
  }, [defaultName]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const setK = (k: keyof typeof p, v: string | number) => setP({ ...p, [k]: v });

  async function submit() {
    if (!p.title.trim() || !p.description.trim()) return;
    setBusy(true);
    const ok = await submitCoachProgram({ ...p, userId });
    setBusy(false);
    if (ok) setDone(true);
  }

  if (done)
    return (
      <div className="mt-5 rounded-2xl bg-success-dim p-4 text-center ring-1 ring-success/25">
        <Icon name="verified" className="mx-auto size-8 text-success" />
        <p className="mt-2 text-sm font-bold text-success">{t("coachreg.progSent")}</p>
      </div>
    );

  return (
    <section className="mt-5">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
        <Icon name="dumbbell" className="size-4 text-brand" /> {t("coachreg.progTitle")}
      </h2>
      <div className="rounded-2xl bg-card p-4 ring-1 ring-line">
        <p className="text-xs text-muted">{t("coachreg.progHint")}</p>
        <Field label={t("coachreg.progName")}><input className={inputCls} value={p.title} onChange={(e) => setK("title", e.target.value)} /></Field>
        <div className="mt-3">
          <span className="text-[11px] font-bold text-faint">{t("coachreg.progKind")}</span>
          <div className="mt-1 flex gap-2">
            {(["gym", "diet"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setK("kind", k)} className={`flex-1 rounded-xl py-2 text-xs font-bold ring-1 ${p.kind === k ? "bg-brand/15 text-brand ring-brand/30" : "bg-card2 text-muted ring-line"}`}>
                {t(k === "gym" ? "coachreg.gymKind" : "coachreg.dietKind")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <Field label={t("coachreg.progGoal")}><input className={inputCls} value={p.goal} onChange={(e) => setK("goal", e.target.value)} /></Field>
          <Field label={t("coachreg.progLevel")}><input className={inputCls} value={p.level} onChange={(e) => setK("level", e.target.value)} /></Field>
        </div>
        <Field label={t("coachreg.progDesc")}><textarea rows={4} className={`${inputCls} resize-none`} value={p.description} onChange={(e) => setK("description", e.target.value)} /></Field>
        <button type="button" onClick={submit} disabled={busy || !p.title.trim() || !p.description.trim()} className="mt-4 w-full rounded-2xl bg-brand py-2.5 text-sm font-bold text-brandink disabled:bg-card2 disabled:text-faint">
          {t("coachreg.progSubmit")}
        </button>
      </div>
    </section>
  );
}
