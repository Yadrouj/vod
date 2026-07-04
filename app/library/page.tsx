"use client";

import { useState } from "react";
import ExerciseBrowser from "@/components/ExerciseBrowser";
import BodyMap, { bodyMuscles } from "@/components/BodyMap";
import { PageHeader } from "@/components/ui";
import { useLang } from "@/components/LangProvider";
import { DEFAULT_SETTINGS, saveSettings } from "@/lib/db";
import { useSettings } from "@/lib/hooks";

export default function LibraryPage() {
  const { t } = useLang();
  const settings = useSettings() ?? DEFAULT_SETTINGS;
  const [group, setGroup] = useState("All");
  const [muscleId, setMuscleId] = useState("All");

  return (
    <div className="px-4 pt-6">
      <PageHeader title={t("lib.title")} subtitle={t("lib.subtitle")} />

      <div className="mt-4">
        <BodyMap
          gender={settings.gender}
          selectedId={muscleId}
          onSelectId={(id) => {
            setMuscleId(id);
            setGroup("All");
          }}
          onGenderChange={(g) => saveSettings({ gender: g })}
        />
      </div>

      <div className="mt-4">
        <ExerciseBrowser
          settings={settings}
          onSettingsChange={saveSettings}
          hrefFor={(ex) => `/library/${ex.slug}`}
          group={group}
          onGroupChange={(g) => {
            setGroup(g);
            setMuscleId("All");
          }}
          muscleFilter={muscleId === "All" ? null : bodyMuscles(muscleId)}
          hideGender
        />
      </div>
    </div>
  );
}
