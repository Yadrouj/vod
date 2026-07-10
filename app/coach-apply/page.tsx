"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SocialGate } from "@/components/Social";
import { Button, PageHeader, Segmented, cn } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { useSocial } from "@/lib/hooks";
import {
  compressImage,
  createPrivateRequest,
  fetchCoachChat,
  fetchPrivateRequests,
  prepareCoachAttachment,
  registerCoach,
  sendCoachChat,
  submitCoachProgram,
  updatePrivateRequest,
  type CoachAttachment,
  type CoachChatMessage,
  type CoachPrivatePlan,
  type CoachPrivateRequest,
} from "@/lib/social";

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

      <PrivatePlanPanel userId={social?.userId ?? null} defaultName={social?.username ?? ""} loading={social === undefined} />

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

type DraftAttachment = { name: string; dataUrl: string };

function PrivatePlanPanel({
  userId,
  defaultName,
  loading,
}: {
  userId: string | null;
  defaultName: string;
  loading: boolean;
}) {
  const { lang } = useLang();
  const [requests, setRequests] = useState<CoachPrivateRequest[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    coachName: "",
    kind: "gym" as "gym" | "diet",
    goal: "",
    budget: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) {
      return;
    }
    let alive = true;
    fetchPrivateRequests(userId)
      .then((rows) => {
        if (!alive) return;
        setRequests(rows);
        setSelectedId((current) => current ?? rows[0]?.id ?? null);
      })
      .catch(() => alive && setRequests([]));
    return () => {
      alive = false;
    };
  }, [userId]);

  if (loading) {
    return <div className="mt-5 rounded-2xl bg-card p-4 text-sm text-muted ring-1 ring-line">...</div>;
  }

  if (!userId) {
    return (
      <section className="mt-5">
        <SocialGate />
      </section>
    );
  }

  const selected = requests?.find((request) => request.id === selectedId) ?? requests?.[0] ?? null;

  async function submitRequest() {
    if (!form.goal.trim() || busy || !userId) return;
    setBusy(true);
    const request = await createPrivateRequest({
      userId,
      customerName: defaultName || (lang === "fa" ? "کاربر" : "Customer"),
      coachName: form.coachName.trim() || (lang === "fa" ? "مربی" : "Coach"),
      kind: form.kind,
      goal: form.goal.trim(),
      budget: form.budget.trim(),
      notes: form.notes.trim(),
    });
    setBusy(false);
    if (request) {
      setRequests((cur) => [request, ...(cur ?? [])]);
      setSelectedId(request.id);
      setForm({ coachName: "", kind: "gym", goal: "", budget: "", notes: "" });
    }
  }

  function replaceRequest(next: CoachPrivateRequest) {
    setRequests((cur) => (cur ?? []).map((item) => (item.id === next.id ? next : item)));
  }

  return (
    <section className="mt-5">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
        <Icon name="message" className="size-4 text-brand" />
        {lang === "fa" ? "درخواست برنامه خصوصی" : "Private plan request"}
      </h2>

      <div className="rounded-2xl bg-card p-4 ring-1 ring-line">
        <div className="grid grid-cols-2 gap-2">
          <input
            className={inputCls}
            value={form.coachName}
            onChange={(e) => setForm((cur) => ({ ...cur, coachName: e.target.value }))}
            placeholder={lang === "fa" ? "نام مربی" : "Coach name"}
          />
          <input
            className={inputCls}
            value={form.budget}
            onChange={(e) => setForm((cur) => ({ ...cur, budget: e.target.value }))}
            placeholder={lang === "fa" ? "بودجه" : "Budget"}
          />
        </div>
        <div className="mt-2">
          <Segmented
            value={form.kind}
            onChange={(kind) => setForm((cur) => ({ ...cur, kind }))}
            options={[
              { value: "gym", label: lang === "fa" ? "تمرین" : "Training" },
              { value: "diet", label: lang === "fa" ? "تغذیه" : "Nutrition" },
            ]}
          />
        </div>
        <input
          className={inputCls}
          value={form.goal}
          onChange={(e) => setForm((cur) => ({ ...cur, goal: e.target.value }))}
          placeholder={lang === "fa" ? "هدفت از برنامه خصوصی چیست؟" : "What goal should this private plan solve?"}
        />
        <textarea
          rows={3}
          className={`${inputCls} resize-none`}
          value={form.notes}
          onChange={(e) => setForm((cur) => ({ ...cur, notes: e.target.value }))}
          placeholder={lang === "fa" ? "شرایط، محدودیت، آسیب‌دیدگی یا توضیحات..." : "Notes, limits, injuries, schedule..."}
        />
        <Button onClick={submitRequest} disabled={busy || !form.goal.trim()} className="mt-3 w-full">
          <Icon name="plus" className="size-4" />
          {lang === "fa" ? "درخواست برنامه خصوصی" : "Request private plan"}
        </Button>
      </div>

      {(requests?.length ?? 0) > 0 && (
        <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1">
          {requests!.map((request) => (
            <button
              key={request.id}
              type="button"
              onClick={() => setSelectedId(request.id)}
              className={cn(
                "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ring-1",
                selected?.id === request.id
                  ? "bg-brand text-brandink ring-brand"
                  : "bg-card2 text-muted ring-line"
              )}
            >
              {request.offerTitle || request.goal}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <PrivateRequestCard
          request={selected}
          onUpdated={replaceRequest}
        />
      )}
    </section>
  );
}

function PrivateRequestCard({
  request,
  onUpdated,
}: {
  request: CoachPrivateRequest;
  onUpdated: (request: CoachPrivateRequest) => void;
}) {
  const { lang, n } = useLang();
  const statusLabel =
    request.status === "paid"
      ? lang === "fa"
        ? "پرداخت شده"
        : "Paid"
      : request.status === "offered"
      ? lang === "fa"
        ? "آماده پرداخت"
        : "Ready to pay"
      : lang === "fa"
      ? "در انتظار پیشنهاد مربی"
      : "Waiting for coach offer";

  async function pay() {
    const next = await updatePrivateRequest({ id: request.id, status: "paid" });
    if (next) onUpdated(next);
  }

  return (
    <div className="mt-3 rounded-2xl bg-card p-4 ring-1 ring-line">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-ink">{request.goal}</p>
          <p className="mt-0.5 text-xs text-muted">
            {request.coachName} · {request.kind === "diet" ? (lang === "fa" ? "تغذیه" : "Diet") : (lang === "fa" ? "تمرین" : "Training")}
          </p>
        </div>
        <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">
          {statusLabel}
        </span>
      </div>
      {request.notes && <p className="mt-2 whitespace-pre-line text-xs text-faint">{request.notes}</p>}

      {request.status === "requested" && (
        <CoachOfferForm request={request} onUpdated={onUpdated} />
      )}

      {(request.status === "offered" || request.status === "paid") && (
        <div className="mt-3 rounded-xl bg-base2 p-3 ring-1 ring-line">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-ink">{request.offerTitle}</p>
            <span className="text-sm font-extrabold text-brand">
              {request.priceToman ? `${n(request.priceToman.toLocaleString("en-US"))} ${lang === "fa" ? "تومان" : "Toman"}` : ""}
            </span>
          </div>
          {request.offerDays > 0 && (
            <p className="mt-1 text-xs text-muted">
              {lang === "fa" ? `${n(request.offerDays)} روز در هفته` : `${request.offerDays} days/week`}
            </p>
          )}
          <p className="mt-2 whitespace-pre-line text-sm text-muted">{request.offerDescription}</p>
          {request.status === "offered" && (
            <Button onClick={pay} className="mt-3 w-full">
              <Icon name="check" className="size-4" />
              {lang === "fa" ? "پرداخت و باز کردن چت خصوصی" : "Pay and unlock private chat"}
            </Button>
          )}
        </div>
      )}

      {request.status === "paid" && <PrivateChatThread request={request} />}
    </div>
  );
}

function CoachOfferForm({
  request,
  onUpdated,
}: {
  request: CoachPrivateRequest;
  onUpdated: (request: CoachPrivateRequest) => void;
}) {
  const { lang } = useLang();
  const [offer, setOffer] = useState({
    coachName: request.coachName,
    offerTitle: "",
    offerDescription: "",
    offerDays: request.kind === "diet" ? 7 : 3,
    priceToman: 0,
  });
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!offer.offerTitle.trim() || !offer.offerDescription.trim() || busy) return;
    setBusy(true);
    const next = await updatePrivateRequest({
      id: request.id,
      ...offer,
      status: "offered",
    });
    setBusy(false);
    if (next) onUpdated(next);
  }

  return (
    <div className="mt-3 rounded-xl bg-base2 p-3 ring-1 ring-line">
      <p className="text-xs font-bold text-faint">
        {lang === "fa" ? "بخش مربی: پیشنهاد برنامه و قیمت را وارد کن." : "Coach: add the plan offer and price."}
      </p>
      <input className={inputCls} value={offer.coachName} onChange={(e) => setOffer((cur) => ({ ...cur, coachName: e.target.value }))} placeholder={lang === "fa" ? "نام مربی" : "Coach name"} />
      <input className={inputCls} value={offer.offerTitle} onChange={(e) => setOffer((cur) => ({ ...cur, offerTitle: e.target.value }))} placeholder={lang === "fa" ? "عنوان پیشنهاد" : "Offer title"} />
      <div className="grid grid-cols-2 gap-2">
        <input type="number" className={inputCls} value={offer.priceToman} onChange={(e) => setOffer((cur) => ({ ...cur, priceToman: Number(e.target.value) }))} placeholder={lang === "fa" ? "قیمت تومان" : "Price Toman"} />
        <input type="number" min={0} max={7} className={inputCls} value={offer.offerDays} onChange={(e) => setOffer((cur) => ({ ...cur, offerDays: Number(e.target.value) }))} placeholder={lang === "fa" ? "روز" : "Days"} />
      </div>
      <textarea rows={4} className={`${inputCls} resize-none`} value={offer.offerDescription} onChange={(e) => setOffer((cur) => ({ ...cur, offerDescription: e.target.value }))} placeholder={lang === "fa" ? "توضیح پیشنهاد، خروجی برنامه، زمان تحویل..." : "Offer details, deliverables, delivery time..."} />
      <Button onClick={submit} disabled={busy || !offer.offerTitle.trim() || !offer.offerDescription.trim()} className="mt-3 w-full">
        {lang === "fa" ? "ارسال پیشنهاد برای پرداخت" : "Send offer for payment"}
      </Button>
    </div>
  );
}

function PrivateChatThread({
  request,
}: {
  request: CoachPrivateRequest;
}) {
  const { lang } = useLang();
  const [messages, setMessages] = useState<CoachChatMessage[] | null>(null);
  const [role, setRole] = useState<"customer" | "coach">("coach");
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [plan, setPlan] = useState<CoachPrivatePlan>({
    title: request.offerTitle || "",
    kind: request.kind,
    days: request.offerDays,
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    fetchCoachChat(request.userId, request.id)
      .then((rows) => alive && setMessages(rows))
      .catch(() => alive && setMessages([]));
    return () => {
      alive = false;
    };
  }, [request.id, request.userId]);

  async function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, 4);
    const prepared = await Promise.all(files.map((file) => prepareCoachAttachment(file)));
    setAttachments((cur) => [...cur, ...prepared.filter((item): item is DraftAttachment => Boolean(item))].slice(0, 4));
    e.target.value = "";
  }

  async function submit() {
    if ((!text.trim() && !attachments.length && !(role === "coach" && plan.description.trim())) || busy) return;
    setBusy(true);
    const message = await sendCoachChat({
      requestId: request.id,
      userId: request.userId,
      customerName: request.customerName,
      coachName: request.coachName,
      role,
      text: text.trim(),
      privatePlan: role === "coach" && plan.description.trim()
        ? { ...plan, title: plan.title.trim() || request.offerTitle || (lang === "fa" ? "برنامه خصوصی" : "Private plan") }
        : null,
      attachmentsData: attachments,
    });
    setBusy(false);
    if (message) {
      setMessages((cur) => [...(cur ?? []), message]);
      setText("");
      setAttachments([]);
      setPlan({ title: request.offerTitle || "", kind: request.kind, days: request.offerDays, description: "" });
    }
  }

  return (
    <div className="mt-4 border-t border-line pt-3">
      <h3 className="text-sm font-bold text-ink">
        {lang === "fa" ? "چت خصوصی باز شده" : "Private chat unlocked"}
      </h3>
      <div className="mt-3 space-y-2">
        {messages == null && <p className="py-3 text-center text-xs text-muted">...</p>}
        {messages?.length === 0 && <p className="rounded-xl bg-base2 p-3 text-center text-xs text-muted ring-1 ring-line">{lang === "fa" ? "هنوز پیامی نیست." : "No messages yet."}</p>}
        {messages?.map((message) => <PrivateMessage key={message.id} message={message} />)}
      </div>

      <div className="mt-3 rounded-xl bg-base2 p-3 ring-1 ring-line">
        <Segmented
          value={role}
          onChange={setRole}
          options={[
            { value: "coach", label: lang === "fa" ? "مربی" : "Coach" },
            { value: "customer", label: lang === "fa" ? "مشتری" : "Customer" },
          ]}
        />
        <textarea rows={3} className={`${inputCls} resize-none`} value={text} onChange={(e) => setText(e.target.value)} placeholder={lang === "fa" ? "متن پیام..." : "Message text..."} />
        {role === "coach" && (
          <div className="mt-2 rounded-xl bg-card p-3 ring-1 ring-line">
            <p className="text-xs font-bold text-faint">{lang === "fa" ? "ارسال برنامه خصوصی نهایی" : "Send final private plan"}</p>
            <input className={inputCls} value={plan.title} onChange={(e) => setPlan((cur) => ({ ...cur, title: e.target.value }))} placeholder={lang === "fa" ? "عنوان برنامه" : "Plan title"} />
            <textarea rows={4} className={`${inputCls} resize-none`} value={plan.description} onChange={(e) => setPlan((cur) => ({ ...cur, description: e.target.value }))} placeholder={lang === "fa" ? "جزئیات برنامه..." : "Plan details..."} />
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <span key={attachment.name} className="rounded-full bg-card px-2 py-1 text-[10px] font-bold text-muted ring-1 ring-line">
              {attachment.name}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" hidden onChange={pickFiles} />
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-bold text-muted ring-1 ring-line">
            <Icon name="download" className="size-3.5" />
            {lang === "fa" ? "پیوست عکس/PDF" : "Attach image/PDF"}
          </button>
          <Button onClick={submit} disabled={busy || (!text.trim() && !attachments.length && !(role === "coach" && plan.description.trim()))} className="ms-auto">
            {lang === "fa" ? "ارسال" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PrivateMessage({ message }: { message: CoachChatMessage }) {
  const { lang, n } = useLang();
  const isCoach = message.role === "coach";
  return (
    <div className={cn("flex", isCoach ? "justify-start" : "justify-end")}>
      <div className={cn("max-w-[90%] rounded-2xl p-3 ring-1", isCoach ? "bg-card2 text-ink ring-line" : "bg-brand text-brandink ring-brand")}>
        <p className={cn("text-[10px] font-bold", isCoach ? "text-faint" : "text-brandink/70")}>
          {isCoach ? message.coachName : message.customerName}
        </p>
        {message.text && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{message.text}</p>}
        {message.privatePlan && (
          <div className="mt-2 rounded-xl bg-base/30 p-3 ring-1 ring-line">
            <p className="font-bold">{message.privatePlan.title}</p>
            {message.privatePlan.days > 0 && <p className="text-[11px] text-muted">{lang === "fa" ? `${n(message.privatePlan.days)} روز در هفته` : `${message.privatePlan.days} days/week`}</p>}
            <p className="mt-2 whitespace-pre-line text-sm">{message.privatePlan.description}</p>
          </div>
        )}
        {message.attachments.length > 0 && (
          <div className="mt-2 grid gap-2">
            {message.attachments.map((attachment) => <AttachmentPreview key={attachment.id} attachment={attachment} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function AttachmentPreview({ attachment }: { attachment: CoachAttachment }) {
  const { lang } = useLang();
  if (attachment.type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={attachment.url} alt={attachment.name} className="max-h-56 w-full rounded-xl object-cover" />
    );
  }
  return (
    <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-xs font-bold text-brand ring-1 ring-line">
      <Icon name="download" className="size-4" />
      {lang === "fa" ? "دانلود PDF" : "Download PDF"} · {attachment.name}
    </a>
  );
}

function RegisterCard({ userId, defaultName }: { userId: string | null; defaultName: string }) {
  const { t } = useLang();
  const [f, setF] = useState({ name: defaultName, cred: "", city: "", phone: "", instagram: "", email: "", bio: "", specialties: "" });
  // useSocial() resolves after first render — fill the name once it arrives (if untouched).
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
    const name = (f.name || defaultName).trim();
    if (!name || !f.cred.trim()) return;
    setBusy(true);
    const ok = await registerCoach({ ...f, name, userId, photoData: photo });
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
        <Field label={t("coachreg.name")}><input className={inputCls} value={f.name || defaultName} onChange={set("name")} /></Field>
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

        <button type="button" onClick={submit} disabled={busy || !(f.name || defaultName).trim() || !f.cred.trim()} className="mt-4 w-full rounded-2xl bg-brand py-2.5 text-sm font-bold text-brandink disabled:bg-card2 disabled:text-faint">
          {t("coachreg.submit")}
        </button>
      </div>
    </section>
  );
}

function ProgramCard({ userId, defaultName }: { userId: string | null; defaultName: string }) {
  const { t } = useLang();
  const [p, setP] = useState({ title: "", coachName: defaultName, kind: "gym", goal: "", level: "", days: 3, description: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const setK = (k: keyof typeof p, v: string | number) => setP({ ...p, [k]: v });

  async function submit() {
    if (!p.title.trim() || !p.description.trim()) return;
    setBusy(true);
    const ok = await submitCoachProgram({ ...p, coachName: p.coachName || defaultName, userId });
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
