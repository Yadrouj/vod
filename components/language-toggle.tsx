"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";

export function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = getDictionary(locale);

  function changeLocale(nextLocale: Locale) {
    if (nextLocale === locale || pending) return;

    startTransition(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      router.refresh();
    });
  }

  return (
    <div className="language-toggle" aria-label={t.localeName}>
      <button
        type="button"
        className={locale === "en" ? "active" : ""}
        onClick={() => changeLocale("en")}
        disabled={pending}
      >
        EN
      </button>
      <button
        type="button"
        className={locale === "fa" ? "active" : ""}
        onClick={() => changeLocale("fa")}
        disabled={pending}
      >
        FA
      </button>
    </div>
  );
}
