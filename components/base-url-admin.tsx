"use client";

import { useState } from "react";

type Props = {
  initialBaseUrl: string;
  updatedAt: string | null;
  sampleBefore: string;
  sampleAfter: string;
};

export function BaseUrlAdmin({ initialBaseUrl, updatedAt, sampleBefore, sampleAfter }: Props) {
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [currentBaseUrl, setCurrentBaseUrl] = useState(initialBaseUrl);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      setStatus("Base URL updated. All download links now use the new host.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-copy">
        <p className="label">Admin</p>
        <h1>Download Base URL</h1>
        <p className="muted">
          Change the DonyayeSerial host once. Detail pages, player sources, movie downloads, and episode quality links
          will use the new base immediately.
        </p>
      </div>

      <div className="admin-form">
        <label>
          <span className="label">Current base</span>
          <input className="search" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
        </label>
        <button className="play-glow" type="button" onClick={save} disabled={saving}>
          {saving ? "Updating" : "Update links"}
        </button>
      </div>

      {status && <p className="admin-status">{status}</p>}

      <div className="admin-grid">
        <Info label="Active base" value={currentBaseUrl} />
        <Info label="Updated" value={updatedAt ? new Date(updatedAt).toLocaleString() : "Default"} />
        <Info label="Original sample" value={sampleBefore} />
        <Info label="After rewrite" value={sampleAfter.replace(initialBaseUrl, currentBaseUrl)} />
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
