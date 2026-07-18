"use client";

import { Check, Copy, Link2, Radio, Search, Share2, UsersRound, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Socket } from "socket.io-client";
import { sizedImageUrl } from "@/lib/image-url";
import type { Locale } from "@/lib/i18n";
import { newPartyProfile, readPartyProfile, savePartyProfile } from "@/lib/watch-party-profile";
import type { PartyMedia, PartyProfile } from "@/lib/watch-party-types";
import { WatchTogetherMark } from "@/components/watch-together-mark";

export type WatchTogetherPreset = {
  itemId: string;
  title: string;
  posterUrl?: string | null;
};

type Suggestion = {
  title: string;
  imdbCode: string;
  year: number | null;
  type: string;
  posterUrl: string | null;
  imdbRating: number | null;
};

type CreateRoomResult = {
  ok: boolean;
  roomId?: string;
  inviteToken?: string;
  error?: string;
};

type Placement = "floating" | "inline" | "player";

const copyByLocale = {
  en: {
    button: "Watch together",
    buttonHint: "Create a room",
    eyebrow: "WATCH TOGETHER",
    title: "Start a synchronized watch room",
    description: "Pick a title, create a private link, and watch every second together with chat and live reactions.",
    searchLabel: "Choose a movie or series",
    searchPlaceholder: "Search by English title or IMDb ID…",
    selected: "Selected for the room",
    change: "Change title",
    profile: "Room profile",
    editProfile: "Edit",
    namePlaceholder: "Your display name",
    avatarPlaceholder: "Avatar URL (optional)",
    sync: "Second-perfect sync",
    host: "Host controls",
    social: "Chat & reactions",
    create: "Create room & invite",
    creating: "Creating secure room…",
    cancel: "Cancel",
    ready: "Your room is ready",
    readyText: "Share this private link, then enter the room. Anyone with the link can join.",
    copyLink: "Copy invite link",
    copied: "Link copied",
    share: "Share room",
    enter: "Enter room",
    chooseError: "Choose a movie or series first.",
    profileError: "Enter a display name to create the room.",
    mediaError: "This title does not have a playable source right now.",
    createError: "The room could not be created. Please try again.",
    titleStep: "Title",
    profileStep: "Profile",
    inviteStep: "Invite",
  },
  fa: {
    button: "تماشای همزمان",
    buttonHint: "ساخت اتاق",
    eyebrow: "WATCH TOGETHER",
    title: "یک اتاق تماشای همزمان بساز",
    description: "فیلم را انتخاب کن، لینک خصوصی بساز و همراه دوستانت با چت و ری‌اکشن دقیقاً همزمان تماشا کن.",
    searchLabel: "انتخاب فیلم یا سریال",
    searchPlaceholder: "نام انگلیسی فیلم، سریال یا IMDb ID…",
    selected: "انتخاب‌شده برای اتاق",
    change: "تغییر عنوان",
    profile: "پروفایل اتاق",
    editProfile: "ویرایش",
    namePlaceholder: "نام نمایشی شما",
    avatarPlaceholder: "لینک آواتار (اختیاری)",
    sync: "همگام تا ثانیه",
    host: "کنترل میزبان",
    social: "چت و ری‌اکشن",
    create: "ساخت اتاق و دعوت",
    creating: "در حال ساخت اتاق امن…",
    cancel: "انصراف",
    ready: "اتاق شما آماده است",
    readyText: "لینک خصوصی را برای دوستانت بفرست و سپس وارد اتاق شو. هرکس لینک را داشته باشد می‌تواند وارد شود.",
    copyLink: "کپی لینک دعوت",
    copied: "لینک کپی شد",
    share: "اشتراک‌گذاری اتاق",
    enter: "ورود به اتاق",
    chooseError: "اول یک فیلم یا سریال انتخاب کن.",
    profileError: "برای ساخت اتاق یک نام نمایشی وارد کن.",
    mediaError: "در حال حاضر لینک قابل پخشی برای این عنوان پیدا نشد.",
    createError: "ساخت اتاق انجام نشد؛ دوباره تلاش کن.",
    titleStep: "انتخاب فیلم",
    profileStep: "پروفایل",
    inviteStep: "دعوت",
  },
} as const;

export function WatchTogetherLauncher({
  locale,
  placement = "floating",
  preset,
  media,
  label,
}: {
  locale: Locale;
  placement?: Placement;
  preset?: WatchTogetherPreset;
  media?: PartyMedia;
  label?: string;
}) {
  const pathname = usePathname();
  const socketRef = useRef<Socket | null>(null);
  const builderRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [resolvedMedia, setResolvedMedia] = useState<PartyMedia | null>(null);
  const [savedProfile, setSavedProfile] = useState<PartyProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const text = copyByLocale[locale === "fa" ? "fa" : "en"];

  useEffect(() => () => {
    socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLauncher();
    };
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("watch-builder-is-open");
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.classList.remove("watch-builder-is-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    const normalized = query.trim();
    if (!open || selected || normalized.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(normalized)}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((data: { items?: Suggestion[] }) => {
          setResults((data.items ?? []).slice(0, 6));
          setSearching(false);
        })
        .catch((reason: unknown) => {
          if ((reason as { name?: string })?.name !== "AbortError") {
            setResults([]);
            setSearching(false);
          }
        });
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query, selected]);

  if (placement === "floating" && (pathname === "/" || pathname.startsWith("/watch/"))) return null;
  if (placement === "floating" && pathname.startsWith("/watch-together/")) return null;

  function openLauncher() {
    const profile = readPartyProfile();
    const initial = media
      ? suggestionFromPreset({ itemId: media.itemId, title: media.title, posterUrl: media.posterUrl })
      : preset
        ? suggestionFromPreset(preset)
        : null;
    setSavedProfile(profile);
    setEditingProfile(!profile);
    setName(profile?.name ?? "");
    setAvatarUrl(profile?.avatarUrl ?? "");
    setSelected(initial);
    setResolvedMedia(media ?? null);
    setQuery("");
    setResults([]);
    setSearching(false);
    setError("");
    setInviteUrl("");
    setCopied(false);
    setOpen(true);
  }

  function closeLauncher() {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setOpen(false);
  }

  function selectTitle(item: Suggestion) {
    setSelected(item);
    setResolvedMedia(null);
    setQuery("");
    setResults([]);
    setSearching(false);
    setError("");
  }

  function clearTitle() {
    setSelected(null);
    setResolvedMedia(null);
    setQuery("");
    setResults([]);
    setError("");
  }

  async function createRoom() {
    if (!selected) {
      setError(text.chooseError);
      return;
    }
    if ((!savedProfile || editingProfile) && !name.trim()) {
      setError(text.profileError);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const identity = savedProfile && !editingProfile
        ? savedProfile
        : newPartyProfile(name, avatarUrl || null);
      savePartyProfile(identity);
      setSavedProfile(identity);

      let roomMedia = resolvedMedia;
      if (!roomMedia || roomMedia.itemId !== selected.imdbCode) {
        const response = await fetch(`/api/watch-party/title/${encodeURIComponent(selected.imdbCode)}`);
        if (!response.ok) throw new Error(text.mediaError);
        roomMedia = await response.json() as PartyMedia;
        setResolvedMedia(roomMedia);
      }

      const { io } = await import("socket.io-client");
      socketRef.current?.disconnect();
      const socket = io({ transports: ["websocket", "polling"], timeout: 12_000 });
      socketRef.current = socket;
      const result = await emitCreateRoom(socket, { profile: identity, media: roomMedia });
      if (!result.ok || !result.roomId || !result.inviteToken) {
        throw new Error(result.error ?? text.createError);
      }

      const roomUrl = `${window.location.origin}/watch-together/${result.roomId}?invite=${encodeURIComponent(result.inviteToken)}`;
      setInviteUrl(roomUrl);
      setCopied(false);
      window.requestAnimationFrame(() => builderRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
    } catch (reason) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setError(reason instanceof Error ? reason.message : text.createError);
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setError(text.createError);
    }
  }

  async function shareInvite() {
    if (!inviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: selected?.title ?? text.button, text: text.readyText, url: inviteUrl });
        return;
      } catch (reason) {
        if ((reason as { name?: string })?.name === "AbortError") return;
      }
    }
    await copyInvite();
  }

  const buttonText = label ?? text.button;
  const builderStep = inviteUrl ? 3 : selected ? 2 : 1;

  return (
    <>
      <button
        className={`watch-together-launcher watch-together-${placement}`}
        type="button"
        onClick={openLauncher}
        aria-haspopup="dialog"
      >
        <span className="watch-together-launcher-icon" aria-hidden="true">
          <WatchTogetherMark />
        </span>
        <span className="watch-together-launcher-copy">
          <strong>{buttonText}</strong>
          {placement === "floating" && <small>{text.buttonHint}</small>}
        </span>
      </button>

      {open && typeof document !== "undefined" && createPortal((
        <div className="watch-builder-backdrop" onClick={closeLauncher}>
          <section
            ref={builderRef}
            className={`watch-builder watch-builder-step-${builderStep}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="watch-builder-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="watch-builder-header">
              <div className="watch-builder-mark"><WatchTogetherMark /></div>
              <div>
                <span className="label">{text.eyebrow}</span>
                <h2 id="watch-builder-title">{inviteUrl ? text.ready : text.title}</h2>
              </div>
              <button className="watch-builder-close" type="button" onClick={closeLauncher} aria-label={text.cancel}>
                <X size={19} />
              </button>
            </header>

            <div className="watch-builder-progress" aria-label="Room setup progress">
              {[
                { step: 1, label: text.titleStep },
                { step: 2, label: text.profileStep },
                { step: 3, label: text.inviteStep },
              ].map((item) => (
                <span
                  className={item.step <= builderStep ? "is-active" : ""}
                  aria-current={item.step === builderStep ? "step" : undefined}
                  key={item.step}
                >
                  <i>{item.step < builderStep ? <Check size={10} /> : item.step}</i>
                  <small>{item.label}</small>
                </span>
              ))}
            </div>

            {inviteUrl ? (
              <div className="watch-builder-success">
                <div className="watch-builder-success-icon"><Check size={28} /></div>
                <p>{text.readyText}</p>
                <div className="watch-builder-link">
                  <Link2 size={17} />
                  <input value={inviteUrl} readOnly aria-label={text.copyLink} />
                </div>
                <div className="watch-builder-actions watch-builder-success-actions">
                  <button type="button" className="play-glow" onClick={() => window.location.assign(inviteUrl)}>
                    <WatchTogetherMark /> {text.enter}
                  </button>
                  <button type="button" className="watch-share-button" onClick={shareInvite}>
                    <Share2 size={17} /> {text.share}
                  </button>
                  <button type="button" className="watch-copy-button" onClick={copyInvite}>
                    {copied ? <Check size={17} /> : <Copy size={17} />} {copied ? text.copied : text.copyLink}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="watch-builder-intro">{text.description}</p>
                <div className="watch-builder-feature-list" aria-label="Room features">
                  <span><i />{text.sync}</span>
                  <span><i />{text.host}</span>
                  <span><i />{text.social}</span>
                </div>

                <div className="watch-builder-section">
                  <div className="watch-builder-section-title">
                    <span>{selected ? text.selected : text.searchLabel}</span>
                    {selected && <button type="button" onClick={clearTitle}>{text.change}</button>}
                  </div>
                  {selected ? (
                    <div className="watch-builder-selected">
                      {selected.posterUrl ? (
                        <img src={sizedImageUrl(selected.posterUrl, 180) ?? selected.posterUrl} alt="" />
                      ) : (
                        <span className="watch-builder-poster-fallback"><Radio size={21} /></span>
                      )}
                      <div>
                        <strong>{selected.title}</strong>
                        <small>{[selected.year, selected.type, selected.imdbRating ? `IMDb ${selected.imdbRating}` : null].filter(Boolean).join(" · ")}</small>
                      </div>
                      <Check size={18} />
                    </div>
                  ) : (
                    <div className="watch-builder-search">
                      <Search size={18} />
                      <input
                        value={query}
                        onChange={(event) => {
                          const value = event.target.value;
                          setQuery(value);
                          setSearching(value.trim().length >= 2);
                          setResults([]);
                          setError("");
                        }}
                        placeholder={text.searchPlaceholder}
                        autoFocus
                        autoComplete="off"
                      />
                      {searching && <span className="watch-builder-searching" />}
                      {results.length > 0 && (
                        <div className="watch-builder-results">
                          {results.map((item) => (
                            <button type="button" key={item.imdbCode} onClick={() => selectTitle(item)}>
                              {item.posterUrl ? <img src={sizedImageUrl(item.posterUrl, 100) ?? item.posterUrl} alt="" /> : <span />}
                              <span>
                                <strong>{item.title}</strong>
                                <small>{[item.year, item.type, item.imdbRating ? `IMDb ${item.imdbRating}` : null].filter(Boolean).join(" · ")}</small>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="watch-builder-section">
                  <div className="watch-builder-section-title">
                    <span>{text.profile}</span>
                    {savedProfile && !editingProfile && <button type="button" onClick={() => setEditingProfile(true)}>{text.editProfile}</button>}
                  </div>
                  {savedProfile && !editingProfile ? (
                    <div className="watch-builder-profile">
                      {savedProfile.avatarUrl ? <img src={savedProfile.avatarUrl} alt="" /> : <span>{savedProfile.name.slice(0, 1)}</span>}
                      <strong>{savedProfile.name}</strong>
                      <Check size={17} />
                    </div>
                  ) : (
                    <div className="watch-builder-profile-fields">
                      <input className="search" value={name} onChange={(event) => setName(event.target.value)} placeholder={text.namePlaceholder} />
                      <input className="search" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder={text.avatarPlaceholder} />
                    </div>
                  )}
                </div>

                {error && <p className="watch-builder-error">{error}</p>}
                <div className="watch-builder-actions">
                  <button type="button" className="play-glow" disabled={busy || !selected} onClick={createRoom}>
                    <UsersRound size={18} /> {busy ? text.creating : text.create}
                  </button>
                  <button type="button" className="hover-button" onClick={closeLauncher}>{text.cancel}</button>
                </div>
              </>
            )}
          </section>
        </div>
      ), document.body)}
    </>
  );
}

function suggestionFromPreset(preset: WatchTogetherPreset): Suggestion {
  return {
    title: preset.title,
    imdbCode: preset.itemId,
    year: null,
    type: "",
    posterUrl: preset.posterUrl ?? null,
    imdbRating: null,
  };
}

function emitCreateRoom(socket: Socket, payload: { profile: PartyProfile; media: PartyMedia }) {
  return new Promise<CreateRoomResult>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      socket.off("connect_error", onConnectError);
      callback();
    };
    const onConnectError = (reason: Error) => finish(() => reject(reason));
    const timer = window.setTimeout(() => finish(() => reject(new Error("Room creation timed out."))), 12_000);
    socket.once("connect_error", onConnectError);
    socket.emit("room:create", payload, (result: CreateRoomResult) => finish(() => resolve(result)));
  });
}
