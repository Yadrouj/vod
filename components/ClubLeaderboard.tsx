"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import UserAvatar from "./UserAvatar";
import { useLang } from "./LangProvider";
import { fetchLeaderboard, type LeaderboardRow } from "@/lib/social";

export default function ClubLeaderboard({ refreshKey = 0 }: { refreshKey?: number }) {
  const { lang, n } = useLang();
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    fetchLeaderboard().then(setRows).catch(() => setRows([]));
  }, [refreshKey]);

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <Icon name="trophy" className="size-4 text-brand" />
          {lang === "fa" ? "جدول امتیاز باشگاه" : "Club scoreboard"}
        </h2>
        <span className="rounded-full bg-card2 px-2 py-0.5 text-[10px] font-bold text-faint ring-1 ring-line">
          {lang === "fa" ? "استوری + فعالیت + لایک" : "stories + activity + likes"}
        </span>
      </div>

      <div className="mt-2 rounded-2xl bg-card p-3 ring-1 ring-line">
        {rows == null && <p className="py-4 text-center text-xs text-muted">...</p>}
        {rows?.length === 0 && (
          <p className="py-4 text-center text-xs text-muted">
            {lang === "fa" ? "هنوز امتیازی ثبت نشده." : "No scores yet."}
          </p>
        )}
        {rows?.map((row, index) => (
          <div
            key={row.userId}
            className="flex items-center gap-3 border-b border-line/60 py-2 last:border-b-0"
          >
            <span className="tnum w-6 text-center text-sm font-extrabold text-brand">
              {n(index + 1)}
            </span>
            <UserAvatar avatarId={row.avatarId} skin={row.skin} size="size-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{row.name}</p>
              <p className="text-[10px] text-faint">
                {lang === "fa"
                  ? `${n(row.posts)} پست · ${n(row.likes)} لایک · ${n(row.stories)} استوری`
                  : `${row.posts} posts · ${row.likes} likes · ${row.stories} stories`}
              </p>
            </div>
            <span className="rounded-full bg-brand/15 px-2.5 py-1 text-xs font-extrabold text-brand">
              {n(row.score)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
