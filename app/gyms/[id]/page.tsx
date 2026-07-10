"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { use, useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import { AuthorRow, SocialGate, Stars } from "@/components/Social";
import PlaceActions from "@/components/PlaceActions";
import PlaceHeader from "@/components/PlaceHeader";
import { useLang } from "@/components/LangProvider";
import { useSocial } from "@/lib/hooks";
import { gymGalleryFor } from "@/lib/gymGallery";
import { loadGyms, type Gym } from "@/lib/gyms";
import {
  authorOf,
  compressImage,
  createReview,
  fetchReviews,
  mediaUrl,
  type Review,
} from "@/lib/social";

const GymMap = dynamic(() => import("@/components/GymMap"), { ssr: false });

export default function GymProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, n } = useLang();
  const social = useSocial();
  const [gym, setGym] = useState<Gym | null | undefined>(undefined);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    loadGyms().then((gs) => setGym(gs.find((g) => g.id === id) ?? null));
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

  if (gym === undefined) return <Spinner />;
  if (!gym)
    return (
      <div className="px-4 pt-6">
        <BackLink label={t("gym.title")} />
        <p className="mt-10 text-center text-muted">{t("common.notFound")}</p>
      </div>
    );
  const gallery = gymGalleryFor(gym.id, gym.name);

  return (
    <div className="px-4 pb-24 pt-6">
      <PlaceHeader
        name={gym.name}
        kind={gym.kind}
        image={gym.image || gallery[0]?.src}
        subtitle={gym.address}
        top={<BackLink label={t("gym.title")} />}
        meta={
          <>
            <span className="rounded-full bg-white/12 px-3 py-1.5 ring-1 ring-white/18 backdrop-blur-md">{t(`gym.kind.${gym.kind}`)}</span>
            {gym.women && <span className="rounded-full bg-pink-500/20 px-3 py-1.5 text-pink-100 ring-1 ring-pink-300/20 backdrop-blur-md">{t("gym.women")}</span>}
            {count > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1.5 text-amber-200 ring-1 ring-amber-300/20 backdrop-blur-md">
                <Icon name="star" className="size-3.5" /> {n(avg.toFixed(1))}
                <span className="text-white/45">({n(count)})</span>
              </span>
            )}
          </>
        }
      >
        <section className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black text-white">
              <Icon name="library" className="size-4 text-brand" />
              گالری واقعی باشگاه
            </h2>
            <span className="text-[10px] font-bold text-white/48">Real web photos</span>
          </div>
          <div className="no-scrollbar -mx-4 flex snap-x scroll-smooth gap-3 overflow-x-auto px-4 pb-2">
            {gallery.map((image) => (
              <figure key={image.src} className="w-[78vw] max-w-80 flex-shrink-0 snap-start overflow-hidden rounded-2xl bg-white/8 ring-1 ring-white/12 backdrop-blur-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt={image.alt} loading="lazy" className="h-44 w-full object-cover" />
                <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-[10px] font-bold text-white/58">
                  <span className="truncate">{image.alt}</span>
                  <span className="flex-shrink-0 text-brand">{image.credit}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-1 text-[11px] leading-5 text-white/45">
            این گالری از عکس‌های واقعی وب برای نمایش فضای تمرین استفاده می‌کند. عکس اختصاصی هر باشگاه با ارسال کاربران و مالک باشگاه تکمیل می‌شود.
          </p>
        </section>
      </PlaceHeader>

      {/* map */}
      <div className="isolate relative mt-3 h-44 overflow-hidden rounded-3xl ring-1 ring-line">
        <GymMap gyms={[gym]} userPos={null} selectedId={gym.id} onSelect={() => {}} />
      </div>

      {/* actions */}
      <div className="mt-3">
        <PlaceActions place={gym} size="md" source="gym" />
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
        <ReviewComposer gymId={gym.id} onPosted={refresh} />
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
    <Link href="/gyms" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
      <Icon name="chevronLeft" className="size-4 flip-rtl" /> {label}
    </Link>
  );
}
