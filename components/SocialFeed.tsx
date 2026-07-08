"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./icons";
import { cn } from "./ui";
import { AuthorRow, SocialGate } from "./Social";
import { useLang } from "./LangProvider";
import { useProgram, useSessions, useSocial } from "@/lib/hooks";
import { tFocus } from "@/lib/i18n";
import {
  authorOf,
  compressImage,
  createPost,
  fetchFeed,
  likePost,
  mediaUrl,
  type Post,
  type PostType,
} from "@/lib/social";

const TABS: { type: PostType; icon: IconName; key: string }[] = [
  { type: "story", icon: "message", key: "feed.tab.story" },
  { type: "photo", icon: "library", key: "feed.tab.photo" },
  { type: "activity", icon: "dumbbell", key: "feed.tab.activity" },
  { type: "program", icon: "calendar", key: "feed.tab.program" },
];

export default function SocialFeed() {
  const { t } = useLang();
  const social = useSocial();
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    fetchFeed().then(setPosts).catch(() => setPosts([]));
  }, []);

  const prepend = (p: Post) => setPosts((cur) => [p, ...(cur ?? [])]);

  return (
    <div>
      {social === null ? (
        <SocialGate />
      ) : social ? (
        <Composer onPosted={prepend} />
      ) : null}

      <div className="mt-4 space-y-3">
        {posts == null && <p className="py-8 text-center text-sm text-muted">…</p>}
        {posts?.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">{t("feed.empty")}</p>
        )}
        {posts?.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}

function Composer({ onPosted }: { onPosted: (p: Post) => void }) {
  const { t, lang } = useLang();
  const social = useSocial();
  const sessions = useSessions();
  const program = useProgram();
  const [tab, setTab] = useState<PostType>("story");
  const [text, setText] = useState("");
  const [img, setImg] = useState<string | null>(null);
  const [sessionIdx, setSessionIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setImg(await compressImage(f).catch(() => null));
  }

  const recent = (sessions ?? []).slice(0, 6);

  function activityData() {
    if (sessionIdx == null || !recent[sessionIdx]) return null;
    const s = recent[sessionIdx];
    const sets = s.exercises.reduce((n, e) => n + e.sets.length, 0);
    return { dayLabel: s.dayLabel, sets, exercises: s.exercises.length, when: s.startedAt };
  }
  function programData() {
    if (!program) return null;
    const days = program.days.filter((d) => d.exercises.length);
    if (!days.length) return null; // don't let an empty program skeleton be shared
    const focuses = [...new Set(days.flatMap((d) => d.focus))];
    return { daysPerWeek: days.length, focuses };
  }

  async function submit() {
    if (!social || busy) return;
    let data: Record<string, unknown> | null = null;
    if (tab === "activity") {
      data = activityData();
      if (!data) return;
    } else if (tab === "program") {
      data = programData();
      if (!data) return;
    } else if (tab === "photo" && !img) {
      return;
    } else if (tab === "story" && !text.trim() && !img) {
      return;
    }
    setBusy(true);
    const post = await createPost({
      author: authorOf(social),
      type: tab,
      text: text.trim(),
      imageData: img,
      data,
    });
    setBusy(false);
    if (post) {
      setText("");
      setImg(null);
      setSessionIdx(null);
      onPosted(post);
    }
  }

  const canPost =
    tab === "activity"
      ? sessionIdx != null
      : tab === "program"
      ? Boolean(programData())
      : tab === "photo"
      ? Boolean(img)
      : Boolean(text.trim() || img);

  return (
    <div className="rounded-2xl bg-card p-3 ring-1 ring-line">
      {/* type tabs */}
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {TABS.map((tb) => (
          <button
            key={tb.type}
            type="button"
            onClick={() => setTab(tb.type)}
            className={cn(
              "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
              tab === tb.type ? "bg-brand text-brandink" : "bg-card2 text-muted ring-1 ring-line"
            )}
          >
            <Icon name={tb.icon} className="size-3.5" /> {t(tb.key)}
          </button>
        ))}
      </div>

      {/* body per type */}
      {tab === "activity" ? (
        recent.length === 0 ? (
          <p className="mt-3 text-xs text-muted">{t("feed.noActivity")}</p>
        ) : (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-bold text-faint">{t("feed.pickActivity")}</p>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              {recent.map((s, i) => {
                const sets = s.exercises.reduce((n, e) => n + e.sets.length, 0);
                return (
                  <button
                    key={s.id ?? i}
                    type="button"
                    onClick={() => setSessionIdx(i)}
                    className={cn(
                      "flex-shrink-0 rounded-xl px-3 py-2 text-start ring-1",
                      sessionIdx === i ? "bg-brand/15 ring-brand" : "bg-card2 ring-line"
                    )}
                  >
                    <p className="text-xs font-bold text-ink">{t("post.workoutOn", { day: tWeekdayLabel(lang, s.dayLabel) })}</p>
                    <p className="text-[10px] text-faint">{t("post.setsN", { n: sets })}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )
      ) : tab === "program" ? (
        programData() ? (
          <div className="mt-3 rounded-xl bg-card2 p-3 ring-1 ring-line">
            <p className="text-sm font-bold text-ink">{t("feed.shareProgram")}</p>
            <p className="mt-0.5 text-xs text-muted">
              {t("post.daysWeek", { n: programData()!.daysPerWeek })}
              {programData()!.focuses.length > 0 && " · " + programData()!.focuses.map((f) => tFocus(lang, f)).join(lang === "fa" ? "، " : ", ")}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted">{t("feed.noProgram")}</p>
        )
      ) : null}

      {/* caption / story text (all types except program has optional caption too) */}
      {tab !== "program" && (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={tab === "story" ? t("feed.storyPh") : t("feed.caption")}
          rows={tab === "story" ? 3 : 2}
          className="mt-3 w-full resize-none rounded-xl bg-base2 px-3 py-2 text-sm text-ink outline-none ring-1 ring-line focus:ring-brand"
        />
      )}

      {/* image preview */}
      {img && (
        <div className="relative mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="" className="max-h-56 w-full rounded-xl object-cover" />
          <button type="button" onClick={() => setImg(null)} className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white">
            <Icon name="x" className="size-4" />
          </button>
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        {tab !== "program" && (
          <>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage} />
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded-full bg-card2 px-3 py-1.5 text-xs font-bold text-muted ring-1 ring-line">
              <Icon name="library" className="size-4" /> {t(tab === "photo" ? "feed.addPhoto" : "rev.addPhoto")}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={busy || !canPost}
          className="ms-auto inline-flex items-center gap-1 rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-brandink disabled:bg-card2 disabled:text-faint"
        >
          {busy ? t("feed.posting") : t("feed.post")}
        </button>
      </div>
    </div>
  );
}

const LIKED_KEY = "ramagh-liked";
function likedSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function PostCard({ post }: { post: Post }) {
  const { t, lang, n } = useLang();
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(false);

  // Restore "already liked" across reloads so one user can't inflate the count.
  useEffect(() => {
    setLiked(likedSet().has(post.id));
  }, [post.id]);

  async function like() {
    if (liked) return;
    setLiked(true);
    setLikes((x) => x + 1);
    const s = likedSet();
    s.add(post.id);
    try {
      localStorage.setItem(LIKED_KEY, JSON.stringify([...s]));
    } catch {
      /* ignore */
    }
    const res = await likePost(post.id);
    if (res != null) setLikes(res);
  }

  return (
    <div className="rounded-2xl bg-card p-3 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <AuthorRow name={post.name} avatarId={post.avatarId} skin={post.skin} at={post.createdAt} />
        {post.gymName && (
          <span className="inline-flex items-center gap-1 rounded-full bg-card2 px-2 py-0.5 text-[10px] font-bold text-faint">
            <Icon name="pin" className="size-3 text-brand" /> {post.gymName}
          </span>
        )}
      </div>

      {/* structured bodies */}
      {post.type === "activity" && post.data && (
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-brand/10 p-3 ring-1 ring-brand/20">
          <Icon name="dumbbell" className="size-6 text-brand" />
          <div>
            <p className="text-sm font-bold text-ink">{t("post.didActivity")}</p>
            <p className="text-xs text-muted">
              {t("post.workoutOn", { day: tWeekdayLabel(lang, String(post.data.dayLabel ?? "")) })}
              {" · "}
              {t("post.setsN", { n: n(Number(post.data.sets ?? 0)) })}
              {" · "}
              {t("post.exercisesN", { n: n(Number(post.data.exercises ?? 0)) })}
            </p>
          </div>
        </div>
      )}
      {post.type === "program" && post.data && (
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-sky-500/10 p-3 ring-1 ring-sky-500/20">
          <Icon name="calendar" className="size-6 text-sky-300" />
          <div>
            <p className="text-sm font-bold text-ink">{t("post.sharedProgram")}</p>
            <p className="text-xs text-muted">
              {t("post.daysWeek", { n: n(Number(post.data.daysPerWeek ?? 0)) })}
              {Array.isArray(post.data.focuses) && post.data.focuses.length > 0 &&
                " · " + (post.data.focuses as string[]).map((f) => tFocus(lang, f)).join(lang === "fa" ? "، " : ", ")}
            </p>
          </div>
        </div>
      )}

      {post.text && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">{post.text}</p>}

      {post.imageId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(post.imageId)!} alt="" loading="lazy" className="mt-2 max-h-96 w-full rounded-xl object-cover" />
      )}

      <div className="mt-2 flex items-center gap-3 border-t border-line/60 pt-2">
        <button
          type="button"
          onClick={like}
          className={cn("inline-flex items-center gap-1 text-xs font-bold", liked ? "text-rose-400" : "text-faint")}
        >
          <Icon name="heart" className="size-4" /> {n(likes)}
        </button>
      </div>
    </div>
  );
}

// weekday label lives in i18n but importing tWeekday would need lang; small local wrapper.
function tWeekdayLabel(lang: "fa" | "en", en: string): string {
  const map: Record<string, string> = {
    Saturday: "شنبه", Sunday: "یکشنبه", Monday: "دوشنبه", Tuesday: "سه‌شنبه",
    Wednesday: "چهارشنبه", Thursday: "پنجشنبه", Friday: "جمعه",
  };
  return lang === "fa" ? map[en] ?? en : en;
}
