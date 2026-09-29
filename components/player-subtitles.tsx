"use client";

import { AlertCircle, Captions, Check, Clock3, FileUp, Link2, LoaderCircle, Palette, RefreshCw } from "lucide-react";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import type { Locale } from "@/lib/i18n";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { cuesToVtt, decodeSubtitleBytes, normalizeSubtitleToVtt, parseSubtitleCues } from "@/lib/subtitle-format";
import { AUTO_SUBTITLE_SELECTION, OFF_SUBTITLE_SELECTION, type SubtitleSelection } from "@/lib/subtitle-types";
import { DEFAULT_SUBTITLE_APPEARANCE, normalizeSubtitleAppearance, shiftNativeCues, subtitleColor, subtitleOffset, type SubtitleAppearance } from "@/lib/subtitle-preferences";
import styles from "./player-subtitles.module.css";

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
  sourceSubtitleUrl?: string | null;
  open: boolean;
  onClose: () => void;
  selection?: SubtitleSelection;
  onSelectionChange?: (selection: SubtitleSelection) => void;
  canChange?: boolean;
  shared?: boolean;
  locale?: Locale;
};

const LOCAL_SUBTITLE_LIMIT = 320 * 1024;

export function PlayerSubtitles({
  videoRef,
  itemId,
  title,
  sourceKey,
  sourceLabel = "",
  sourceSubtitleUrl = null,
  open,
  onClose,
  selection,
  onSelectionChange,
  canChange = true,
  shared = false,
  locale = "fa",
}: Props) {
  const [internalSelection, setInternalSelection] = useState<SubtitleSelection>(AUTO_SUBTITLE_SELECTION);
  const activeSelection = selection ?? internalSelection;
  const [onlineItems, setOnlineItems] = useState<OnlineSubtitle[]>([]);
  const [nativeTracks, setNativeTracks] = useState<NativeSubtitle[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const fa = locale === "fa";
  const [status, setStatus] = useState("");
  const [trackState, setTrackState] = useState<"loading" | "ready" | "off" | "error" | "empty">("loading");
  const [applied, setApplied] = useState<SubtitleSelection | null>(null);
  const [tab, setTab] = useState<"tracks" | "sync" | "appearance">("tracks");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [searchRevision, setSearchRevision] = useState(0);
  const [searchFailed, setSearchFailed] = useState(false);
  const [personalSubtitle, setPersonalSubtitle] = useState<SubtitleSelection | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [offset, setOffset] = useState(0);
  const [appearance, setAppearance] = useState<SubtitleAppearance>(DEFAULT_SUBTITLE_APPEARANCE);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const styleId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const originalCuesRef = useRef(new Map<TextTrackCue, { start: number; end: number }>());
  const managedTrackRef = useRef<HTMLTrackElement | null>(null);
  const managedUrlRef = useRef<string | null>(null);
  const managedTrackTimerRef = useRef<number | null>(null);
  const contentCacheRef = useRef(new Map<string, string>());
  const applyRevisionRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isControlled = selection !== undefined;

  const sortedOnlineItems = useMemo(
    () => [...onlineItems].sort((left, right) => subtitleScore(right, sourceLabel, sourceKey) - subtitleScore(left, sourceLabel, sourceKey)),
    [onlineItems, sourceKey, sourceLabel],
  );
  const sourceSubtitle = useMemo<SubtitleSelection | null>(() => {
    if (!sourceSubtitleUrl) return null;
    const language = guessLanguage(sourceSubtitleUrl);
    return {
      id: `source-${sourceSubtitleUrl}`,
      mode: "online",
      label: fa ? "زیرنویس همراه این نسخه" : "Included subtitle",
      language,
      url: `/api/subtitles/track?url=${encodeURIComponent(sourceSubtitleUrl)}`,
    };
  }, [sourceSubtitleUrl, fa]);

  const clearManagedTrack = useCallback(() => {
    if (managedTrackTimerRef.current !== null) {
      window.clearTimeout(managedTrackTimerRef.current);
      managedTrackTimerRef.current = null;
    }
    managedTrackRef.current?.remove();
    managedTrackRef.current = null;
    if (managedUrlRef.current) URL.revokeObjectURL(managedUrlRef.current);
    managedUrlRef.current = null;
  }, []);

  const mountManagedTrack = useCallback((video: HTMLVideoElement, vtt: string, resolved: SubtitleSelection, revision: number) => {
    clearManagedTrack();
    disableAllTracks(video);
    const blobUrl = URL.createObjectURL(new Blob([vtt], { type: "text/vtt;charset=utf-8" }));
    const element = document.createElement("track");
    element.kind = "subtitles";
    element.label = resolved.label;
    element.srclang = normalizeLanguageCode(resolved.language);
    element.default = true;
    managedTrackRef.current = element;
    managedUrlRef.current = blobUrl;
    const show = () => {
      if (managedTrackRef.current !== element || revision !== applyRevisionRef.current) return;
      element.track.mode = "showing";
      if (element.readyState === 2) { setApplied(resolved); setTrackState("ready"); setStatus(resolved.label); }
    };
    element.addEventListener("load", show, { once: true });
    element.addEventListener("error", () => {
      if (managedTrackRef.current !== element || revision !== applyRevisionRef.current) return;
      setApplied(null); setTrackState("error"); setStatus(fa ? "این زیرنویس بارگذاری نشد؛ نسخهٔ دیگری را انتخاب کن." : "This subtitle could not load. Choose another version.");
    }, { once: true });
    element.src = blobUrl;
    video.appendChild(element);
    // Chromium can emit `addtrack` before the blob track has finished loading.
    // Keeping the same element as the managed track and re-applying its mode on
    // the next task prevents a native-track refresh from disabling local SRTs.
    show();
    managedTrackTimerRef.current = window.setTimeout(show, 80);
  }, [clearManagedTrack, fa]);

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
    setApplied(null);

    if (next.mode === "off") {
      clearManagedTrack();
      setTrackState("off"); setStatus(fa ? "زیرنویس خاموش است" : "Subtitles are off");
      return;
    }

    if (next.mode === "embedded" || next.mode === "auto") {
      const embedded = next.mode === "embedded"
        ? nativeTracks.find((track) => track.id === next.nativeTrackId) ?? nativeTracks[0]
        : preferredNativeTrack(nativeTracks);
      if (embedded) {
        clearManagedTrack();
        const track = video.textTracks[embedded.index];
        if (track) { track.mode = "showing"; shiftNativeCues(track, offset, originalCuesRef.current); }
        setApplied({ id: embedded.id, mode: "embedded", label: embedded.label, language: embedded.language, nativeTrackId: embedded.id });
        setTrackState("ready"); setStatus(embedded.label);
        return;
      }
      if (next.mode === "embedded") {
        setTrackState("empty"); setStatus(fa ? "زیرنویس داخل فایل در دسترس نیست؛ یک نسخهٔ آنلاین یا فایل شخصی انتخاب کن." : "Embedded subtitles are unavailable. Choose an online subtitle or a file.");
        return;
      }
    }

    const resolved = next.mode === "auto"
      ? sourceSubtitle ?? (sortedOnlineItems[0] ? onlineSelection(sortedOnlineItems[0], fa) : null)
      : next;
    if (!resolved) {
      clearManagedTrack();
      setTrackState(onlineLoading ? "loading" : "empty"); setStatus(onlineLoading ? (fa ? "در حال پیدا کردن زیرنویس…" : "Finding subtitles…") : (fa ? "هنوز زیرنویسی فعال نیست" : "No subtitle is active yet"));
      return;
    }

    try {
      setTrackState("loading"); setStatus(fa ? `در حال بارگذاری ${resolved.label}…` : `Loading ${resolved.label}…`);
      const raw = resolved.content ?? await fetchSubtitleText(resolved.url ?? "", resolved.id);
      if (revision !== applyRevisionRef.current) return;
      const cues = parseSubtitleCues(raw, `${resolved.label}.vtt`);
      if (!cues.length) throw new Error("This subtitle contains no readable cues.");
      mountManagedTrack(video, cuesToVtt(cues, offset), resolved, revision);
    } catch (reason) {
      if (revision !== applyRevisionRef.current) return;
      clearManagedTrack();
      setTrackState("error"); setStatus(fa ? "زیرنویس بارگذاری نشد؛ دوباره امتحان کن یا نسخهٔ دیگری انتخاب کن." : reason instanceof Error ? reason.message : "Subtitle could not be loaded.");
    }
  }, [clearManagedTrack, fetchSubtitleText, mountManagedTrack, nativeTracks, offset, onlineLoading, sortedOnlineItems, sourceSubtitle, videoRef, fa]);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      try { setAppearance(normalizeSubtitleAppearance(JSON.parse(localStorage.getItem("sarvnema-subtitle-appearance") ?? "null"))); } catch { /* Defaults also work in private browsing. */ }
      setPreferencesReady(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    try { localStorage.setItem("sarvnema-subtitle-appearance", JSON.stringify(appearance)); } catch { /* Storage is optional. */ }
  }, [appearance, preferencesReady]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.dataset.subtitleStyle = styleId;
    const sheet = document.createElement("style");
    document.head.appendChild(sheet);
    const update = () => {
      const fontSize = Math.max(12, Math.min(72, video.clientWidth * .032 * appearance.size / 100));
      // Real values, not CSS variables: native cue renderers differ in inheritance.
      sheet.textContent = `.pro-player video[data-subtitle-style="${styleId}"]::cue, .party-player-stage video[data-subtitle-style="${styleId}"]::cue { font-size: ${fontSize}px; color: ${subtitleColor(appearance.color, appearance.textOpacity)}; background-color: ${subtitleColor(appearance.background, appearance.backgroundOpacity)}; text-shadow: 0 1px 2px #0008; }`;
    };
    update();
    const observer = new ResizeObserver(update); observer.observe(video);
    return () => { observer.disconnect(); sheet.remove(); delete video.dataset.subtitleStyle; };
  }, [appearance, sourceKey, styleId, videoRef]);

  useEffect(() => {
    clearManagedTrack();
    const video = videoRef.current;
    if (!video) return;

    const refresh = () => {
      const managedTrack = managedTrackRef.current?.track;
      const tracks = Array.from(video.textTracks)
        .map((track, index) => ({ track, index }))
        .filter(({ track }) => track !== managedTrack && (track.kind === "subtitles" || track.kind === "captions"))
        .map(({ track, index }) => ({
          id: nativeTrackId(track, index),
          index,
          label: track.label || readableLanguage(track.language) || `Embedded ${index + 1}`,
          language: track.language || "und",
        }));
      setNativeTracks((current) => sameNativeTracks(current, tracks) ? current : tracks);
    };

    refresh();
    const originals = originalCuesRef.current;
    video.addEventListener("loadedmetadata", refresh);
    video.textTracks.addEventListener?.("addtrack", refresh);
    const delayedRefresh = window.setTimeout(refresh, 600);
    return () => {
      window.clearTimeout(delayedRefresh);
      video.removeEventListener("loadedmetadata", refresh);
      video.textTracks.removeEventListener?.("addtrack", refresh);
      clearManagedTrack();
      for (const [cue, original] of originals) { cue.endTime = Math.max(cue.endTime, original.end); cue.startTime = original.start; cue.endTime = original.end; }
      originals.clear();
    };
  }, [clearManagedTrack, sourceKey, videoRef]);

  useEffect(() => {
    if (!itemId) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) { setOnlineLoading(true); setSearchFailed(false); setOnlineItems([]); }
    });
    fetch(`/api/subtitles/${encodeURIComponent(itemId)}?limit=18`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Online subtitle search is unavailable.");
        return response.json() as Promise<{ items?: OnlineSubtitle[] }>;
      })
      .then((data) => { if (!controller.signal.aborted) setOnlineItems(Array.isArray(data.items) ? data.items.filter((item) => item.trackUrl) : []); })
      .catch((reason) => {
        if (!controller.signal.aborted && (reason as { name?: string })?.name !== "AbortError") { setOnlineItems([]); setSearchFailed(true); }
      })
      .finally(() => {
        if (!controller.signal.aborted) setOnlineLoading(false);
      });
    return () => controller.abort();
  }, [itemId, searchRevision]);

  useEffect(() => {
    const revision = ++applyRevisionRef.current;
    void applySelection(activeSelection, revision);
    return () => { applyRevisionRef.current += 1; };
  }, [activeSelection, applySelection, sourceKey]);

  function choose(next: SubtitleSelection) {
    if (!canChange) return;
    if (next.mode === "local") setPersonalSubtitle(next);
    if (!isControlled) setInternalSelection(next);
    onSelectionChange?.(next);
  }

  const lastEnabledSelection = useRef<SubtitleSelection>(AUTO_SUBTITLE_SELECTION);
  useEffect(() => {
    if (activeSelection.mode !== "off") lastEnabledSelection.current = activeSelection;
    const video = videoRef.current;
    const toggle = () => choose(activeSelection.mode === "off" ? lastEnabledSelection.current : OFF_SUBTITLE_SELECTION);
    video?.addEventListener("sarvnema:toggle-captions", toggle);
    return () => video?.removeEventListener("sarvnema:toggle-captions", toggle);
  });

  async function addLocalFile(file: File | undefined) {
    if (!file || !canChange) return;
    setImportError("");
    if (file.size > (shared ? LOCAL_SUBTITLE_LIMIT : 2 * 1024 * 1024)) {
      setImportError(fa ? `حجم فایل باید کمتر از ${shared ? "۳۲۰ کیلوبایت" : "۲ مگابایت"} باشد.` : shared ? "Keep shared subtitles below 320 KB." : "Keep subtitles below 2 MB.");
      return;
    }
    try {
      const text = decodeSubtitleBytes(new Uint8Array(await file.arrayBuffer()));
      const content = normalizeSubtitleToVtt(text, file.name);
      choose({ id: `local-${Date.now()}`, mode: "local", label: file.name.replace(/\.[^.]+$/, ""), language: guessLanguage(file.name), content });
    } catch (reason) {
      setImportError(fa ? "فایل خوانده نشد؛ یک زیرنویس SRT یا VTT معتبر انتخاب کن." : reason instanceof Error ? reason.message : "Local subtitle could not be read.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function addFromUrl() {
    if (!urlInput.trim() || !canChange || urlLoading) return;
    setUrlLoading(true);
    setImportError("");
    try {
      const rawUrl = new URL(urlInput.trim());
      if (!/^https?:$/.test(rawUrl.protocol)) throw new Error("Use an HTTP or HTTPS subtitle link.");
      const fetchUrl = /(^|\.)subzone\.ir$|(^|\.)sub-api\.ir$/i.test(rawUrl.hostname)
        ? `/api/subtitles/track?url=${encodeURIComponent(rawUrl.toString())}`
        : rawUrl.toString();
      const response = await fetch(fetchUrl, { signal: AbortSignal.timeout(16000) });
      if (!response.ok) throw new Error("That subtitle URL could not be downloaded. Check CORS or use a local file.");
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > (shared ? LOCAL_SUBTITLE_LIMIT : 2 * 1024 * 1024)) throw new Error("Subtitle file is too large.");
      const content = normalizeSubtitleToVtt(decodeSubtitleBytes(bytes), rawUrl.pathname.split("/").pop() || "subtitle.srt");
      choose({ id: `url-${Date.now()}`, mode: "local", label: rawUrl.pathname.split("/").pop()?.replace(/\.[^.]+$/, "") || "Online subtitle", language: guessLanguage(rawUrl.pathname), content });
      setUrlInput("");
    } catch (reason) {
      setImportError(fa ? "لینک باز نشد؛ آدرس مستقیم SRT یا VTT را وارد کن یا فایل را از دستگاهت انتخاب کن." : reason instanceof Error ? reason.message : "Subtitle URL could not be loaded.");
    } finally {
      setUrlLoading(false);
    }
  }

  if (!open) return null;

  const languageLabel = (value: string) => normalizeLanguageCode(value) === "fa" ? (fa ? "فارسی" : "Persian") : normalizeLanguageCode(value) === "en" ? (fa ? "انگلیسی" : "English") : value;
  const choices = [
    ...nativeTracks.map(track => ({ selection: { id: track.id, mode: "embedded", label: track.label, language: track.language, nativeTrackId: track.id } as SubtitleSelection, detail: fa ? "داخل فایل ویدیو" : "Inside the video" })),
    ...(sourceSubtitle ? [{ selection: sourceSubtitle, detail: fa ? "همراه همین نسخه" : "Included with this version" }] : []),
    ...(personalSubtitle ? [{ selection: personalSubtitle, detail: fa ? "فایل شخصی شما" : "Your subtitle file" }] : []),
    ...sortedOnlineItems.map(item => ({ selection: onlineSelection(item, fa), detail: item.releases.slice(0, 2).join(" · ") || item.author || (fa ? "زیرنویس آنلاین" : "Online subtitle") })),
  ];
  const visibleChoices = choices.filter(item => languageFilter === "all" || normalizeLanguageCode(item.selection.language) === languageFilter);
  const adjustAppearance = (next: Partial<SubtitleAppearance>) => setAppearance(current => normalizeSubtitleAppearance({ ...current, ...next }));
  return <ResponsiveDialog open={open} onClose={onClose} title={fa ? "زیرنویس" : "Subtitles"} description={title} closeLabel={fa ? "بستن زیرنویس" : "Close subtitles"} dir={fa ? "rtl" : "ltr"}>
    <div className={styles.panel} data-subtitle-panel>
      <div className={styles.current} data-state={trackState} role="status">
        {trackState === "ready" ? <Check size={20} /> : trackState === "loading" ? <LoaderCircle className="is-spinning" size={20} /> : trackState === "error" ? <AlertCircle size={20} /> : <Captions size={20} />}
        <div><small>{trackState === "ready" ? (fa ? "زیرنویس فعال" : "Active subtitle") : fa ? "وضعیت زیرنویس" : "Subtitle status"}</small><strong dir="auto">{status}</strong></div>
        <button type="button" role="switch" aria-checked={activeSelection.mode !== "off"} aria-label={fa ? "نمایش زیرنویس" : "Show subtitles"} disabled={!canChange} onClick={() => choose(activeSelection.mode === "off" ? lastEnabledSelection.current : OFF_SUBTITLE_SELECTION)}><i /></button>
      </div>
      <div className={styles.tabs} role="group" aria-label={fa ? "تنظیمات زیرنویس" : "Subtitle settings"}>
        {([{ id: "tracks", label: fa ? "زیرنویس‌ها" : "Subtitles", icon: Captions }, { id: "sync", label: fa ? "هماهنگی" : "Sync", icon: Clock3 }, { id: "appearance", label: fa ? "ظاهر" : "Style", icon: Palette }] as const).map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}><Icon size={17} />{label}</button>)}
      </div>
      {shared && <p className={styles.note}>{fa ? (canChange ? "انتخاب زیرنویس برای اتاق؛ ظاهر و زمان‌بندی فقط برای شما." : "زیرنویس را میزبان انتخاب می‌کند؛ ظاهر و زمان‌بندی را برای خودت تنظیم کن.") : (canChange ? "Subtitle selection is shared. Style and timing are personal." : "The host selects subtitles. Style and timing are yours to adjust.")}</p>}
      {tab === "tracks" && <section className={styles.section}>
        {importError && <p className={styles.warning} role="alert">{importError}</p>}
        <div className={styles.actions}>
          <button type="button" disabled={!canChange} aria-pressed={activeSelection.mode === "auto"} onClick={() => choose(AUTO_SUBTITLE_SELECTION)}><RefreshCw size={17} />{fa ? "انتخاب خودکار" : "Automatic"}</button>
          <button type="button" disabled={!canChange} onClick={() => fileInputRef.current?.click()}><FileUp size={17} />{fa ? "افزودن فایل" : "Add file"}</button>
          <input ref={fileInputRef} type="file" hidden accept=".vtt,.srt,.ass,.ssa,.txt,text/vtt,application/x-subrip" onChange={event => void addLocalFile(event.target.files?.[0])} />
        </div>
        <div className={styles.listHeading}><strong>{fa ? "زیرنویس‌های پیدا‌شده" : "Found subtitles"} <small>({choices.length.toLocaleString(locale)})</small></strong><button type="button" disabled={onlineLoading} aria-label={fa ? "جستجوی دوباره زیرنویس" : "Refresh subtitle search"} onClick={() => setSearchRevision(value => value + 1)}><RefreshCw size={17} className={onlineLoading ? "is-spinning" : ""} /></button></div>
        <div className={styles.filters} role="group" aria-label={fa ? "زبان زیرنویس" : "Subtitle language"}>{["all", "fa", "en"].map(value => <button type="button" key={value} aria-pressed={languageFilter === value} onClick={() => setLanguageFilter(value)}>{value === "all" ? (fa ? "همه" : "All") : languageLabel(value)}</button>)}</div>
        {onlineLoading && <p className={styles.note} role="status">{fa ? "جستجوی زیرنویس فارسی و انگلیسی…" : "Searching Persian and English subtitles…"}</p>}
        {searchFailed && <p className={styles.warning} role="status">{fa ? "جستجوی آنلاین در دسترس نیست. دوباره تلاش کن یا فایل اضافه کن." : "Online search is unavailable. Retry or add a file."}</p>}
        <div className={styles.options}>
          {visibleChoices.map(({ selection: next, detail }) => <button type="button" disabled={!canChange} key={next.id} aria-pressed={applied?.id === next.id} onClick={() => choose(next)}><Captions size={20} /><span><strong dir="auto">{next.mode === "local" ? next.label : languageLabel(next.language)}</strong><small dir="auto">{detail}</small></span>{applied?.id === next.id ? <Check size={18} /> : activeSelection.id === next.id && trackState === "loading" ? <LoaderCircle size={18} className="is-spinning" /> : null}</button>)}
        </div>
        {!visibleChoices.length && !onlineLoading && <p className={styles.note}>{fa ? "برای این انتخاب زیرنویسی پیدا نشد. فایل SRT یا VTT خودت را اضافه کن." : "No subtitles match this filter. You can add your own SRT or VTT file."}</p>}
        <details className={styles.customLink}><summary><Link2 size={16} />{fa ? "لینک زیرنویس داری؟" : "Have a subtitle link?"}</summary><div><input type="url" inputMode="url" autoComplete="off" value={urlInput} disabled={!canChange || urlLoading} onChange={event => setUrlInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void addFromUrl(); } }} dir="ltr" aria-label={fa ? "لینک زیرنویس" : "Subtitle URL"} placeholder="https://…/subtitle.srt" /><button type="button" disabled={!canChange || !urlInput.trim() || urlLoading} onClick={() => void addFromUrl()}>{urlLoading ? <LoaderCircle className="is-spinning" size={18} /> : fa ? "افزودن" : "Add"}</button></div></details>
      </section>}
      {tab === "sync" && <section className={styles.section}>
        <p className={styles.note}>{fa ? "متن جلوتر از صداست؟ «دیرتر» را بزن. اگر عقب افتاده، «زودتر» را بزن." : "Text appears before the dialogue? Tap Later. If it lags behind, tap Earlier."}</p>
        <div className={styles.sync}>
          <button type="button" onClick={() => setOffset(value => subtitleOffset(value - .5))}>{fa ? "زودتر" : "Earlier"}<small dir="ltr">−0.5s</small></button>
          <label>{fa ? "اختلاف زمانی (ثانیه)" : "Offset (seconds)"}<input aria-label={fa ? "اختلاف زمانی زیرنویس" : "Subtitle offset"} type="number" inputMode="decimal" step="0.1" min="-120" max="120" dir="ltr" value={offset} onChange={event => setOffset(subtitleOffset(Number(event.target.value)))} /></label>
          <button type="button" onClick={() => setOffset(value => subtitleOffset(value + .5))}>{fa ? "دیرتر" : "Later"}<small dir="ltr">+0.5s</small></button>
        </div>
        <p className={styles.note} role="status">{offset === 0 ? (fa ? "زمان اصلی زیرنویس" : "Original timing") : `${Math.abs(offset).toLocaleString(locale)} ${fa ? (offset > 0 ? "ثانیه دیرتر" : "ثانیه زودتر") : (offset > 0 ? "seconds later" : "seconds earlier")}`}</p>
        <button className={styles.reset} type="button" onClick={() => setOffset(0)}><RefreshCw size={16} />{fa ? "بازگشت به زمان اصلی" : "Reset timing"}</button>
      </section>}
      {tab === "appearance" && <section className={styles.section}>
        <div className={styles.preview} aria-label={fa ? "پیش‌نمایش زیرنویس" : "Subtitle preview"}><span style={{ fontSize: `${appearance.size * .2}px`, color: subtitleColor(appearance.color, appearance.textOpacity), backgroundColor: subtitleColor(appearance.background, appearance.backgroundOpacity) }}>{fa ? "یک داستان خوب، از اینجا شروع می‌شه." : "Every great story starts here."}</span></div>
        <label className={styles.slider}><span>{fa ? "اندازهٔ متن" : "Text size"}<output>{appearance.size}%</output></span><input aria-label={fa ? "اندازهٔ متن" : "Text size"} type="range" min="75" max="175" step="5" value={appearance.size} onChange={event => adjustAppearance({ size: Number(event.target.value) })} /></label>
        <div className={styles.colors}><label>{fa ? "رنگ متن" : "Text color"}<input type="color" value={appearance.color} onChange={event => adjustAppearance({ color: event.target.value })} /></label><label>{fa ? "رنگ پس‌زمینه" : "Background color"}<input type="color" value={appearance.background} onChange={event => adjustAppearance({ background: event.target.value })} /></label></div>
        <label className={styles.slider}><span>{fa ? "وضوح متن" : "Text opacity"}<output>{appearance.textOpacity}%</output></span><input aria-label={fa ? "وضوح متن" : "Text opacity"} type="range" min="20" max="100" step="5" value={appearance.textOpacity} onChange={event => adjustAppearance({ textOpacity: Number(event.target.value) })} /></label>
        <label className={styles.slider}><span>{fa ? "تیرگی پس‌زمینه" : "Background opacity"}<output>{appearance.backgroundOpacity}%</output></span><input aria-label={fa ? "تیرگی پس‌زمینه" : "Background opacity"} type="range" min="0" max="100" step="5" value={appearance.backgroundOpacity} onChange={event => adjustAppearance({ backgroundOpacity: Number(event.target.value) })} /></label>
        <button className={styles.reset} type="button" onClick={() => setAppearance(DEFAULT_SUBTITLE_APPEARANCE)}><RefreshCw size={16} />{fa ? "بازگشت به ظاهر پیش‌فرض" : "Reset appearance"}</button>
        <p className={styles.note}>{fa ? "ظاهر انتخابی روی این مرورگر ذخیره می‌شود. زیرنویس چسبیده به تصویر قابل تغییر نیست." : "Your style is saved in this browser. Burned-in subtitles cannot be changed."}</p>
      </section>}
    </div>
  </ResponsiveDialog>;
}

function onlineSelection(item: OnlineSubtitle, fa = false): SubtitleSelection {
  const language = normalizeLanguageCode(item.language);
  return { id: item.detailUrl, mode: "online", label: fa ? `زیرنویس ${language === "fa" ? "فارسی" : language === "en" ? "انگلیسی" : item.language}` : `${item.language} subtitle`, language: item.language, url: item.trackUrl };
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

function sameNativeTracks(left: NativeSubtitle[], right: NativeSubtitle[]) {
  return left.length === right.length && left.every((track, index) => {
    const next = right[index];
    return track.id === next?.id && track.index === next.index && track.label === next.label && track.language === next.language;
  });
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
