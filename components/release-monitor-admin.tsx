"use client";

import { useCallback, useEffect, useState } from "react";

type Step = { label?: string; state?: string; startedAt?: string; finishedAt?: string };
type Status = {
  state?: string;
  phase?: string;
  mode?: string;
  pid?: number;
  startedAt?: string;
  finishedAt?: string;
  summary?: { available?: number; comingSoon?: number; newEvents?: number; imdbCandidates?: number; catalogTitles?: number };
  imdbFailures?: string[];
  steps?: Step[];
  error?: string | null;
};

const fallback: Status = { state: "loading", phase: "Loading daily release monitor…", steps: [] };

export function ReleaseMonitorAdmin() {
  const [status, setStatus] = useState<Status>(fallback);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const headers = useCallback((json = false) => ({ ...(json ? { "content-type": "application/json" } : {}), ...(token.trim() ? { "x-admin-token": token.trim() } : {}) }), [token]);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/release-monitor", { cache: "no-store", headers: headers() });
      const payload = await response.json() as { status?: Status; error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not load daily monitor status.");
      setStatus(payload.status || fallback);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load daily monitor status.");
    }
  }, [headers]);
  useEffect(() => {
    setToken(window.sessionStorage.getItem("sarvnema-admin-token") || "");
  }, []);
  useEffect(() => {
    if (token) window.sessionStorage.setItem("sarvnema-admin-token", token);
  }, [token]);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3_000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  const running = ["running", "starting"].includes(status.state || "");
  async function run(action: "monitor" | "full") {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/admin/release-monitor", { method: "POST", headers: headers(true), body: JSON.stringify({ action }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not start the daily review.");
      setMessage(action === "full" ? "All source checks started in the background." : "IMDb and current source reconciliation started.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start the daily review.");
    } finally { setBusy(false); }
  }
  const summary = status.summary || {};
  return <section className="admin-panel release-monitor-admin">
    <div className="admin-copy">
      <p className="label">Daily release bot</p>
      <h2>IMDb → sources → update feed</h2>
      <p className="muted">Every completed run checks configured source crawlers first, reconciles current IMDb discoveries against the catalog, and publishes a clear Available or Coming soon status. It never removes existing archive entries when a source is temporarily unavailable.</p>
    </div>
    <label className="f2my-token">
      <span className="label">Admin token (only when configured)</span>
      <input className="search" type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Local development needs no token" />
    </label>
    <div className="f2my-button-row">
      <button className="play-glow" type="button" disabled={busy || running} onClick={() => void run("monitor")}>Run reconciliation now</button>
      <button className="chip" type="button" disabled={busy || running} onClick={() => void run("full")}>Run all source checks</button>
    </div>
    <div className="f2my-status-head"><div><span className={`f2my-state f2my-state-${status.state || "idle"}`}>{status.state || "idle"}</span><strong>{status.phase || "Waiting for a run"}</strong></div><span className="muted">{status.mode || "daily"}</span></div>
    <div className="f2my-counter-grid release-monitor-counters">
      <Counter label="Catalog titles" value={summary.catalogTitles} />
      <Counter label="Available" value={summary.available} />
      <Counter label="Coming soon" value={summary.comingSoon} />
      <Counter label="IMDb candidates" value={summary.imdbCandidates} />
    </div>
    <div className="release-monitor-steps">
      {(status.steps?.length ? status.steps : [{ label: "No completed daily review yet.", state: "idle" }]).map((step, index) => <p key={`${step.label}-${index}`}><span>{step.state || "pending"}</span>{step.label}</p>)}
    </div>
    {message && <p className="admin-status">{message}</p>}
    {status.error && <p className="admin-status f2my-error">{status.error}</p>}
    {!!status.imdbFailures?.length && <p className="admin-status f2my-error">IMDb discovery completed with {status.imdbFailures.length} temporary source error(s). The next daily run retries automatically.</p>}
  </section>;
}

function Counter({ label, value }: { label: string; value?: number }) {
  return <div className="info-card admin-info"><p className="label">{label}</p><p className="value">{value ?? 0}</p></div>;
}
