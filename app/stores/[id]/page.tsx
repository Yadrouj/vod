"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { use, useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import PlaceActions from "@/components/PlaceActions";
import PlaceHeader from "@/components/PlaceHeader";
import { AuthorRow, SocialGate, Stars } from "@/components/Social";
import { useLang } from "@/components/LangProvider";
import { useSocial } from "@/lib/hooks";
import { loadStores, type Store } from "@/lib/gyms";
import {
  authorOf,
  compressImage,
  createReview,
  fetchReviews,
  mediaUrl,
  type Review,
} from "@/lib/social";

const GymMap = dynamic(() => import("@/components/GymMap"), { ssr: false });

export default function StoreProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, n } = useLang();
  const social = useSocial();
  const [store, setStore] = useState<Store | null | undefined>(undefined);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    loadStores().then((ss) => setStore(ss.find((s) => s.id === id) ?? null));
  }, [id]);

  const refresh = () =>
    fetchReviews(id).then((r) => {
      setReviews(r.reviews);
      setAvg(r.avg);
      setCount(r.count);
    });
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (store === undefined) return <Spinner />;
  if (!store)
    return (
      <div className="px-4 pt-6">
        <BackLink label={t("store.title")} />
        <p className="mt-10 text-center text-muted">{t("common.notFound")}</p>
      </div>
    );

  return (
    <div className="px-4 pb-24 pt-6">
      <BackLink label={t("store.title")} />

      {/* header */}
      <div className="mt-2">
        <PlaceHeader name={store.name} kind={store.kind} image={store.image} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span>{t(`store.kind.${store.kind}`)}</span>
        {store.women && <span className="rounded-full bg-pink-500/15 px-2 font-bold text-pink-300">{t("gym.women")}</span>}
        {count > 0 && (
          <span className="inline-flex items-center gap-1 font-bold text-amber-400">
            <Icon name="star" className="size-3.5" /> {n(avg.toFixed(1))}
            <span className="text-faint">({n(count)})</span>
          </span>
        )}
      </div>
      {store.address && <p className="mt-1 text-sm text-muted">{store.address}</p>}

      {/* map */}
      <div className="isolate relative mt-3 h-44 overflow-hidden rounded-3xl ring-1 ring-line">
        <GymMap gyms={[store]} userPos={null} selectedId={store.id} onSelect={() => {}} />
      </div>

      {/* actions */}
      <div className="mt-3">
        <PlaceActions place={store} size="md" />
      </div>

      {/* reviews */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <Icon name="message" className="size-4 text-brand" /> {t("rev.title")}
        </h2>
        {count > 0 && <span className="text-xs font-bold text-faint">{t("rev.countN", { n: n(count) })}</span>}
      </div>

      {social === null ? (
        <div className="mt-3">
          <SocialGate />
        </div>
      ) : social ? (
        <ReviewComposer gymId={store.id} onPosted={refresh} />
      ) : null}

      <div className="mt-3 space-y-2.5">
        {reviews.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">{t("rev.none")}</p>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl bg-card p-3 ring-1 ring-line">
            <div className="flex items-center justify-between">
              <AuthorRow name={r.name} avatarId={r.avatarId} skin={r.skin} at={r.createdAt} />
              <Stars value={r.rating} />
            </div>
            {r.text && <p className="mt-2 text-sm leading-relaxed text-muted">{r.text}</p>}
            {r.imageId && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(r.imageId)!} alt="" loading="lazy" className="mt-2 max-h-72 w-full rounded-xl object-cover" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewComposer({ gymId, onPosted }: { gymId: string; onPosted: () => void }) {
  const { t } = useLang();
  const social = useSocial();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setImg(await compressImage(f).catch(() => null));
  }

  async function submit() {
    if (!social) return;
    if (!text.trim() && !rating) return;
    setBusy(true);
    const ok = await createReview({
      author: authorOf(social),
      gymId,
      rating,
      text: text.trim(),
      imageData: img,
    });
    setBusy(false);
    if (ok) {
      setText("");
      setImg(null);
      setRating(5);
      onPosted();
    }
  }

  return (
    <div className="mt-3 rounded-2xl bg-card p-3 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-faint">{t("rev.yourRating")}</span>
        <Stars value={rating} onChange={setRating} size="size-6" />
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("rev.placeholder")}
        rows={2}
        className="mt-2 w-full resize-none rounded-xl bg-base2 px-3 py-2 text-sm text-ink outline-none ring-1 ring-line focus:ring-brand"
      />
      {img && (
        <div className="relative mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="" className="max-h-48 w-full rounded-xl object-cover" />
          <button type="button" onClick={() => setImg(null)} className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white">
            <Icon name="x" className="size-4" />
          </button>
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage} />
        <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded-full bg-card2 px-3 py-1.5 text-xs font-bold text-muted ring-1 ring-line">
          <Icon name="library" className="size-4" /> {t("rev.addPhoto")}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || (!rating && !text.trim() && !img)}
          className="ms-auto inline-flex items-center gap-1 rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-brandink disabled:bg-card2 disabled:text-faint"
        >
          {busy ? t("rev.sending") : t("rev.submit")}
        </button>
      </div>
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link href="/stores" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
      <Icon name="chevronLeft" className="size-4 flip-rtl" /> {label}
    </Link>
  );
}
