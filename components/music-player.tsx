"use client";

import { Download, Heart, ListMusic, Pause, Play, Repeat2, Shuffle, SkipBack, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import type { MusicSource, MusicTrack } from "@/lib/music-types";

const PLAYBACK_KEY = "sarvnema-music-playback";
const LIKES_KEY = "sarvnema-music-likes";

type RepeatMode = "off" | "all" | "one";

export function MusicPlayer({
  track,
  queue = [],
  onTrackPlay,
  playRequest = 0,
}: {
  track: MusicTrack;
  queue?: MusicTrack[];
  onTrackPlay?: (track: MusicTrack) => void;
  /** Increment this from a parent click to begin playback without a DOM ref. */
  playRequest?: number;
}) {
  const media = useRef<HTMLAudioElement | HTMLVideoElement>(null);
  const autoplayTrackId = useRef<string | null>(null);
  const handledPlayRequest = useRef(0);
  const library = useMemo(() => uniqueTracks([track, ...queue]), [queue, track]);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTrack = library[activeIndex] ?? track;
  const streams = useMemo(() => uniqueSources(activeTrack.sources), [activeTrack.sources]);
  const [sourceIndex, setSourceIndex] = useState(() => preferredSourceIndex(streams, activeTrack.kind));
  const source = streams[sourceIndex] ?? null;
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [queueOpen, setQueueOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [sourceIssue, setSourceIssue] = useState("");
  const hasVideo = activeTrack.kind === "video" || /\.(?:mp4|mkv|webm)(?:$|\?)/i.test(source?.url ?? "");

  useEffect(() => {
    setActiveIndex(0);
    setSourceIndex(preferredSourceIndex(streams, track.kind));
  }, [track.id]);

  useEffect(() => {
    setSourceIndex(preferredSourceIndex(streams, activeTrack.kind));
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setPlaying(false);
  }, [activeTrack.id, activeTrack.kind, streams]);

  useEffect(() => {
    if (autoplayTrackId.current !== activeTrack.id) return;
    const player = media.current;
    if (!player) return;
    const start = () => {
      if (autoplayTrackId.current !== activeTrack.id) return;
      autoplayTrackId.current = null;
      void player.play().catch(() => setPlaying(false));
    };
    if (player.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) start();
    else player.addEventListener("canplay", start, { once: true });
    return () => player.removeEventListener("canplay", start);
  }, [activeTrack.id, source?.url]);

  useEffect(() => {
    if (!playRequest || playRequest === handledPlayRequest.current) return;
    handledPlayRequest.current = playRequest;
    autoplayTrackId.current = activeTrack.id;

    const player = media.current;
    if (!player) return;

    const start = () => {
      if (autoplayTrackId.current !== activeTrack.id) return;
      autoplayTrackId.current = null;
      void player.play().catch(() => setPlaying(false));
    };

    if (player.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      start();
    } else {
      player.addEventListener("canplay", start, { once: true });
    }

    return () => player.removeEventListener("canplay", start);
  }, [activeTrack.id, playRequest, source?.url]);

  useEffect(() => {
    const saved = window.localStorage.getItem(PLAYBACK_KEY);
    if (!saved || !media.current) return;
    try {
      const state = JSON.parse(saved) as { id?: string; time?: number; sourceUrl?: string };
      if (state.id === activeTrack.id && state.time && (!state.sourceUrl || state.sourceUrl === source?.url)) {
        media.current.currentTime = state.time;
        setCurrentTime(state.time);
      }
    } catch {
      // Old or malformed client state must never affect playback.
    }
  }, [activeTrack.id, source?.url]);

  useEffect(() => {
    try {
      const saved = new Set<string>(JSON.parse(window.localStorage.getItem(LIKES_KEY) ?? "[]"));
      setLiked(saved.has(activeTrack.id));
    } catch {
      setLiked(false);
    }
  }, [activeTrack.id]);

  useEffect(() => {
    const player = media.current;
    if (!player) return;
    player.volume = volume;
    player.muted = muted;
    player.playbackRate = rate;
  }, [activeTrack.id, muted, rate, source?.url, volume]);

  useEffect(() => {
    const player = media.current;
    if (!player || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: activeTrack.persianTitle || activeTrack.title,
      artist: activeTrack.artists.map((artist) => artist.name).join(" · "),
      album: activeTrack.category || "SarvNema Music",
      artwork: activeTrack.coverUrl ? [{ src: activeTrack.coverUrl, sizes: "512x512", type: "image/jpeg" }] : [],
    });
    navigator.mediaSession.setActionHandler("play", () => void player.play());
    navigator.mediaSession.setActionHandler("pause", () => player.pause());
    navigator.mediaSession.setActionHandler("seekbackward", () => seek(Math.max(0, player.currentTime - 10)));
    navigator.mediaSession.setActionHandler("seekforward", () => seek(Math.min(player.duration || 0, player.currentTime + 10)));
    navigator.mediaSession.setActionHandler("previoustrack", previous);
      navigator.mediaSession.setActionHandler("nexttrack", () => next());
    return () => {
      for (const action of ["play", "pause", "seekbackward", "seekforward", "previoustrack", "nexttrack"] as MediaSessionAction[]) {
        navigator.mediaSession.setActionHandler(action, null);
      }
    };
  // Media Session needs the latest commands, not an extra player abstraction.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrack.id, source?.url]);

  if (!source) return <div className="music-player music-player-unavailable">No playable source is available for this release yet.</div>;

  function syncProgress() {
    const player = media.current;
    if (!player) return;
    const nextDuration = Number.isFinite(player.duration) ? player.duration : 0;
    const nextBuffered = player.buffered.length ? player.buffered.end(player.buffered.length - 1) : 0;
    setCurrentTime(player.currentTime || 0);
    setDuration(nextDuration);
    setBuffered(nextBuffered);
    window.localStorage.setItem(PLAYBACK_KEY, JSON.stringify({ id: activeTrack.id, time: player.currentTime, sourceUrl: source.url, updatedAt: Date.now() }));
  }

  async function togglePlayback() {
    const player = media.current;
    if (!player) return;
    if (player.paused) {
      try { await player.play(); } catch { setPlaying(false); }
    } else player.pause();
  }

  function handlePlay() {
    setPlaying(true);
    onTrackPlay?.(activeTrack);
  }

  function seek(value: number) {
    const player = media.current;
    if (!player || !Number.isFinite(player.duration)) return;
    player.currentTime = value;
    setCurrentTime(value);
    syncProgress();
  }

  function chooseTrack(index: number, autoplay = playing) {
    const nextIndex = Math.max(0, Math.min(library.length - 1, index));
    if (nextIndex === activeIndex) {
      if (autoplay) {
        autoplayTrackId.current = activeTrack.id;
        const player = media.current;
        if (player?.readyState && player.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
          autoplayTrackId.current = null;
          void player.play().catch(() => setPlaying(false));
        }
      }
      return;
    }
    autoplayTrackId.current = autoplay ? library[nextIndex]?.id ?? null : null;
    setActiveIndex(nextIndex);
    setQueueOpen(false);
  }

  function previous() {
    if ((media.current?.currentTime ?? 0) > 4) return seek(0);
    chooseTrack(activeIndex > 0 ? activeIndex - 1 : repeat === "all" ? library.length - 1 : 0);
  }

  function next(autoplay = playing) {
    if (shuffle && library.length > 1) {
      const candidates = library.map((_, index) => index).filter((index) => index !== activeIndex);
      chooseTrack(candidates[Math.floor(Math.random() * candidates.length)] ?? activeIndex, autoplay);
      return;
    }
    if (activeIndex < library.length - 1) chooseTrack(activeIndex + 1, autoplay);
    else if (repeat === "all") chooseTrack(0, autoplay);
    else setPlaying(false);
  }

  function onEnded() {
    if (repeat === "one" && media.current) {
      media.current.currentTime = 0;
      void media.current.play().catch(() => undefined);
      return;
    }
    next(true);
  }

  function handleMediaError() {
    const nextIndex = nextSourceIndex(streams, sourceIndex);
    if (nextIndex >= 0) {
      setSourceIssue("This quality is unavailable. Trying another source…");
      setSourceIndex(nextIndex);
      window.setTimeout(() => void media.current?.play().catch(() => undefined), 80);
      return;
    }
    setSourceIssue("This source cannot be played in this browser. Use Download to open the original file.");
    setPlaying(false);
  }

  function toggleLiked() {
    try {
      const saved = new Set<string>(JSON.parse(window.localStorage.getItem(LIKES_KEY) ?? "[]"));
      if (saved.has(activeTrack.id)) saved.delete(activeTrack.id); else saved.add(activeTrack.id);
      window.localStorage.setItem(LIKES_KEY, JSON.stringify([...saved]));
      setLiked(saved.has(activeTrack.id));
    } catch {
      setLiked((value) => !value);
    }
  }

  return (
    <section className={`music-player music-player-pro ${hasVideo ? "music-player-video" : "music-player-audio"}`} dir="auto">
      {hasVideo ? (
        <div className="music-player-video-stage">
          <video ref={media as RefObject<HTMLVideoElement>} className="music-player-video-frame" poster={activeTrack.coverUrl ?? undefined} preload="metadata" playsInline src={source.url} onTimeUpdate={syncProgress} onProgress={syncProgress} onLoadedMetadata={syncProgress} onCanPlay={() => setSourceIssue("")} onPlay={handlePlay} onPause={() => setPlaying(false)} onEnded={onEnded} onError={handleMediaError} />
          <button className={`music-video-play-overlay ${playing ? "is-playing" : ""}`} type="button" onClick={togglePlayback} aria-label={playing ? "Pause video" : "Play video"}>{playing ? <Pause size={23} fill="currentColor" /> : <Play size={25} fill="currentColor" />}</button>
          <span className="music-video-quality">{source.quality || "Video"}</span>
        </div>
      ) : (
        <audio ref={media as RefObject<HTMLAudioElement>} preload="metadata" src={source.url} onTimeUpdate={syncProgress} onProgress={syncProgress} onLoadedMetadata={syncProgress} onCanPlay={() => setSourceIssue("")} onPlay={handlePlay} onPause={() => setPlaying(false)} onEnded={onEnded} onError={handleMediaError} />
      )}

      <div className="music-player-shell">
        <div className={`music-player-art ${playing ? "is-spinning" : ""}`} style={activeTrack.coverUrl ? { backgroundImage: `url(${activeTrack.coverUrl})` } : undefined} />
        <div className="music-player-now" dir="auto"><span>{activeTrack.kind === "video" ? "Music video" : "Now playing"}</span><strong>{activeTrack.persianTitle || activeTrack.title}</strong><small>{activeTrack.artists.map((artist) => artist.name).join(" · ")}</small></div>
        <button className={`music-icon-button ${liked ? "is-active" : ""}`} type="button" onClick={toggleLiked} aria-label={liked ? "Remove from liked songs" : "Add to liked songs"}><Heart size={18} fill={liked ? "currentColor" : "none"} /></button>
        <a className="music-download" href={activeTrack.sources.find((item) => item.kind === "download")?.url ?? source.url} target="_blank" rel="noreferrer"><Download size={16} /> Download</a>
      </div>

      {sourceIssue && <p className="music-player-source-issue" role="status">{sourceIssue}</p>}

      <div className="music-player-transport">
        <button className={`music-icon-button ${shuffle ? "is-active" : ""}`} type="button" onClick={() => setShuffle((value) => !value)} aria-label="Shuffle"><Shuffle size={17} /></button>
        <button className="music-icon-button" type="button" onClick={previous} aria-label="Previous"><SkipBack size={20} fill="currentColor" /></button>
        <button className="music-play-toggle" type="button" onClick={togglePlayback} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
        <button className="music-icon-button" type="button" onClick={() => next()} aria-label="Next"><SkipForward size={20} fill="currentColor" /></button>
        <button className={`music-icon-button ${repeat !== "off" ? "is-active" : ""}`} type="button" onClick={() => setRepeat((value) => value === "off" ? "all" : value === "all" ? "one" : "off")} aria-label={`Repeat ${repeat}`}><Repeat2 size={17} />{repeat === "one" && <small>1</small>}</button>
      </div>

      <div className="music-player-controls">
        <span>{formatTime(currentTime)}</span>
        <div className="music-progress-wrap" style={{ "--music-progress": `${percent(currentTime, duration)}%` } as CSSProperties}><span className="music-progress-buffer" style={{ width: `${percent(buffered, duration)}%` }} /><input aria-label="Seek" type="range" min="0" max={duration || 0} value={Math.min(currentTime, duration || 0)} step="0.1" onChange={(event) => seek(Number(event.target.value))} /></div>
        <span>{formatTime(duration)}</span>
        <label className="music-source"><select aria-label={hasVideo ? "Video quality" : "Audio quality"} value={source.url} onChange={(event) => { setSourceIssue(""); setSourceIndex(Math.max(0, streams.findIndex((item) => item.url === event.target.value))); }}>{streams.map((item) => <option value={item.url} key={item.url}>{item.quality || item.label}</option>)}</select></label>
        <label className="music-volume"><button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button><input aria-label="Volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label>
        <label className="music-rate"><select aria-label="Playback speed" value={rate} onChange={(event) => setRate(Number(event.target.value))}>{[0.75, 1, 1.25, 1.5, 2].map((value) => <option key={value} value={value}>{value}×</option>)}</select></label>
        <button className={`music-icon-button ${queueOpen ? "is-active" : ""}`} type="button" onClick={() => setQueueOpen((value) => !value)} aria-label="Listening queue"><ListMusic size={18} /></button>
      </div>

      {queueOpen && <aside className="music-player-queue" aria-label="Listening queue"><header><span><ListMusic size={16} /><strong>Queue</strong><small>{library.length} tracks</small></span><button className="music-icon-button" type="button" onClick={() => setQueueOpen(false)} aria-label="Close queue"><X size={16} /></button></header><ol>{library.map((item, index) => <li className={index === activeIndex ? "is-active" : ""} key={item.id}><button type="button" onClick={() => chooseTrack(index, true)}>{item.coverUrl ? <img src={item.coverUrl} alt="" /> : <span />}{index === activeIndex && playing ? <i className="music-equalizer"><b /><b /><b /></i> : <em>{String(index + 1).padStart(2, "0")}</em>}<span><strong>{item.persianTitle || item.title}</strong><small>{item.artists.map((artist) => artist.name).join(" · ")}</small></span></button></li>)}</ol></aside>}
    </section>
  );
}

function uniqueSources(sources: MusicSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => source.url && !seen.has(source.url) && Boolean(seen.add(source.url)));
}

function preferredSourceIndex(sources: MusicSource[], kind: MusicTrack["kind"]) {
  if (!sources.length) return 0;
  if (kind !== "video") return Math.max(0, sources.findIndex((source) => source.kind === "stream" && source.available !== false));
  const rank = (source: MusicSource) => {
    const value = Number(source.quality?.match(/\d+/)?.[0] ?? source.url.match(/(?:^|[^\d])(1080|720|480|360)p/i)?.[1] ?? 0);
    if (source.available === false) return -1;
    if (value === 720) return 1000;
    if (value === 1080) return 900;
    if (value === 480) return 800;
    return source.kind === "stream" ? 700 : 600;
  };
  let winner = 0;
  for (let index = 1; index < sources.length; index += 1) if (rank(sources[index]) > rank(sources[winner])) winner = index;
  return winner;
}

function nextSourceIndex(sources: MusicSource[], currentIndex: number) {
  for (let offset = 1; offset < sources.length; offset += 1) {
    const index = (currentIndex + offset) % sources.length;
    if (sources[index].available !== false) return index;
  }
  return -1;
}

function uniqueTracks(tracks: MusicTrack[]) {
  const seen = new Set<string>();
  return tracks.filter((track) => !seen.has(track.id) && Boolean(seen.add(track.id)));
}

function percent(value: number, total: number) { return total > 0 ? Math.min(100, Math.max(0, value / total * 100)) : 0; }
function formatTime(value: number) { if (!Number.isFinite(value)) return "0:00"; const minutes = Math.floor(value / 60); const seconds = Math.floor(value % 60).toString().padStart(2, "0"); return `${minutes}:${seconds}`; }
