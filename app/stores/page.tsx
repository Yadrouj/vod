"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chip, PageHeader, Spinner, cn } from "@/components/ui";
import { Icon } from "@/components/icons";
import PlaceActions from "@/components/PlaceActions";
import { useLang } from "@/components/LangProvider";
import { fetchStats } from "@/lib/social";
import {
  downloadTehranMap,
  distanceM,
  loadStores,
  type LatLng,
  type Store,
  type StoreKind,
} from "@/lib/gyms";
import { STORE_KINDS, storeKindIcon } from "@/lib/stores";

const GymMap = dynamic(() => import("@/components/GymMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">…</div>,
});

const LIST_CAP = 40;

export default function StoresPage() {
  const { t, n } = useLang();
  const [stores, setStores] = useState<Store[] | null>(null);
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<StoreKind | "all">("all");
  const [dlPct, setDlPct] = useState<number | null>(null);
  const [dlDone, setDlDone] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStores().then(setStores).catch(() => setStores([]));
    if (localStorage.getItem("ramagh-map-offline") === "1") setDlDone(true);
  }, []);

  function locate() {
    if (!("geolocation" in navigator)) {
      setGeoErr(t("gym.geoUnavailable"));
      return;
    }
    setLocating(true);
    setGeoErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setGeoErr(t("gym.permDenied"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  async function downloadOffline() {
    if (dlPct !== null) return;
    setDlPct(0);
    await downloadTehranMap(setDlPct);
    setDlPct(null);
    setDlDone(true);
    localStorage.setItem("ramagh-map-offline", "1");
  }

  const list = useMemo(() => {
    if (!stores) return [];
    const q = query.trim().toLowerCase();
    let arr = stores;
    if (kind !== "all") arr = arr.filter((s) => s.kind === kind);
    if (q)
      arr = arr.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.nameEn?.toLowerCase().includes(q) ?? false) ||
          s.address.toLowerCase().includes(q)
      );
    if (userPos) {
      arr = [...arr]
        .map((s) => ({ s, d: distanceM(userPos, s) }))
        .sort((a, b) => a.d - b.d)
        .map((x) => x.s);
    }
    return arr;
  }, [stores, query, kind, userPos]);

  const shown = list.slice(0, LIST_CAP);
  const mapPlaces = useMemo(() => list.slice(0, 250), [list]);

  const [stats, setStats] = useState<Record<string, { avg: number; count: number }>>({});
  const shownKey = shown.map((s) => s.id).join(",");
  useEffect(() => {
    if (!shown.length) return;
    fetchStats(shown.map((s) => s.id)).then((s) => setStats((prev) => ({ ...prev, ...s })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownKey]);

  if (!stores) return <Spinner />;

  return (
    <div className="px-4 pb-24 pt-6">
      <PageHeader title={t("store.title")} subtitle={t("store.subtitle")} />

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={locate}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-bold text-brandink shadow-[0_8px_24px_-8px_rgb(184_242_74/0.5)] active:scale-[0.98]"
        >
          <Icon name={locating ? "timer" : "pin"} className={cn("size-4", locating && "animate-spin")} />
          {locating ? t("gym.locating") : t("gym.locate")}
        </button>
        <button
          type="button"
          onClick={downloadOffline}
          disabled={dlPct !== null}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-bold ring-1 transition-colors",
            dlDone
              ? "bg-success-dim text-success ring-success/25"
              : "bg-card2 text-muted ring-line hover:text-ink"
          )}
          title={t("gym.offlineHint")}
        >
          <Icon name="history" className="size-4" />
          {dlPct !== null ? t("gym.offlineDl", { n: n(dlPct) }) : dlDone ? t("gym.offlineDone") : t("gym.offline")}
        </button>
      </div>
      {geoErr && <p className="mt-2 text-xs font-semibold text-warn">{geoErr}</p>}

      <div className="isolate relative mt-3 h-64 overflow-hidden rounded-3xl ring-1 ring-line">
        <GymMap gyms={mapPlaces} userPos={userPos} selectedId={selectedId} onSelect={setSelectedId} />
        <span className="pointer-events-none absolute bottom-1 left-1 z-[500] rounded bg-base2/80 px-1.5 py-0.5 text-[9px] text-faint">
          {t("gym.attribution")} · CARTO
        </span>
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        <Chip label={t("store.all")} active={kind === "all"} onClick={() => setKind("all")} />
        {STORE_KINDS.map((k) => (
          <Chip key={k} label={t(`store.kind.${k}`)} active={kind === k} onClick={() => setKind(k)} />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-card2 px-3 ring-1 ring-line">
        <Icon name="library" className="size-4 text-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("store.search")}
          className="w-full bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-faint"
        />
      </div>

      <p className="mt-3 text-xs font-bold text-faint">{t("store.countN", { n: n(list.length) })}</p>

      <div ref={listRef} className="mt-2 space-y-2">
        {shown.map((s) => (
          <StoreRow
            key={s.id}
            store={s}
            dist={userPos ? distanceM(userPos, s) : null}
            userPos={userPos}
            stat={stats[s.id]}
          />
        ))}
        {list.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">{t("store.noMatch")}</p>
        )}
        {list.length > LIST_CAP && (
          <p className="py-2 text-center text-xs text-faint">
            {t("store.countN", { n: n(list.length - LIST_CAP) })} …
          </p>
        )}
      </div>
    </div>
  );
}

function StoreRow({
  store,
  dist,
  userPos,
  stat,
}: {
  store: Store;
  dist: number | null;
  userPos: LatLng | null;
  stat?: { avg: number; count: number };
}) {
  const { t, n } = useLang();
  const kindLabel = t(`store.kind.${store.kind}`);
  const distLabel =
    dist == null
      ? null
      : dist < 1000
      ? t("gym.m", { n: n(Math.round(dist)) })
      : t("gym.km", { n: n((dist / 1000).toFixed(1)) });

  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-line transition-colors">
      <Link href={`/stores/${store.id}`} className="flex items-center gap-3 px-3.5 py-4 transition-colors hover:bg-card2">
        <span
          className={cn(
            "flex size-10 flex-shrink-0 items-center justify-center rounded-xl",
            store.kind === "sports"
              ? "bg-amber-500/15 text-amber-300"
              : store.kind === "supplement"
              ? "bg-pink-500/15 text-pink-300"
              : store.kind === "medical"
              ? "bg-cyan-500/15 text-cyan-300"
              : "bg-emerald-500/15 text-emerald-300"
          )}
        >
          <Icon name={storeKindIcon(store.kind)} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{store.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-faint">
            <span>{kindLabel}</span>
            {store.women && <span className="rounded-full bg-pink-500/15 px-1.5 font-bold text-pink-300">{t("gym.women")}</span>}
            {stat && stat.count > 0 && (
              <span className="inline-flex items-center gap-0.5 font-bold text-amber-400">
                <Icon name="star" className="size-3" /> {n(stat.avg.toFixed(1))} <span className="text-faint">({n(stat.count)})</span>
              </span>
            )}
            {distLabel && (
              <span className="inline-flex items-center gap-0.5 font-bold text-brand">
                <Icon name="pin" className="size-3" /> {distLabel}
              </span>
            )}
          </div>
          {store.address && <p className="mt-0.5 truncate text-xs text-muted">{store.address}</p>}
        </div>
        <span className="flex size-7 flex-shrink-0 items-center justify-center self-center rounded-full bg-brand/15 text-brand">
          <Icon name="chevronRight" className="size-4 flip-rtl" />
        </span>
      </Link>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-line/60 px-3 py-2">
        <PlaceActions place={store} userPos={userPos} />
      </div>
    </div>
  );
}
