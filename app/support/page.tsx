"use client";

import { useState } from "react";
import { Button, PageHeader, cn } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { addFeedback } from "@/lib/db";
import { useFeedbackList } from "@/lib/hooks";
import type { Feedback } from "@/lib/types";

const TYPES: { value: Feedback["type"]; key: string; icon: "x" | "sparkles" | "edit" }[] = [
  { value: "bug", key: "sup.typeBug", icon: "x" },
  { value: "idea", key: "sup.typeIdea", icon: "sparkles" },
  { value: "other", key: "sup.typeOther", icon: "edit" },
];

export default function SupportPage() {
  const { t, lang } = useLang();
  const list = useFeedbackList();
  const [type, setType] = useState<Feedback["type"]>("idea");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!message.trim()) {
      setError(t("sup.empty"));
      return;
    }
    setError(null);
    await addFeedback({
      type,
      message: message.trim(),
      contact: contact.trim() || null,
    });
    setMessage("");
    setContact("");
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  }

  const typeLabel = (v: Feedback["type"]) =>
    t(TYPES.find((x) => x.value === v)!.key);

  return (
    <div className="px-4 pt-6">
      <PageHeader title={t("sup.title")} subtitle={t("sup.subtitle")} />

      <div className="mt-5 space-y-4 rounded-3xl bg-card p-5 ring-1 ring-line">
        {/* type selector */}
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((x) => (
            <button
              key={x.value}
              type="button"
              onClick={() => setType(x.value)}
              className={cn(
                "rounded-xl px-2 py-2.5 text-xs font-extrabold transition-colors",
                type === x.value
                  ? "bg-brand text-brandink"
                  : "bg-card2 text-muted ring-1 ring-line"
              )}
            >
              {t(x.key)}
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("sup.message")}
          rows={4}
          className="w-full resize-none rounded-xl bg-base2 px-4 py-3 text-sm text-ink outline-none ring-1 ring-line placeholder:text-faint focus:ring-2 focus:ring-brand"
        />
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={t("sup.contact")}
          dir="ltr"
          className="h-11 w-full rounded-xl bg-base2 px-4 text-sm text-ink outline-none ring-1 ring-line placeholder:text-faint focus:ring-2 focus:ring-brand"
        />

        {error && <p className="text-xs font-semibold text-danger">{error}</p>}
        {sent && (
          <p className="rounded-xl bg-success-dim p-3 text-sm font-bold text-success ring-1 ring-success/25">
            {t("sup.sent")}
          </p>
        )}

        <Button className="w-full" onClick={submit}>
          <Icon name="chevronRight" className="size-4 flip-rtl" /> {t("sup.send")}
        </Button>
      </div>

      {/* previous messages */}
      {list && list.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-bold text-ink">{t("sup.history")}</h2>
          <div className="mt-2 space-y-2">
            {list.map((f) => (
              <div key={f.id} className="rounded-2xl bg-card p-3.5 ring-1 ring-line">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-card2 px-2.5 py-0.5 text-[10px] font-bold text-muted ring-1 ring-line">
                    {typeLabel(f.type)}
                  </span>
                  <span className="text-[10px] text-faint" dir="ltr">
                    {new Date(f.createdAt).toLocaleDateString(
                      lang === "fa" ? "fa-IR" : "en-US"
                    )}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{f.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
