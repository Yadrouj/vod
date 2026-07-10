"use client";

import Link from "next/link";
import { useState } from "react";
import ClubLeaderboard from "@/components/ClubLeaderboard";
import SocialFeed from "@/components/SocialFeed";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { PageHeader } from "@/components/ui";

export default function ClubPage() {
  const { lang } = useLang();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="px-4 pb-28 pt-6">
      <PageHeader
        title={lang === "fa" ? "باشگاه رمق" : "Ramagh Club"}
        subtitle={
          lang === "fa"
            ? "استوری بفرست، فعالیتت را به اشتراک بگذار و امتیاز بگیر."
            : "Share stories, post activity, and climb the scoreboard."
        }
        right={
          <Link
            href="/coach-apply"
            className="flex size-10 items-center justify-center rounded-full bg-card text-brand ring-1 ring-line"
            aria-label={lang === "fa" ? "چت مربی" : "Coach chat"}
          >
            <Icon name="message" className="size-5" />
          </Link>
        }
      />

      <div className="mt-4">
        <ClubLeaderboard refreshKey={refreshKey} />
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="users" className="size-4 text-brand" />
          <div>
            <h2 className="text-sm font-bold text-ink">
              {lang === "fa" ? "استوری‌ها و پست‌ها" : "Stories & posts"}
            </h2>
            <p className="text-[11px] text-faint">
              {lang === "fa" ? "هر پست و لایک در رتبه‌بندی حساب می‌شود." : "Every post and like counts."}
            </p>
          </div>
        </div>
        <SocialFeed onPosted={() => setRefreshKey((x) => x + 1)} />
      </div>
    </div>
  );
}
