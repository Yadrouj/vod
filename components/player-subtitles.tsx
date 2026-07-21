"use client";

import { Captions, Check, Clock3, FileUp, Link2, LoaderCircle, RefreshCw, Search, Subtitles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { cuesToVtt, decodeSubtitleBytes, normalizeSubtitleToVtt, parseSubtitleCues } from "@/lib/subtitle-format";
import { AUTO_SUBTITLE_SELECTION, OFF_SUBTITLE_SELECTION, type SubtitleSelection } from "@/lib/subtitle-types";

type OnlineSubtitle = {
  detailUrl: string;
  trackUrl: string;
  title: string;
  language: string;
  releases: string[];
  author: string | null;
  rating: "good" | "not rated" | null;
};

type NativeSubtitle = {
  id: string;
  index: number;
  label: string;
  language: string;
};

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  itemId: string;
  title: string;
  sourceKey: string;
  sourceLabel?: string;
  open: boolean;
  onClose: () => void;
  selection?: SubtitleSelection;
  onSelectionChange?: (selection: SubtitleSelection) => void;
  canChange?: boolean;
  shared?: boolean;
};

const LOCAL_SUBTITLE_LIMIT = 320 * 1024;

export function PlayerSubtitles({
  videoRef,
  itemId,
  title,
  sourceKey,
  sourceLabel = "",
  open,
  onClose,
  selection,
  onSelectionChange,
  canChange = true,
  shared = false,
}: Props) {
  const [internalSelection, setInternalSelection] = useState<SubtitleSelection>(AUTO_SUBTITLE_SELECTION);
  const activeSelection = selection ?? internalSelection;
  const [onlineItems, setOnlineItems] = useState<OnlineSubtitle[]>([]);
  const [nativeTracks, setNativeTracks] = useState<NativeSubtitle[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [status, setStatus] = useState("Looking for embedded subtitles…");
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [size, setSize] = useState<"small" | "medium" | "large">("medium");
  const managedTrackRef = useRef<HTMLTrackElement | null>(null);
  const managedUrlRef = useRef<string | null>(null);
  const contentCacheRef = useRef(new Map<string, string>());
  const applyRevisionRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isControlled = selection !== undefined;

  const sortedOnlineItems = useMemo(
    () => [...onlineItems].sort((left, right) => subtitleScore(right, sourceLabel, sourceKey) - subtitleScore(left, sourceLabel, sourceKey)),
    [onlineItems, sourceKey, sourceLabel],
  );

  const clearManagedTrack = useCallback(() => {
    managedTrackRef.current?.remove();
    managedTrackRef.current = null;
    if (managedUrlRef.current) URL.revokeObjectURL(managedUrlRef.current);
    managedUrlRef.current = null;
  }, []);

  const mountManagedTrack = useCallback((video: HTMLVideoElement, vtt: string, label: string, language: string) => {
    clearManagedTrack();
    disableAllTracks(video);
    const blobUrl = URL.createObjectURL(new Blob([vtt], { type: "text/vtt;charset=utf-8" }));
    const element = document.createElement("track");
    element.kind = "subtitles";
    element.label = label;
    element.srclang = normalizeLanguageCode(language);
    element.src = blobUrl;
    element.default = true;
    element.addEventListener("load", () => { element.track.mode = "showing"; }, { once: true });
    video.appendChild(element);
    element.track.mode = "showing";
    managedTrackRef.current = element;
    managedUrlRef.current = blobUrl;
  }, [clearManagedTrack]);

  const fetchSubtitleText = useCallback(async (url: string, cacheKey: string) => {
    if (!url) throw new Error("Subtitle URL is missing.");
    const cached = contentCacheRef.current.get(cacheKey);
    if (cached) return cached;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 16_000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || `Subtitle request failed (${response.status}).`);
      }
      const text = await response.text();
      contentCacheRef.current.set(cacheKey, text);
      return text;
    } finally {
      window.clearTimeout(timer);
    }
  }, []);

  const applySelection = useCallback(async (next: SubtitleSelection, revision: number) => {
    const video = videoRef.current;
    if (!video) return;
    disableAllTracks(video);

    if (next.mode === "off") {
      clearManagedTrack();
      setStatus("Subtitles are off");
      return;
    }

    if (next.mode === "embedded" || next.mode === "auto") {
      const embedded = next.mode === "embedded"
        ? nativeTracks.find((track) => track.id === next.nativeTrackId) ?? nativeTracks[0]
        : preferredNativeTrack(nativeTracks);
      if (embedded) {
        clearManagedTrack();
        const track = video.textTracks[embedded.index];
        if (track) track.mode = "showing";
        setStatus(`${embedded.label} · embedded`);
        return;
      }
      if (next.mode === "embedded") {
        setStatus("This browser did not expose the embedded subtitle track.");
        return;
      }
    }

    const resolved = next.mode === "auto" ? sortedOnlineItems[0] ? onlineSelection(sortedOnlineItems[0]) : null : next;
    if (!resolved) {
      clearManagedTrack();
      setStatus(onlineLoading ? "Finding an online subtitle…" : "No compatible subtitle was found automatically.");
      return;
    }

    try {
      setStatus(`Loading ${resolved.label}…`);
      const raw = resolved.content ?? await fetchSubtitleText(resolved.url ?? "", resolved.id);
      if (revision !== applyRevisionRef.current) return;
      const cues = parseSubtitleCues(raw, `${resolved.label}.vtt`);
      if (!cues.length) throw new Error("This subtitle contains no readable cues.");
      mountManagedTrack(video, cuesToVtt(cues, offset), resolved.label, resolved.language);
      setStatus(`${resolved.label}${offset ? ` · ${offset > 0 ? "+" : ""}${offset.toFixed(1)}s` : ""}`);
    } catch (reason) {
      if (revision !== applyRevisionRef.current) return;
      clearManagedTrack();
      setStatus(reason instanceof Error ? reason.message : "Subtitle could not be loaded.");
    }
  }, [clearManagedTrack, fetchSubtitleText, mountManagedTrack, nativeTracks, offset, onlineLoading, sortedOnlineItems, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.dataset.subtitleSize = size;
  }, [size, videoRef]);

  useEffect(() => {
    clearManagedTrack();
    const video = videoRef.current;
    if (!video) return;

    const refresh = () => {
      const managedTrack = managedTrackRef.current?.track;
      const tracks = Array.from(video.textTracks)
        .map((track, index) => ({ track, index }))
        .filter(({ track }) => track !== managedTrack)
        .map(({ track, index }) => ({
          id: nativeTrackId(track, index),
          index,
          label: track.label || readableLanguage(track.language) || `Embedded ${index + 1}`,
          language: track.language || "und",
        }));
      setNativeTracks(tracks);
    };

    refresh();
    video.addEventListener("loadedmetadata", refresh);
    video.textTracks.addEventListener?.("addtrack", refresh);
    const delayedRefresh = window.setTimeout(refresh, 600);
    return () => {
      window.clearTimeout(delayedRefresh);
      video.removeEventListener("loadedmetadata", refresh);
      video.textTracks.removeEventListener?.("addtrack", refresh);
      clearManagedTrack();
    };
  }, [clearManagedTrack, sourceKey, videoRef]);

  useEffect(() => {
    if (!itemId) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) setOnlineLoading(true);
    });
    fetch(`/api/subtitles/${encodeURIComponent(itemId)}?limit=18`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Online subtitle search is unavailable.");
        return response.json() as Promise<{ items?: OnlineSubtitle[] }>;
      })
      .then((data) => setOnlineItems(Array.isArray(data.items) ? data.items.filter((item) => item.trackUrl) : []))
      .catch((reason) => {
        if ((reason as { name?: string })?.name !== "AbortError") setOnlineItems([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setOnlineLoading(false);
      });
    return () => controller.abort();
  }, [itemId]);

  useEffect(() => {
    const revision = ++applyRevisionRef.current;
    void applySelection(activeSelection, revision);
    return () => { applyRevisionRef.current += 1; };
  }, [activeSelection, applySelection, sourceKey]);

  function choose(next: SubtitleSelection) {
    if (!canChange) return;
    if (!isControlled) setInternalSelection(next);
    onSelectionChange?.(next);
  }

  async function addLocalFile(file: File | undefined) {
    if (!file || !canChange) return;
    if (file.size > (shared ? LOCAL_SUBTITLE_LIMIT : 2 * 1024 * 1024)) {
      setStatus(shared ? "For a shared room, keep the subtitle file below 320 KB." : "Subtitle file is too large.");
      return;
    }
    try {
      const text = decodeSubtitleBytes(new Uint8Array(await file.arrayBuffer()));
      const content = normalizeSubtitleToVtt(text, file.name);
      choose({ id: `local-${Date.now()}`, mode: "local", label: file.name.replace(/\.[^.]+$/, ""), language: guessLanguage(file.name), content });
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Local subtitle could not be read.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function addFromUrl() {
    if (!urlInput.trim() || !canChange || urlLoading) return;
    setUrlLoading(true);
    try {
      const rawUrl = new URL(urlInput.trim());
      const fetchUrl = /(^|\.)subzone\.ir$|(^|\.)sub-api\.ir$/i.test(rawUrl.hostname)
        ? `/api/subtitles/track?url=${encodeURIComponent(rawUrl.toString())}`
        : rawUrl.toString();
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error("That subtitle URL could not be downloaded. Check CORS or use a local file.");
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > (shared ? LOCAL_SUBTITLE_LIMIT : 2 * 1024 * 1024)) throw new Error("Subtitle file is too large.");
      const content = normalizeSubtitleToVtt(decodeSubtitleBytes(bytes), rawUrl.pathname.split("/").pop() || "subtitle.srt");
      choose({ id: `url-${Date.now()}`, mode: "local", label: rawUrl.pathname.split("/").pop()?.replace(/\.[^.]+$/, "") || "Online subtitle", language: guessLanguage(rawUrl.pathname), content });
      setUrlInput("");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Subtitle URL could not be loaded.");
    } finally {
      setUrlLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="subtitle-panel" role="dialog" aria-label="Subtitle controls">
      <header>
        <div><Captions size={18} /><span><strong>Subtitles</strong><small>{shared ? "Synced for everyone in this room" : `For ${title}`}</small></span></div>
        <button type="button" onClick={onClose} aria-label="Close subtitles"><X size={17} /></button>
      </header>

      <div className="subtitle-now"><Check size={14} /><span>{status}</span></div>

      <div className="subtitle-quick-actions">
        <button className={activeSelection.mode === "auto" ? "is-active" : ""} type="button" disabled={!canChange} onClick={() => choose(AUTO_SUBTITLE_SELECTION)}><RefreshCw size={14} /> Auto</button>
        <button className={activeSelection.mode === "off" ? "is-active" : ""} type="button" disabled={!canChange} onClick={() => choose(OFF_SUBTITLE_SELECTION)}><X size={14} /> Off</button>
        <button type="button" disabled={!canChange} onClick={() => fileInputRef.current?.click()}><FileUp size={14} /> Add local</button>
        <input ref={fileInputRef} type="file" hidden accept=".vtt,.srt,.ass,.ssa,.txt,text/vtt,application/x-subrip" onChange={(event) => void addLocalFile(event.target.files?.[0])} />
      </div>

      {nativeTracks.length > 0 && (
        <section className="subtitle-source-group">
          <div className="subtitle-group-title"><Subtitles size={14} /><span>Inside this video</span></div>
          <div className="subtitle-option-list">
            {nativeTracks.map((track) => (
              <button type="button" disabled={!canChange} className={activeSelection.mode === "embedded" && activeSelection.nativeTrackId === track.id ? "is-active" : ""} key={track.id} onClick={() => choose({ id: track.id, mode: "embedded", label: track.label, language: track.language, nativeTrackId: track.id })}>
                <span><strong>{track.label}</strong><small>{readableLanguage(track.language)} · embedded</small></span><Check size={14} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="subtitle-source-group">
        <div className="subtitle-group-title"><Search size={14} /><span>Online subtitles</span>{onlineLoading && <LoaderCircle className="spin" size={13} />}</div>
        <div className="subtitle-option-list subtitle-online-list">
          {sortedOnlineItems.length ? sortedOnlineItems.slice(0, 10).map((item) => {
            const next = onlineSelection(item);
            return <button type="button" disabled={!canChange} className={activeSelection.id === next.id ? "is-active" : ""} key={item.detailUrl} onClick={() => choose(next)}><span><strong>{item.language}</strong><small>{item.releases.slice(0, 2).join(" · ") || item.author || "Matched online"}</small></span>{item.rating === "good" ? <Check size={14} /> : <Captions size={14} />}</button>;
          }) : <p>{onlineLoading ? "Searching Persian and English sources…" : "No online subtitle matched this title."}</p>}
        </div>
      </section>

      <section className="subtitle-url-row">
        <label><Link2 size={14} /><input value={urlInput} disabled={!canChange || urlLoading} onChange={(event) => setUrlInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addFromUrl(); }} placeholder="Paste a direct .srt or .vtt URL" /></label>
        <button type="button" disabled={!canChange || !urlInput.trim() || urlLoading} onClick={() => void addFromUrl()}>{urlLoading ? <LoaderCircle className="spin" size={15} /> : "Add"}</button>
      </section>

      <footer>
        <label>Size<select value={size} onChange={(event) => setSize(event.target.value as typeof size)}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label>
        <div className="subtitle-offset"><Clock3 size={13} /><span>Sync</span><button type="button" onClick={() => setOffset((value) => Math.max(-10, Number((value - .5).toFixed(1))))}>−0.5s</button><button type="button" onClick={() => setOffset(0)}>{offset > 0 ? "+" : ""}{offset.toFixed(1)}s</button><button type="button" onClick={() => setOffset((value) => Math.min(10, Number((value + .5).toFixed(1))))}>+0.5s</button></div>
      </footer>
    </div>
  );
}

function onlineSelection(item: OnlineSubtitle): SubtitleSelection {
  return { id: item.detailUrl, mode: "online", label: `${item.language} subtitle`, language: item.language, url: item.trackUrl };
}

function subtitleScore(item: OnlineSubtitle, sourceLabel: string, sourceKey: string) {
  const language = /farsi|persian/i.test(item.language) ? 100 : /english/i.test(item.language) ? 50 : 0;
  const qualityText = `${sourceLabel} ${sourceKey}`.toLowerCase();
  const releaseMatch = item.releases.reduce((score, release) => score + release.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 3 && qualityText.includes(token)).length, 0);
  return language + releaseMatch * 4 + (item.rating === "good" ? 8 : 0);
}

function preferredNativeTrack(items: NativeSubtitle[]) {
  return [...items].sort((left, right) => nativeLanguageScore(right) - nativeLanguageScore(left))[0];
}

function nativeLanguageScore(item: NativeSubtitle) {
  const text = `${item.language} ${item.label}`;
  return /\b(fa|fas|per)\b|farsi|persian|فارسی/i.test(text) ? 100 : /\b(en|eng)\b|english/i.test(text) ? 50 : 10;
}

function nativeTrackId(track: TextTrack, index: number) {
  return `embedded-${index}-${track.language || "und"}-${track.label || "track"}`;
}

function disableAllTracks(video: HTMLVideoElement) {
  for (const track of Array.from(video.textTracks)) track.mode = "disabled";
}

function readableLanguage(value: string) {
  if (/^(fa|fas|per)$/i.test(value)) return "Persian";
  if (/^(en|eng)$/i.test(value)) return "English";
  return value || "Unknown language";
}

function normalizeLanguageCode(value: string) {
  return /farsi|persian|^(fa|fas|per)$/i.test(value) ? "fa" : /english|^(en|eng)$/i.test(value) ? "en" : "und";
}

function guessLanguage(value: string) {
  return /farsi|persian|\.fa\b/i.test(value) ? "Farsi/Persian" : /english|\.en\b/i.test(value) ? "English" : "Unknown";
}
