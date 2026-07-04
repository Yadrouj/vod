"use client";

// Timer engine + cues (beep / vibrate) + screen wake-lock for the workout player.

import { useCallback, useEffect, useRef, useState } from "react";

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export interface Countdown {
  remainingSec: number;
  remainingMs: number;
  running: boolean;
  /** Start a fresh countdown of `seconds`. */
  start: (seconds: number, onDone?: () => void) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  addTime: (seconds: number) => void;
}

/** A pausable, timestamp-based countdown (drift-free, survives tab throttling). */
export function useCountdown(): Countdown {
  const [remainingMs, setRemainingMs] = useState(0);
  const [running, setRunning] = useState(false);
  const endRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const onDoneRef = useRef<(() => void) | undefined>(undefined);

  const cancel = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const tick = useCallback(() => {
    const rem = Math.max(0, endRef.current - performance.now());
    setRemainingMs(rem);
    if (rem <= 0) {
      cancel();
      setRunning(false);
      const cb = onDoneRef.current;
      onDoneRef.current = undefined;
      cb?.();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(
    (seconds: number, onDone?: () => void) => {
      cancel();
      onDoneRef.current = onDone;
      endRef.current = performance.now() + seconds * 1000;
      setRemainingMs(seconds * 1000);
      setRunning(true);
      rafRef.current = requestAnimationFrame(tick);
    },
    [tick]
  );

  const pause = useCallback(() => {
    cancel();
    setRunning(false);
    setRemainingMs(Math.max(0, endRef.current - performance.now()));
  }, []);

  const resume = useCallback(() => {
    setRunning((wasRunning) => {
      if (wasRunning) return wasRunning;
      endRef.current = performance.now() + Math.max(0, remainingMs);
      rafRef.current = requestAnimationFrame(tick);
      return true;
    });
  }, [remainingMs, tick]);

  const stop = useCallback(() => {
    cancel();
    onDoneRef.current = undefined;
    setRunning(false);
    setRemainingMs(0);
  }, []);

  const addTime = useCallback((seconds: number) => {
    endRef.current += seconds * 1000;
    setRemainingMs(Math.max(0, endRef.current - performance.now()));
  }, []);

  useEffect(() => cancel, []);

  return {
    remainingSec: Math.ceil(remainingMs / 1000),
    remainingMs,
    running,
    start,
    pause,
    resume,
    stop,
    addTime,
  };
}

// ---- Cues ----

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    audioCtx = audioCtx || new AC();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Short beep(s). Call once from a user gesture first to unlock audio on mobile. */
export function beep(times = 1, freq = 880): void {
  const ac = ctx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});
  const now = ac.currentTime;
  for (let i = 0; i < times; i++) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = now + i * 0.18;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}

/** Keep the screen awake while `active` is true (best-effort; unsupported browsers no-op). */
export function useWakeLock(active: boolean): void {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function request() {
      try {
        if (active && "wakeLock" in navigator) {
          lockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {
        /* denied or unsupported */
      }
    }

    function onVisibility() {
      if (active && document.visibilityState === "visible" && !cancelled) {
        request();
      }
    }

    if (active) request();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      try {
        lockRef.current?.release();
        lockRef.current = null;
      } catch {
        /* ignore */
      }
    };
  }, [active]);
}
