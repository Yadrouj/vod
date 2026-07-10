"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Exercise, Gender, Settings, ViewMode } from "@/lib/types";
import { useExercises, useFilters } from "@/lib/exercises";
import {
  FOCUS_GROUPS,
  levelAllows,
  matchesView,
  musclesForFocus,
} from "@/lib/taxonomy";
import { useLang } from "./LangProvider";
import { tEquip, tFocus } from "@/lib/i18n";
import { Button, Chip, Segmented, Spinner, cn } from "./ui";
import { Icon, type IconName } from "./icons";
import ExerciseCard from "./ExerciseCard";

const PAGE = 40;

// Which equipment you can realistically train with at home vs. what needs a gym.
const HOME_EQUIP = new Set([
  "Bodyweight", "Dumbbells", "Kettlebells", "Band", "TRX", "Medicine-Ball",
  "Medicineball", "Bosu-Ball", "Yoga", "Pilates", "Stretches", "Recovery", "Cardio",
]);
const GYM_EQUIP = new Set([
  "Barbell", "Machine", "Cables", "Smith-Machine", "Plate", "Vitruvian",
]);
type Place = "all" | "home" | "gym";

// MuscleWiki's equipment ordering + icon per category.
const EQUIP_META: { key: string; icon: IconName }[] = [
  { key: "Barbell", icon: "barbell" },
  { key: "Dumbbells", icon: "dumbbell" },
  { key: "Bodyweight", icon: "user" },
  { key: "Machine", icon: "machine" },
  { key: "Medicine-Ball", icon: "ball" },
  { key: "Medicineball", icon: "ball" },
  { key: "Kettlebells", icon: "kettlebell" },
  { key: "Stretches", icon: "stretch" },
  { key: "Cables", icon: "cable" },
  { key: "Band", icon: "band" },
  { key: "Plate", icon: "plate" },
  { key: "TRX", icon: "trx" },
  { key: "Yoga", icon: "yoga" },
  { key: "Bosu-Ball", icon: "bosu" },
  { key: "Cardio", icon: "heart" },
  { key: "Smith-Machine", icon: "smith" },
  { key: "Recovery", icon: "moon" },
  { key: "Pilates", icon: "pilates" },
  { key: "Vitruvian", icon: "machine" },
];

export default function ExerciseBrowser({
  settings,
  onSettingsChange,
  hrefFor,
  onPick,
  accessoryFor,
  initialFocus,
  group: controlledGroup,
  onGroupChange,
  muscleFilter,
  hideGender = false,
}: {
  settings: Settings;
  onSettingsChange?: (patch: Partial<Settings>) => void;
  hrefFor?: (ex: Exercise) => string;
  onPick?: (ex: Exercise) => void;
  accessoryFor?: (ex: Exercise) => ReactNode;
  initialFocus?: string[];
  group?: string;
  onGroupChange?: (g: string) => void;
  muscleFilter?: string[] | null;
  hideGender?: boolean;
}) {
  const { t, lang } = useLang();
  const { index, error } = useExercises();
  const filters = useFilters();

  const [q, setQ] = useState("");
  const [gender, setGender] = useState<Gender>(settings.gender);
  const [view, setView] = useState<ViewMode>(settings.view);
  const [equip, setEquip] = useState<string>("All");
  const [place, setPlace] = useState<Place>("all");
  const [equipOpen, setEquipOpen] = useState(true);
  const [innerGroup, setInnerGroup] = useState<string>(initialFocus?.[0] ?? "All");
  const [limit, setLimit] = useState(PAGE);

  const group = controlledGroup ?? innerGroup;
  const setGroup = onGroupChange ?? setInnerGroup;

  const results = useMemo(() => {
    if (!index) return [];
    const query = q.trim().toLowerCase();
    const muscles = muscleFilter && muscleFilter.length > 0 ? muscleFilter : null;
    const groupMuscles =
      muscles || group === "All" ? null : musclesForFocus([group]);
    const filtered = index.all.filter((ex) => {
      if (!matchesView(ex.category, view)) return false;
      if (!levelAllows(settings.level, ex.difficulty)) return false;
      if (place === "home" && !HOME_EQUIP.has(ex.category)) return false;
      if (place === "gym" && !GYM_EQUIP.has(ex.category)) return false;
      if (equip !== "All" && ex.category !== equip) return false;
      if (muscles && !ex.primaryMuscles.some((m) => muscles.includes(m)))
        return false;
      if (groupMuscles && !ex.primaryMuscles.some((m) => groupMuscles.has(m)))
        return false;
      if (query && !ex.name.toLowerCase().includes(query)) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      const av = a.videos[gender].length ? 0 : 1;
      const bv = b.videos[gender].length ? 0 : 1;
      if (av !== bv) return av - bv;
      return a.name.localeCompare(b.name);
    });
  }, [index, q, view, equip, place, group, muscleFilter, settings.level, gender]);

  useEffect(() => {
    const id = window.setTimeout(() => setLimit(PAGE), 0);
    return () => window.clearTimeout(id);
  }, [q, view, equip, place, group, muscleFilter]);

  function changeGender(g: Gender) {
    setGender(g);
    onSettingsChange?.({ gender: g });
  }
  function changeView(v: ViewMode) {
    setView(v);
    onSettingsChange?.({ view: v });
  }

  if (error) {
    return <p className="p-6 text-center text-sm text-rose-300">{t("lib.loadError")}</p>;
  }
  if (!index || !filters) return <Spinner />;

  const shown = results.slice(0, limit);
  // MuscleWiki order, limited to categories that actually exist in the dataset.
  const available = new Set(filters.equipment);
  const equipList = EQUIP_META.filter((e) => available.has(e.key));

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("lib.search")}
        className="w-full rounded-xl bg-card2 px-4 py-2.5 text-sm text-ink outline-none ring-1 ring-line placeholder:text-faint focus:ring-2 focus:ring-brand"
      />

      <div className={cn("grid gap-2", hideGender ? "grid-cols-1" : "grid-cols-2")}>
        {!hideGender && (
          <Segmented
            value={gender}
            onChange={changeGender}
            options={[
              { value: "male", label: `♂ ${t("common.male")}` },
              { value: "female", label: `♀ ${t("common.female")}` },
            ]}
          />
        )}
        <Segmented
          value={view}
          onChange={changeView}
          options={[
            { value: "strength", label: t("ob.muscles") },
            { value: "mobility", label: t("ob.joints") },
          ]}
        />
      </div>

      {/* where you train — home vs gym */}
      <Segmented
        value={place}
        onChange={setPlace}
        options={[
          { value: "all", label: t("lib.locAll") },
          { value: "home", label: t("lib.locHome") },
          { value: "gym", label: t("lib.locGym") },
        ]}
      />

      {/* body-part chips */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5">
        <Chip label={t("lib.allParts")} active={group === "All"} onClick={() => setGroup("All")} />
        {FOCUS_GROUPS.map((g) => (
          <Chip
            key={g.name}
            label={tFocus(lang, g.name)}
            active={group === g.name}
            onClick={() => setGroup(g.name)}
          />
        ))}
      </div>

      {/* Equipment — MuscleWiki-style two-column category grid */}
      <div className="rounded-2xl bg-card p-4 ring-1 ring-line">
        <button
          type="button"
          onClick={() => setEquipOpen((o) => !o)}
          className="flex w-full items-center justify-between"
        >
          <h3 className="text-sm font-extrabold text-ink">{t("lib.equipment")}</h3>
          <span className="flex size-7 items-center justify-center rounded-full bg-card2 text-muted ring-1 ring-line">
            <Icon name={equipOpen ? "minus" : "plus"} className="size-3.5" />
          </span>
        </button>

        {equipOpen && (
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
            <EquipRow
              icon="sparkles"
              label={t("lib.allGear")}
              checked={equip === "All"}
              onClick={() => setEquip("All")}
            />
            {equipList.map((e) => (
              <EquipRow
                key={e.key}
                icon={e.icon}
                label={tEquip(lang, e.key)}
                checked={equip === e.key}
                onClick={() => setEquip(equip === e.key ? "All" : e.key)}
              />
            ))}
          </div>
        )}
        {!equipOpen && equip !== "All" && (
          <p className="mt-2 text-xs font-bold text-brand">{tEquip(lang, equip)}</p>
        )}
      </div>

      <p className="px-1 text-xs text-faint">{t("lib.countN", { n: results.length })}</p>

      <div className="space-y-2">
        {shown.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            href={hrefFor ? hrefFor(ex) : undefined}
            onClick={onPick ? () => onPick(ex) : undefined}
            accessory={accessoryFor ? accessoryFor(ex) : undefined}
          />
        ))}
        {shown.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">{t("lib.noMatch")}</p>
        )}
      </div>

      {limit < results.length && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => setLimit((l) => l + PAGE)}
        >
          {t("lib.showMore", { n: results.length - limit })}
        </Button>
      )}
    </div>
  );
}

function EquipRow({
  icon,
  label,
  checked,
  onClick,
}: {
  icon: IconName;
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-start transition-colors hover:bg-card2"
    >
      <span
        className={cn(
          "flex size-5 flex-shrink-0 items-center justify-center rounded-md ring-1 transition-colors",
          checked ? "bg-brand ring-brand" : "bg-base2 ring-line"
        )}
      >
        {checked && <Icon name="check" className="size-3 text-brandink" />}
      </span>
      <Icon name={icon} className={cn("size-5 flex-shrink-0", checked ? "text-brand" : "text-muted")} />
      <span className={cn("truncate text-sm font-bold", checked ? "text-ink" : "text-muted")}>
        {label}
      </span>
    </button>
  );
}
