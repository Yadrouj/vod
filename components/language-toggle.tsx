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
    <div
      className="language-toggle"
      data-active={locale}
    >
      <label htmlFor="language-select" className="sr-only">
        {t.title.language}
      </label>
      <select
        id="language-select"
        value={locale}
        onChange={(event) => changeLocale(event.target.value as Locale)}
        disabled={pending}
      >
        <option value="en">EN</option>
        <option value="fa">FA</option>
      </select>
    </div>
  );
}
