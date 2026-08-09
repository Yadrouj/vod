"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Base = {
  id: string;
  provider: string;
  label: string;
  baseUrl: string;
  aliases?: string[];
  manual: boolean;
  lastSeenAt?: string | null;
};

type Status = {
  state: string;
  phase: string;
  mode?: string;
  pid?: number;
  startedAt?: string | null;
  updatedAt?: string | null;
  finishedAt?: string | null;
  currentTitle?: string | null;
  archivePages?: { total?: number; processed?: number };
  totals?: Record<string, number>;
  recentLogs?: string[];
  error?: string | null;
};

const INITIAL_STATUS: Status = { state: "loading", phase: "Loading F2MY controls…" };

export function F2myScraperAdmin() {
  const [status, setStatus] = useState<Status>(INITIAL_STATUS);
  const [bases, setBases] = useState<Base[]>([]);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const requestHeaders = useCallback((json = false) => ({
    ...(json ? { "content-type": "application/json" } : {}),
    ...(token.trim() ? { "x-admin-token": token.trim() } : {}),
  }), [token]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/f2my", { cache: "no-store", headers: requestHeaders() });
      const payload = (await response.json()) as { status?: Status; registry?: { bases?: Record<string, Base> }; error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not load F2MY status.");
      setStatus(payload.status || INITIAL_STATUS);
      const nextBases = Object.values(payload.registry?.bases || {}).filter((base) => base.provider === "f2my");
      setBases(nextBases.sort((left, right) => left.label.localeCompare(right.label)));
      setDrafts((current) => Object.fromEntries(nextBases.map((base) => [base.id, current[base.id] ?? base.baseUrl])));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load F2MY status.");
    }
  }, [requestHeaders]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2_500);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (token) window.sessionStorage.setItem("sarvnema-admin-token", token);
  }, [token]);

  useEffect(() => {
    setToken(window.sessionStorage.getItem("sarvnema-admin-token") || "");
  }, []);

  const running = ["running", "starting", "cancelling"].includes(status.state);
  const totals = status.totals || {};
  const archiveProgress = Math.min(100, Math.round(((status.archivePages?.processed || 0) / Math.max(1, status.archivePages?.total || 0)) * 100));
  const detailProgress = Math.min(100, Math.round(((totals.processed || 0) / Math.max(1, totals.queued || 0)) * 100));
  const summary = useMemo(() => [
    ["Archive pages", `${status.archivePages?.processed || 0}/${status.archivePages?.total || 0}`],
    ["Titles found", String(totals.discovered || 0)],
    ["Pages scanned", `${totals.processed || 0}/${totals.queued || 0}`],
    ["New titles", String(totals.newTitles || 0)],
    ["Updated", String(totals.updatedTitles || 0)],
    ["Links found", String(totals.linksFound || 0)],
    ["New links", String(totals.newLinks || 0)],
    ["Failures", String(totals.failures || 0)],
  ], [status.archivePages, totals]);

  async function run(action: "start" | "enrich" | "cancel", full = false) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/f2my", {
        method: "POST",
        headers: requestHeaders(true),
        body: JSON.stringify({ action, full }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "F2MY action failed.");
      setMessage(action === "cancel" ? "Cancellation requested. The active request will finish safely." : action === "enrich" ? "IMDb enrichment started in the background." : "F2MY crawl started in the background.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "F2MY action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveBase(base: Base) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/f2my", {
        method: "POST",
        headers: requestHeaders(true),
        body: JSON.stringify({ action: "update-base", baseId: base.id, baseUrl: drafts[base.id] || base.baseUrl }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not save this base URL.");
      setMessage(`${base.label} is now updated for every matching saved file.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this base URL.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-panel f2my-admin-panel">
      <div className="admin-copy">
        <p className="label">F2MY catalog engine</p>
        <h2>Movies + series crawler</h2>
        <p className="muted">Discovers all archive pages, enters every title page, keeps every quality and subtitle link, then enriches new IMDb titles. CDN hosts are stored separately from file paths so a rotation takes one edit—not another full crawl.</p>
      </div>

      <div className="f2my-admin-actions">
        <label className="f2my-token">
          <span className="label">Admin token (only when configured)</span>
          <input className="search" type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Local development needs no token" />
        </label>
        <div className="f2my-button-row">
          <button className="play-glow" type="button" disabled={busy || running} onClick={() => void run("start")}>Incremental sync</button>
          <button className="chip" type="button" disabled={busy || running} onClick={() => void run("start", true)}>Full re-scan</button>
          <button className="chip" type="button" disabled={busy || running} onClick={() => void run("enrich")}>Enrich new IMDb data</button>
          {running && <button className="chip f2my-stop" type="button" disabled={busy} onClick={() => void run("cancel")}>Stop safely</button>}
        </div>
      </div>

      <div className="f2my-status-head">
        <div><span className={`f2my-state f2my-state-${status.state}`}>{status.state}</span><strong>{status.phase}</strong></div>
        <span className="muted">{status.mode || "—"}{status.currentTitle ? ` · ${status.currentTitle}` : ""}</span>
      </div>
      <div className="f2my-progress-stack">
        <Progress label="Archive discovery" value={archiveProgress} detail={`${status.archivePages?.processed || 0} / ${status.archivePages?.total || 0}`} />
        <Progress label="Title detail pages" value={detailProgress} detail={`${totals.processed || 0} / ${totals.queued || 0}`} />
      </div>

      <div className="f2my-counter-grid">
        {summary.map(([label, value]) => <div className="info-card admin-info" key={label}><p className="label">{label}</p><p className="value">{value}</p></div>)}
      </div>
      {message && <p className="admin-status">{message}</p>}
      {status.error && <p className="admin-status f2my-error">{status.error}</p>}

      <div className="f2my-admin-lower">
        <div className="f2my-log-card">
          <p className="label">Live worker log</p>
          <div className="f2my-log">{(status.recentLogs || ["No crawl has run yet."]).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div>
        </div>
        <div className="f2my-base-card">
          <p className="label">Updatable F2MY base links</p>
          <p className="muted">Manual values are protected from the next automatic scan.</p>
          <div className="f2my-base-list">
            {bases.length === 0 && <p className="muted">Run a scan to discover source hosts.</p>}
            {bases.map((base) => (
              <div className="f2my-base-row" key={base.id}>
                <div><strong>{base.label}</strong><span>{base.id}{base.manual ? " · manual" : " · auto"}</span></div>
                <input className="search" value={drafts[base.id] || ""} onChange={(event) => setDrafts((current) => ({ ...current, [base.id]: event.target.value }))} />
                <button className="chip" type="button" disabled={busy || !drafts[base.id]} onClick={() => void saveBase(base)}>Save host</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Progress({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="f2my-progress"><div><span>{label}</span><strong>{detail}</strong></div><span><i style={{ width: `${value}%` }} /></span></div>;
}
