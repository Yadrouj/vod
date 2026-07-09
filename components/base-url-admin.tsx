"use client";

import { useState } from "react";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";

type Props = {
  initialBaseUrl: string;
  updatedAt: string | null;
  sampleBefore: string;
  sampleAfter: string;
  locale?: Locale;
};

export function BaseUrlAdmin({ initialBaseUrl, updatedAt, sampleBefore, sampleAfter, locale = DEFAULT_LOCALE }: Props) {
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [currentBaseUrl, setCurrentBaseUrl] = useState(initialBaseUrl);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const t = getDictionary(locale);

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/base-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ baseUrl }),
      });
      const payload = (await response.json()) as { baseUrl?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Update failed.");
      setCurrentBaseUrl(payload.baseUrl ?? baseUrl);
      setBaseUrl(payload.baseUrl ?? baseUrl);
      setStatus(t.admin.success);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.admin.failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-copy">
        <p className="label">{t.common.admin}</p>
        <h1>{t.admin.title}</h1>
        <p className="muted">
          {t.admin.intro}
        </p>
      </div>

      <div className="admin-form">
        <label>
          <span className="label">{t.admin.currentBase}</span>
          <input className="search" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
        </label>
        <button className="play-glow" type="button" onClick={save} disabled={saving}>
          {saving ? t.admin.updating : t.admin.updateLinks}
        </button>
      </div>

      {status && <p className="admin-status">{status}</p>}

      <div className="admin-grid">
        <Info label={t.admin.activeBase} value={currentBaseUrl} />
        <Info label={t.admin.updated} value={updatedAt ? new Date(updatedAt).toLocaleString() : t.admin.defaultValue} />
        <Info label={t.admin.originalSample} value={sampleBefore} />
        <Info label={t.admin.afterRewrite} value={sampleAfter.replace(initialBaseUrl, currentBaseUrl)} />
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-card admin-info">
      <p className="label">{label}</p>
      <p className="value">{value}</p>
    </div>
  );
}
