"use client";

import { Accessibility, Captions, Languages, Mic2, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { showAppMessage } from "@/lib/app-messages";
import type { PartyLiveCaption, PartyParticipant } from "@/lib/watch-party-types";

type RecognitionAlternative = { transcript: string };
type RecognitionResult = { readonly isFinal: boolean; readonly length: number; readonly [index: number]: RecognitionAlternative };
type RecognitionResultList = { readonly length: number; readonly [index: number]: RecognitionResult };
type RecognitionEvent = { readonly resultIndex: number; readonly results: RecognitionResultList };
type RecognitionErrorEvent = { readonly error: string; readonly message?: string };
type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

const LANGUAGES = [
  { value: "fa-IR", label: "فارسی" },
  { value: "en-US", label: "English" },
  { value: "ar-SA", label: "العربية" },
  { value: "de-DE", label: "Deutsch" },
  { value: "fr-FR", label: "Français" },
  { value: "es-ES", label: "Español" },
];

export function WatchPartyAccessibility({
  socket,
  roomId,
  participants,
  canCaption,
  onOpenMovieSubtitles,
}: {
  socket: Socket;
  roomId: string;
  participants: PartyParticipant[];
  canCaption: boolean;
  onOpenMovieSubtitles: () => void;
}) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const enabledRef = useRef(false);
  const segmentRef = useRef(0);
  const lastInterimEmitRef = useRef(0);
  const removeTimersRef = useRef(new Map<string, number>());
  const [panelOpen, setPanelOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [language, setLanguage] = useState("fa-IR");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [captions, setCaptions] = useState<PartyLiveCaption[]>([]);
  const [transcript, setTranscript] = useState<PartyLiveCaption[]>([]);
  const supported = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    const timers = removeTimersRef.current;
    const onCaption = (caption: PartyLiveCaption) => {
      setCaptions((current) => upsertCaption(current, caption).slice(-3));
      if (caption.final) setTranscript((current) => upsertCaption(current, caption).slice(-40));
      const previous = timers.get(caption.id);
      if (previous) window.clearTimeout(previous);
      timers.set(caption.id, window.setTimeout(() => {
        setCaptions((current) => current.filter((item) => item.id !== caption.id));
        timers.delete(caption.id);
      }, caption.final ? 8_000 : 4_000));
    };
    socket.on("accessibility:caption", onCaption);
    return () => {
      socket.off("accessibility:caption", onCaption);
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
    };
  }, [socket]);

  useEffect(() => {
    if (canCaption || !enabledRef.current) return;
    stopCaptioning();
    showAppMessage({ title: "Live captions paused", message: "The host changed who can publish microphone captions in this room.", tone: "warning" });
  }, [canCaption]);

  useEffect(() => () => {
    enabledRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  }, []);

  function emitCaption(segmentId: string, text: string, final: boolean, translation: string | null = null) {
    socket.emit("accessibility:caption", {
      roomId,
      segmentId,
      text,
      language,
      translation,
      targetLanguage: translation ? targetLanguage : null,
      final,
    });
  }

  async function translateCaption(segmentId: string, text: string) {
    if (!targetLanguage || targetLanguage === language) return;
    try {
      const response = await fetch("/api/accessibility/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, sourceLanguage: language, targetLanguage }),
      });
      const data = await response.json() as { translation?: string; error?: string };
      if (!response.ok || !data.translation) throw new Error(data.error || "Translation unavailable");
      emitCaption(segmentId, text, true, data.translation);
    } catch (reason) {
      showAppMessage({
        title: "Translation took a coffee break",
        message: reason instanceof Error ? reason.message : "The original live caption is still visible to everyone.",
        tone: "warning",
        duration: 4_000,
      });
    }
  }

  function startCaptioning() {
    if (!canCaption) {
      showAppMessage({ title: "Caption permission needed", message: "Ask the host to enable Share live captions for your seat.", tone: "warning" });
      return;
    }
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructor) {
      showAppMessage({ title: "Live captions are not supported here", message: "Open the room in Chrome or Edge. Movie subtitles and local subtitle files still work.", tone: "warning" });
      return;
    }

    recognitionRef.current?.abort();
    const recognition = new Constructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        const text = result[0]?.transcript?.replace(/\s+/g, " ").trim();
        if (!text) continue;
        const segmentId = `speech-${segmentRef.current}`;
        if (result.isFinal) {
          emitCaption(segmentId, text, true);
          void translateCaption(segmentId, text);
          segmentRef.current += 1;
          lastInterimEmitRef.current = 0;
        } else if (Date.now() - lastInterimEmitRef.current >= 280) {
          lastInterimEmitRef.current = Date.now();
          emitCaption(segmentId, text, false);
        }
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        enabledRef.current = false;
        setEnabled(false);
        showAppMessage({ title: "Microphone captions are blocked", message: "Allow microphone access for SarvNema, then turn live captions on again.", tone: "error" });
        return;
      }
      showAppMessage({ title: "Caption signal blinked", message: event.message || "We will reconnect the live caption listener automatically.", tone: "warning" });
    };
    recognition.onend = () => {
      if (!enabledRef.current) return;
      window.setTimeout(() => {
        if (!enabledRef.current || recognitionRef.current !== recognition) return;
        try { recognition.start(); } catch { /* The browser may already be restarting recognition. */ }
      }, 250);
    };
    recognitionRef.current = recognition;
    enabledRef.current = true;
    setEnabled(true);
    setPanelOpen(true);
    try {
      recognition.start();
      showAppMessage({ title: "Live captions are on", message: "Your speech now appears with your name for everyone in the room. Tiny disclaimer: AI ears can mishear drama.", tone: "success" });
    } catch {
      enabledRef.current = false;
      setEnabled(false);
    }
  }

  function stopCaptioning() {
    enabledRef.current = false;
    setEnabled(false);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  return (
    <>
      {captions.length > 0 && (
        <div className="party-live-caption-layer" aria-live="polite" aria-atomic="false">
          {captions.slice(-2).map((caption) => (
            <div className={`party-live-caption ${caption.final ? "is-final" : "is-interim"}`} key={caption.id}>
              <span className="party-live-caption-avatar">{caption.avatarUrl ? <img src={caption.avatarUrl} alt="" /> : caption.name.slice(0, 1)}</span>
              <div><strong>{caption.name}</strong><p>{caption.text}</p>{caption.translation && <em lang={caption.targetLanguage ?? undefined}>{caption.translation}</em>}</div>
            </div>
          ))}
        </div>
      )}

      <div className={`party-accessibility ${panelOpen ? "is-open" : ""}`}>
        <button className="party-accessibility-toggle" type="button" onClick={() => setPanelOpen((value) => !value)} aria-expanded={panelOpen} aria-label="Accessibility and live captions">
          <Accessibility size={18} />
          <span><strong>Accessibility</strong><small>{enabled ? "Live captions on" : "Captions & signs"}</small></span>
        </button>
        {panelOpen && (
          <section className="party-accessibility-panel" aria-label="Accessibility tools">
            <header><div><Accessibility size={18} /><span><strong>Accessible room</strong><small>Movie subtitles, speech captions, translation</small></span></div><button type="button" onClick={() => setPanelOpen(false)} aria-label="Close accessibility panel"><X size={15} /></button></header>
            <button className="party-accessibility-movie" type="button" onClick={onOpenMovieSubtitles}><Captions size={17} /><span><strong>Movie subtitles</strong><small>Auto, online, URL, or a local file</small></span></button>
            <div className="party-accessibility-live">
              <div><Mic2 size={17} /><span><strong>Caption my microphone</strong><small>Shared with your name · live draft</small></span></div>
              <button type="button" className={enabled ? "is-live" : ""} onClick={enabled ? stopCaptioning : startCaptioning} disabled={!canCaption}>{enabled ? <><Square size={12} /> Stop</> : "Start"}</button>
            </div>
            <div className="party-accessibility-languages">
              <label>Spoken<select value={language} disabled={enabled} onChange={(event) => setLanguage(event.target.value)}>{LANGUAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label><Languages size={13} /> Translate<select value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)}><option value="">Off</option>{LANGUAGES.filter((item) => item.value !== language).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            </div>
            {!supported && <p className="party-accessibility-note">Live microphone captions need Chrome or Edge. Movie and local subtitles work in this browser.</p>}
            <p className="party-accessibility-note">Automatic captions are a live draft. Important dialogue should be verified.</p>
            {transcript.length > 0 && <details className="party-caption-transcript"><summary>Live transcript · {transcript.length}</summary><div>{transcript.map((caption) => <p key={caption.id}><strong>{caption.name}</strong><span>{caption.translation || caption.text}</span></p>)}</div></details>}
            <div className="party-interpreter-help"><Accessibility size={16} /><p><strong>Sign interpreter</strong><span>A host can grant Interpreter permission, then that person turns on camera and pins their signed interpretation for the room.</span></p></div>
            <small className="party-accessibility-presence">{participants.filter((participant) => participant.connected).length} people can receive these captions instantly</small>
          </section>
        )}
      </div>
    </>
  );
}

function upsertCaption(current: PartyLiveCaption[], caption: PartyLiveCaption) {
  const index = current.findIndex((item) => item.id === caption.id);
  if (index < 0) return [...current, caption];
  const next = [...current];
  next[index] = caption;
  return next;
}
