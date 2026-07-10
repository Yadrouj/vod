"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, PageHeader, cn } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { addAnalysisMsg, isVipActive } from "@/lib/db";
import { useAccount, useAnalysisThread, useDietProfile, useSettings, useSubscription } from "@/lib/hooks";

/** Downscale + encode a photo as a JPEG data URL (keeps IndexedDB small). */
function fileToDataUrl(file: File, maxSide = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function AnalysisPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const thread = useAnalysisThread();
  const account = useAccount();
  const settings = useSettings();
  const dietProfile = useDietProfile();
  const subscription = useSubscription();
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.length]);

  async function pick(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files).slice(0, 4 - photos.length)) {
      const dataUrl = await fileToDataUrl(f);
      setPhotos((p) => [...p, dataUrl]);
    }
  }

  function analysisContext(): string {
    const parts: string[] = [];
    if (settings) {
      parts.push(
        `training gender=${settings.gender}, level=${settings.level}, goal=${settings.goal}, focus=${settings.view}`
      );
    }
    if (dietProfile) {
      parts.push(
        `body age=${dietProfile.age}, height=${dietProfile.heightCm}cm, weight=${dietProfile.weightKg}kg, sex=${dietProfile.sex}, activity=${dietProfile.activity}, nutritionGoal=${dietProfile.goal}`
      );
    }
    return parts.join(" | ");
  }

  async function submit() {
    if (busy) return;
    if (photos.length === 0) {
      setError(t("an.needPhoto"));
      return;
    }
    if (!account?.token) {
      router.push("/login?next=/analysis");
      return;
    }
    if (!(await isVipActive())) {
      router.push("/upgrade?feature=analysis");
      return;
    }
    setError(null);
    setBusy(true);
    const pendingPhotos = photos;
    const pendingNote = note.trim();
    await addAnalysisMsg({
      from: "user",
      text: pendingNote,
      images: pendingPhotos,
      pdf: null,
      pdfName: null,
    });
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          note: pendingNote,
          images: pendingPhotos,
          context: analysisContext(),
        }),
      });
      const json = await res.json();
      if (res.status === 503 && json.error === "no_key") {
        setError(t("coach.needsKey"));
      } else if (json.error === "need_photo") {
        setError(t("an.needPhoto"));
      } else if (!res.ok || !json.content) {
        setError(t("coach.error"));
      } else {
        await addAnalysisMsg({
          from: "team",
          text: json.content,
          images: [],
          pdf: null,
          pdfName: null,
        });
        setPhotos([]);
        setNote("");
      }
    } catch {
      setError(t("coach.error"));
    } finally {
      setBusy(false);
    }
  }

  const lastUser = [...(thread ?? [])].reverse().find((m) => m.from === "user");
  const answered =
    lastUser &&
    (thread ?? []).some((m) => m.from === "team" && m.createdAt > lastUser.createdAt);
  const activeVip =
    subscription?.status === "vip" &&
    typeof subscription.vipUntil === "number" &&
    subscription.vipUntil > now;
  const intro =
    lang === "fa"
      ? "یک یا چند عکس واضح بفرست. سه زاویه اجباری نیست؛ اگر عکس برای ارزیابی کافی نباشد، دقیق می‌گوییم چه چیزی را دوباره آپلود کنی. اگر قد و وزن را می‌دانی در توضیح بنویس."
      : "Send one or more clear photos. Three angles are not required; if a photo is not useful enough, we will ask for the exact re-upload needed. Add height and weight in the note if you know them.";

  return (
    <div className="px-4 pt-6 pb-10">
      <PageHeader
        title={t("an.title")}
        subtitle={t("an.subtitle")}
        right={
          lastUser ? (
            <span
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-extrabold ring-1",
                answered
                  ? "bg-success-dim text-success ring-success/25"
                  : "bg-warn-dim text-warn ring-warn/25"
              )}
            >
              {answered ? t("an.answered") : t("an.pending")}
            </span>
          ) : undefined
        }
      />

      {/* thread */}
      <div className="mt-4 space-y-3">
        <TeamBubble text={intro} />
        {(thread ?? []).map((m) => (
          <div key={m.id} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] space-y-2 rounded-2xl px-4 py-3 text-sm leading-relaxed",
                m.from === "user"
                  ? "bg-brand/15 text-ink ring-1 ring-brand/30"
                  : "bg-card text-ink ring-1 ring-line"
              )}
            >
              <p className="text-[10px] font-extrabold text-faint">
                {m.from === "user" ? t("an.you") : t("an.team")}
              </p>
              {m.images.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  {m.images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt="" className="rounded-lg ring-1 ring-line" />
                  ))}
                </div>
              )}
              {m.text && <p className="whitespace-pre-wrap" dir="auto">{m.text}</p>}
              {m.pdf && (
                <a
                  href={m.pdf}
                  download={m.pdfName ?? "analysis.pdf"}
                  className="inline-flex items-center gap-2 rounded-xl bg-danger-dim px-3 py-2 text-xs font-extrabold text-danger ring-1 ring-danger/25"
                >
                  <Icon name="library" className="size-4" /> {t("an.pdf")}
                </a>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* composer */}
      <div className="mt-5 space-y-3 rounded-3xl bg-card p-4 ring-1 ring-line">
        {!activeVip && (
          <Link
            href="/upgrade?feature=analysis"
            className="flex items-center justify-between gap-3 rounded-2xl bg-brand/10 p-3 text-sm font-extrabold text-brand ring-1 ring-brand/25"
          >
            <span>
              {lang === "fa"
                ? "آنالیز بدن با AI برای اعضای VIP فعال می‌شود."
                : "AI body analysis is available with VIP."}
            </span>
            <Icon name="chevronRight" className="size-4 flex-shrink-0 flip-rtl" />
          </Link>
        )}
        {photos.length > 0 && (
          <div className="flex gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="size-16 rounded-lg object-cover ring-1 ring-line" />
                <button
                  type="button"
                  onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                  className="absolute -end-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-danger text-white"
                >
                  <Icon name="x" className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-11 items-center gap-2 rounded-xl bg-card2 px-3.5 text-xs font-extrabold text-muted ring-1 ring-line hover:text-ink"
          >
            <Icon name="plus" className="size-4" /> {t("an.attach")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => pick(e.target.files)}
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              lang === "fa"
                ? "توضیح اختیاری: قد، وزن، هدف یا محدودیت"
                : "Optional: height, weight, goal, or limits"
            }
            className="h-11 flex-1 rounded-xl bg-base2 px-3 text-sm text-ink outline-none ring-1 ring-line placeholder:text-faint focus:ring-2 focus:ring-brand"
          />
        </div>
        {error && <p className="text-xs font-semibold text-danger">{error}</p>}
        <Button className="w-full" onClick={submit} disabled={busy}>
          <Icon name="sparkles" className="size-4" />
          {busy ? (lang === "fa" ? "در حال آنالیز..." : "Analyzing...") : t("an.send")}
        </Button>
        <p className="text-center text-[10px] text-faint">
          {lang === "fa"
            ? "عکس‌ها فقط روی همین دستگاه ذخیره می‌شوند."
            : "Photos are stored only on this device."}
        </p>
      </div>
    </div>
  );
}

function TeamBubble({ text }: { text: string }) {
  const { t } = useLang();
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl bg-card px-4 py-3 text-sm leading-relaxed text-ink ring-1 ring-line">
        <p className="text-[10px] font-extrabold text-faint">{t("an.team")}</p>
        <p className="mt-1 whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}
