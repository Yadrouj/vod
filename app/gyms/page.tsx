"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chip, PageHeader, Spinner, cn } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import PlaceActions from "@/components/PlaceActions";
import { fetchStats } from "@/lib/social";
import {
  downloadTehranMap,
  distanceM,
  loadGyms,
  loadStores,
  type Gym,
  type LatLng,
  type Store,
  type StoreKind,
} from "@/lib/gyms";
import { STORE_KINDS, storeKindIcon } from "@/lib/stores";

const GymMap = dynamic(() => import("@/components/GymMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">...</div>,
});

const LIST_CAP = 40;

type PlaceMode = "gyms" | "stores";
type PlaceItem = { source: "gym"; place: Gym } | { source: "store"; place: Store };

export default function GymsPage() {
  const { t, n } = useLang();
  const [gyms, setGyms] = useState<Gym[] | null>(null);
  const [stores, setStores] = useState<Store[] | null>(null);
  const [mode, setMode] = useState<PlaceMode>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("type") === "stores"
      ? "stores"
      : "gyms"
  );
  const [storeKind, setStoreKind] = useState<StoreKind | "all">("all");
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dlPct, setDlPct] = useState<number | null>(null);
  const [dlDone, setDlDone] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("ramagh-map-offline") === "1"
  );
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGyms().then(setGyms).catch(() => setGyms([]));
    loadStores().then(setStores).catch(() => setStores([]));
  }, []);

  useEffect(() => {
    function syncModeFromUrl() {
      const params = new URLSearchParams(window.location.search);
      setMode(params.get("type") === "stores" ? "stores" : "gyms");
    }
    window.addEventListener("popstate", syncModeFromUrl);
    return () => window.removeEventListener("popstate", syncModeFromUrl);
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

  function chooseMode(nextMode: PlaceMode) {
    setMode(nextMode);
    setSelectedId(null);
    window.history.replaceState(null, "", nextMode === "stores" ? "/gyms?type=stores" : "/gyms");
  }

  const list = useMemo(() => {
    if (!gyms || !stores) return [];
    const q = query.trim().toLowerCase();
    let arr: PlaceItem[] =
      mode === "gyms"
        ? gyms.map((place) => ({ source: "gym", place }))
        : stores.map((place) => ({ source: "store", place }));

    if (mode === "stores" && storeKind !== "all") {
      arr = arr.filter((item) => item.source === "store" && item.place.kind === storeKind);
    }
    if (q) {
      arr = arr.filter(({ place }) =>
        place.name.toLowerCase().includes(q) ||
        (place.nameEn?.toLowerCase().includes(q) ?? false) ||
        place.address.toLowerCase().includes(q)
      );
    }
    if (userPos) {
      arr = [...arr]
        .map((item) => ({ item, d: distanceM(userPos, item.place) }))
        .sort((a, b) => a.d - b.d)
        .map((x) => x.item);
    }
    return arr;
  }, [gyms, stores, mode, storeKind, query, userPos]);

  const shown = list.slice(0, LIST_CAP);
  const mapPlaces = useMemo(() => list.slice(0, 250).map((item) => item.place), [list]);

  const [stats, setStats] = useState<Record<string, { avg: number; count: number }>>({});
  const shownKey = shown.map((item) => item.place.id).join(",");
  useEffect(() => {
    if (!shown.length) return;
    fetchStats(shown.map((item) => item.place.id)).then((s) => setStats((prev) => ({ ...prev, ...s })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownKey]);

  if (!gyms || !stores) return <Spinner />;

  return (
    <div className="px-4 pb-24 pt-6">
      <PageHeader title={t("places.title")} subtitle={t("places.subtitle")} />

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
        <Chip label={t("nav.gyms")} active={mode === "gyms"} onClick={() => chooseMode("gyms")} />
        <Chip label={t("nav.stores")} active={mode === "stores"} onClick={() => chooseMode("stores")} />
      </div>
      {mode === "stores" && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          <Chip label={t("store.all")} active={storeKind === "all"} onClick={() => setStoreKind("all")} />
          {STORE_KINDS.map((k) => (
            <Chip key={k} label={t(`store.kind.${k}`)} active={storeKind === k} onClick={() => setStoreKind(k)} />
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-card2 px-3 ring-1 ring-line">
        <Icon name="library" className="size-4 text-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={mode === "gyms" ? t("gym.search") : t("store.search")}
          className="w-full bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-faint"
        />
      </div>

      <p className="mt-3 text-xs font-bold text-faint">
        {mode === "gyms" ? t("gym.countN", { n: n(list.length) }) : t("store.countN", { n: n(list.length) })}
      </p>

      <div ref={listRef} className="mt-2 space-y-2">
        {shown.map((item) =>
          item.source === "gym" ? (
            <GymRow
              key={item.place.id}
              gym={item.place}
              dist={userPos ? distanceM(userPos, item.place) : null}
              userPos={userPos}
              stat={stats[item.place.id]}
            />
          ) : (
            <StoreRow
              key={item.place.id}
              store={item.place}
              dist={userPos ? distanceM(userPos, item.place) : null}
              userPos={userPos}
              stat={stats[item.place.id]}
            />
          )
        )}
        {list.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            {mode === "gyms" ? t("gym.noMatch") : t("store.noMatch")}
          </p>
        )}
        {list.length > LIST_CAP && (
          <p className="py-2 text-center text-xs text-faint">
            {mode === "gyms"
              ? t("gym.countN", { n: n(list.length - LIST_CAP) })
              : t("store.countN", { n: n(list.length - LIST_CAP) })}{" "}
            ...
          </p>
        )}
      </div>
    </div>
  );
}

function GymRow({
  gym,
  dist,
  userPos,
  stat,
}: {
  gym: Gym;
  dist: number | null;
  userPos: LatLng | null;
  stat?: { avg: number; count: number };
}) {
  const { t, n } = useLang();
  const kindLabel = t(`gym.kind.${gym.kind}`);
  const distLabel =
    dist == null
      ? null
      : dist < 1000
      ? t("gym.m", { n: n(Math.round(dist)) })
      : t("gym.km", { n: n((dist / 1000).toFixed(1)) });

  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-line transition-colors">
      <Link href={`/gyms/${gym.id}`} className="flex items-center gap-3 px-3.5 py-4 transition-colors hover:bg-card2">
        <span
          className={cn(
            "flex size-10 flex-shrink-0 items-center justify-center rounded-xl",
            gym.kind === "pool" ? "bg-sky-500/15 text-sky-300" : gym.kind === "sports" ? "bg-amber-500/15 text-amber-300" : "bg-brand/15 text-brand"
          )}
        >
          <Icon name={gym.kind === "pool" ? "diet" : "dumbbell"} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{gym.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-faint">
            <span>{kindLabel}</span>
            {gym.women && <span className="rounded-full bg-pink-500/15 px-1.5 font-bold text-pink-300">{t("gym.women")}</span>}
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
          {gym.address && <p className="mt-0.5 truncate text-xs text-muted">{gym.address}</p>}
        </div>
        <span className="flex size-7 flex-shrink-0 items-center justify-center self-center rounded-full bg-brand/15 text-brand">
          <Icon name="chevronRight" className="size-4 flip-rtl" />
        </span>
      </Link>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-line/60 px-3 py-2">
        <PlaceActions place={gym} userPos={userPos} />
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
