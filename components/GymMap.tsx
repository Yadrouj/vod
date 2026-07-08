"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TEHRAN, TILE_URL, type Gym, type LatLng, type Store } from "@/lib/gyms";

type Place = Gym | Store;

const KIND_COLOR: Record<string, string> = {
  gym: "#b8f24a",
  pool: "#56b8ff",
  sports: "#ffc94d",
  pharmacy: "#4ade80",
  supplement: "#f472b6",
  medical: "#22d3ee",
};

export default function GymMap({
  gyms,
  userPos,
  selectedId,
  onSelect,
}: {
  gyms: Place[];
  userPos: LatLng | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const rendererRef = useRef<L.Canvas | null>(null);
  const gymLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const userRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // init once
  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    const map = L.map(elRef.current, {
      center: [TEHRAN.lat, TEHRAN.lng],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer(TILE_URL, {
      subdomains: "a",
      maxZoom: 19,
      detectRetina: false,
    }).addTo(map);
    L.control.zoom({ position: "topleft" }).addTo(map);
    rendererRef.current = L.canvas({ padding: 0.5 });
    gymLayerRef.current = L.layerGroup().addTo(map);
    userRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // container may size a tick after mount (dynamic import / flex layout)
    const invalidateTimer = window.setTimeout(() => {
      if (mapRef.current === map) map.invalidateSize();
    }, 200);
    return () => {
      window.clearTimeout(invalidateTimer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // (re)draw gym markers
  useEffect(() => {
    const layer = gymLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    markersRef.current.clear();
    for (const g of gyms) {
      const m = L.circleMarker([g.lat, g.lng], {
        renderer: rendererRef.current!,
        radius: 6,
        weight: 1.5,
        color: "#0b1418",
        fillColor: KIND_COLOR[g.kind] ?? "#b8f24a",
        fillOpacity: 0.95,
      });
      m.on("click", () => onSelectRef.current(g.id));
      m.bindTooltip(g.name, { direction: "top", offset: [0, -4] });
      m.addTo(layer);
      markersRef.current.set(g.id, m);
    }
  }, [gyms]);

  // user location marker + recenter
  useEffect(() => {
    const layer = userRef.current;
    const map = mapRef.current;
    if (!layer || !map || !userPos) return;
    layer.clearLayers();
    L.circleMarker([userPos.lat, userPos.lng], {
      radius: 8,
      weight: 3,
      color: "#ffffff",
      fillColor: "#2563eb",
      fillOpacity: 1,
    })
      .addTo(layer)
      .bindTooltip("•", { permanent: false });
    map.setView([userPos.lat, userPos.lng], 14, { animate: true });
  }, [userPos]);

  // highlight + fly to selection (e.g. tapped in the list)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m, id) => {
      m.setStyle({
        radius: id === selectedId ? 10 : 6,
        weight: id === selectedId ? 3 : 1.5,
        color: id === selectedId ? "#b8f24a" : "#0b1418",
      });
      if (id === selectedId) m.bringToFront();
    });
    if (selectedId) {
      const g = gyms.find((x) => x.id === selectedId);
      if (g) {
        map.flyTo([g.lat, g.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
        markersRef.current.get(selectedId)?.openTooltip();
      }
    }
  }, [selectedId, gyms]);

  return <div ref={elRef} className="h-full w-full" />;
}
