"use client";

import { useEffect, useRef } from "react";
import type { Gender } from "@/lib/types";
import { BODY_SVGS } from "@/lib/bodysvg";
import { useLang } from "./LangProvider";

// The real MuscleWiki body maps (front + back, male + female) extracted from the
// rendered site. We inject the raw SVG and wire each muscle group <g id> to a
// per-muscle selection via event delegation; selection/hover styling lives in
// globals.css (.mwbody).

const SVG_MUSCLES: Record<string, { muscles: string[]; fa: string; en: string }> = {
  quads: { muscles: ["Quads", "Inner Quadriceps", "Outer Quadricep", "Rectus Femoris"], fa: "جلو ران", en: "Quads" },
  calves: { muscles: ["Calves", "Gastrocnemius", "Soleus", "Tibialis"], fa: "ساق پا", en: "Calves" },
  hamstrings: { muscles: ["Hamstrings", "Lateral Hamstrings", "Medial Hamstrings"], fa: "پشت ران", en: "Hamstrings" },
  glutes: { muscles: ["Glutes", "Gluteus Maximus", "Gluteus Medius"], fa: "سرینی", en: "Glutes" },
  abdominals: { muscles: ["Abdominals", "Upper Abdominals", "Lower Abdominals"], fa: "شکم", en: "Abs" },
  obliques: { muscles: ["Obliques"], fa: "مورب شکمی", en: "Obliques" },
  biceps: { muscles: ["Biceps", "Long Head Bicep", "Short Head Bicep"], fa: "جلو بازو", en: "Biceps" },
  triceps: { muscles: ["Triceps", "Long Head Tricep"], fa: "پشت بازو", en: "Triceps" },
  forearms: { muscles: ["Forearms", "Wrist Extensors", "Wrist Flexors"], fa: "ساعد", en: "Forearms" },
  hands: { muscles: ["Forearms", "Wrist Extensors", "Wrist Flexors"], fa: "ساعد", en: "Forearms" },
  chest: { muscles: ["Chest", "Upper Pectoralis", "Mid and Lower Chest"], fa: "سینه", en: "Chest" },
  "front-shoulders": { muscles: ["Front Shoulders", "Anterior Deltoid", "Shoulders", "Lateral Deltoid"], fa: "سرشانه جلو", en: "Front delts" },
  "rear-shoulders": { muscles: ["Rear Shoulders", "Posterior Deltoid"], fa: "سرشانه پشت", en: "Rear delts" },
  traps: { muscles: ["Traps", "Upper Traps"], fa: "کول", en: "Traps" },
  "traps-middle": { muscles: ["Traps (mid-back)", "Lower Traps"], fa: "ذوزنقه میانی", en: "Mid traps" },
  lats: { muscles: ["Lats"], fa: "زیربغل", en: "Lats" },
  lowerback: { muscles: ["Lower back"], fa: "فیله کمر", en: "Lower back" },
  "upper-spine": { muscles: ["Traps (mid-back)", "Lower Traps"], fa: "ذوزنقه میانی", en: "Mid traps" },
  "lower-spine": { muscles: ["Lower back"], fa: "فیله کمر", en: "Lower back" },
};

export function bodyMuscles(id: string): string[] {
  return SVG_MUSCLES[id]?.muscles ?? [];
}

export function bodyLabel(id: string, lang: "fa" | "en"): string {
  return SVG_MUSCLES[id]?.[lang] ?? id;
}

function Figure({
  svg,
  selectedId,
  onSelect,
}: {
  svg: string;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Wire tap targets once per injected SVG.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const groups = root.querySelectorAll<SVGGElement>("svg g[id]");
    const handlers: [SVGGElement, () => void][] = [];
    groups.forEach((g) => {
      if (!SVG_MUSCLES[g.id]) return;
      g.setAttribute("data-tap", "1");
      const fn = () => onSelect(g.id);
      g.addEventListener("click", fn);
      handlers.push([g, fn]);
    });
    return () => handlers.forEach(([g, fn]) => g.removeEventListener("click", fn));
  }, [svg, onSelect]);

  // Reflect the current selection: only the tapped id lights up. The same id
  // may exist in both figures (e.g. traps front+back) — that's the same muscle,
  // so highlighting it in both is correct.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll<SVGGElement>("svg g[id]").forEach((g) => {
      if (!SVG_MUSCLES[g.id]) return;
      g.classList.toggle("mw-active", g.id === selectedId);
    });
  }, [svg, selectedId]);

  return (
    <div
      ref={ref}
      className="mwbody w-1/2"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function BodyMap({
  gender,
  selectedId,
  onSelectId,
  onGenderChange,
}: {
  gender: Gender;
  selectedId: string; // svg muscle id or "All"
  onSelectId: (id: string) => void;
  onGenderChange?: (g: Gender) => void;
}) {
  const { t, lang } = useLang();
  const toggle = (id: string) => onSelectId(selectedId === id ? "All" : id);
  const art = BODY_SVGS[gender];

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-line">
      {/* light illustration panel, like the source site */}
      <div className="relative bg-white px-2 pb-2 pt-12">
        {onGenderChange && (
          <div className="absolute inset-x-0 top-2 z-10 flex justify-center">
            <div className="flex rounded-full bg-[#eef1f7] p-1 shadow-sm ring-1 ring-[#dde2ee]">
              {(["male", "female"] as Gender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => onGenderChange(g)}
                  className={`rounded-full px-4 py-1.5 text-xs font-extrabold transition-colors ${
                    gender === g
                      ? "bg-[#2b3a8f] text-white"
                      : "text-[#5b6579] hover:text-[#2b3a8f]"
                  }`}
                >
                  {g === "male" ? `♂ ${t("common.male")}` : `♀ ${t("common.female")}`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-start justify-center gap-1">
          <Figure svg={art.front} selectedId={selectedId} onSelect={toggle} />
          <Figure svg={art.back} selectedId={selectedId} onSelect={toggle} />
        </div>
        <div className="flex justify-around pt-1 pb-1">
          <span className="text-xs font-semibold text-[#8d97b0]">
            {lang === "fa" ? "جلو" : "Front"}
          </span>
          <span className="text-xs font-semibold text-[#8d97b0]">
            {lang === "fa" ? "پشت" : "Back"}
          </span>
        </div>
      </div>

      {/* status strip */}
      <div className="flex items-center justify-center gap-2 bg-card px-3 py-2.5">
        {selectedId === "All" ? (
          <p className="text-xs font-semibold text-brand">{t("lib.tapBody")}</p>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ee5f7b]/15 px-3 py-1 text-xs font-extrabold text-[#ee5f7b] ring-1 ring-[#ee5f7b]/30">
            {bodyLabel(selectedId, lang)}
            <button
              type="button"
              onClick={() => onSelectId("All")}
              aria-label="clear"
              className="text-[#ee5f7b]/70 hover:text-[#ee5f7b]"
            >
              ✕
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
