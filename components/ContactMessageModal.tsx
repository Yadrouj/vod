"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { Button, cn } from "./ui";
import { useLang } from "./LangProvider";
import { authHeaders } from "@/lib/authClient";
import { useAccount } from "@/lib/hooks";
import { showInAppMessage } from "./InAppMessages";

export interface MessagePlace {
  source: "profile" | "gym" | "store" | "pharmacy" | "drugstore";
  id?: string | null;
  name?: string | null;
  phone?: string | null;
}

export default function ContactMessageModal({
  place,
  triggerClassName,
  triggerLabel,
  size = "sm",
}: {
  place: MessagePlace;
  triggerClassName?: string;
  triggerLabel?: string;
  size?: "sm" | "md";
}) {
  const { lang } = useLang();
  const account = useAccount();
  const fa = lang === "fa";
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"problem" | "message">("problem");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState(account?.name ?? "");
  const [contactPhone, setContactPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || !description.trim() || !contactPhone.trim()) {
      showInAppMessage({
        tone: "warn",
        title: fa ? "اطلاعات ناقص" : "Missing information",
        body: fa ? "عنوان، توضیح و شماره تماس را کامل کن." : "Please fill title, description, and phone number.",
      });
      return;
    }
    setBusy(true);
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      const res = await fetch("/api/messages", {
        method: "POST",
        headers,
        body: JSON.stringify({
          kind,
          source: place.source,
          placeId: place.id ?? null,
          placeName: place.name ?? null,
          placePhone: place.phone ?? null,
          title: title.trim(),
          description: description.trim(),
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
        }),
      });
      if (!res.ok) throw new Error("send failed");
      setOpen(false);
      setTitle("");
      setDescription("");
      setContactPhone("");
      showInAppMessage({
        tone: "success",
        title: fa ? "پیام ارسال شد" : "Message sent",
        body: fa ? "درخواستت برای ادمین ثبت شد." : "Your request was sent to admin.",
      });
    } catch {
      showInAppMessage({
        tone: "danger",
        title: fa ? "ارسال نشد" : "Could not send",
        body: fa ? "دوباره تلاش کن." : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  const pad = size === "md" ? "px-3 py-2 text-sm" : "px-2.5 py-1 text-[11px]";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          `inline-flex items-center gap-1 rounded-full bg-warn-dim font-bold text-warn ring-1 ring-warn/25 ${pad}`
        }
      >
        <Icon name="message" className="size-3.5" />
        {triggerLabel ?? (fa ? "گزارش/پیام" : "Report")}
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 px-4 pb-4 pt-16 sm:items-center" dir={fa ? "rtl" : "ltr"}>
          <div className="w-full max-w-md rounded-3xl bg-card p-4 shadow-2xl shadow-black/60 ring-1 ring-line">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-black text-ink">{fa ? "ارسال پیام به مدیریت" : "Contact admin"}</p>
                <p className="mt-1 text-xs text-muted">
                  {place.name
                    ? place.name
                    : fa
                    ? "پیام عمومی از پروفایل"
                    : "General profile message"}
                </p>
                {place.id && <p className="mt-0.5 text-[10px] text-faint" dir="ltr">ID: {place.id}</p>}
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-card2 p-2 text-muted">
                <Icon name="x" className="size-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <ModeButton active={kind === "problem"} onClick={() => setKind("problem")} label={fa ? "گزارش مشکل" : "Problem"} />
              <ModeButton active={kind === "message"} onClick={() => setKind("message")} label={fa ? "پیام" : "Message"} />
            </div>

            <div className="mt-3 space-y-3">
              <Input value={title} onChange={setTitle} placeholder={fa ? "عنوان درخواست" : "Request title"} />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder={fa ? "توضیح کامل مشکل یا پیام" : "Describe the issue or message"}
                className="w-full resize-none rounded-xl bg-base2 px-3 py-2.5 text-sm text-ink outline-none ring-1 ring-line placeholder:text-faint focus:ring-brand"
              />
              <Input value={contactName} onChange={setContactName} placeholder={fa ? "نام شما" : "Your name"} />
              <Input value={contactPhone} onChange={setContactPhone} placeholder={fa ? "شماره تماس برای پیگیری" : "Phone number for callback"} dir="ltr" />
              {place.phone && (
                <p className="rounded-xl bg-base2 p-2 text-[11px] text-muted ring-1 ring-line" dir="ltr">
                  Place phone: {place.phone}
                </p>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
                {fa ? "انصراف" : "Cancel"}
              </Button>
              <Button className="flex-1" onClick={submit} disabled={busy}>
                <Icon name="message" className="size-4" />
                {busy ? (fa ? "در حال ارسال..." : "Sending...") : fa ? "ارسال" : "Send"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 rounded-xl text-xs font-extrabold ring-1",
        active ? "bg-brand text-brandink ring-brand" : "bg-card2 text-muted ring-line"
      )}
    >
      {label}
    </button>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  dir,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir={dir}
      className="h-11 w-full rounded-xl bg-base2 px-3 text-sm text-ink outline-none ring-1 ring-line placeholder:text-faint focus:ring-brand"
    />
  );
}
