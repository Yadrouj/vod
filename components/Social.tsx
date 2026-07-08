"use client";

import Link from "next/link";
import { Icon } from "./icons";
import UserAvatar from "./UserAvatar";
import { useLang } from "./LangProvider";
import { cn } from "./ui";
import { timeAgo } from "@/lib/social";

/** Star rating — read-only (fractional) or interactive (tap to set). */
export function Stars({
  value,
  onChange,
  size = "size-4",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: string;
}) {
  const interactive = Boolean(onChange);
  return (
    <div className="inline-flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = value >= i - 0.25;
        const star = (
          <Icon
            name="star"
            className={cn(size, filled ? "text-amber-400" : "text-line2")}
          />
        );
        return interactive ? (
          <button key={i} type="button" onClick={() => onChange!(i)} aria-label={`${i}`} className="active:scale-90">
            {star}
          </button>
        ) : (
          <span key={i}>{star}</span>
        );
      })}
    </div>
  );
}

/** Avatar + username + relative time. */
export function AuthorRow({
  name,
  avatarId,
  skin,
  at,
  size = "size-9",
}: {
  name: string;
  avatarId: number;
  skin: string;
  at?: number;
  size?: string;
}) {
  const { lang } = useLang();
  return (
    <div className="flex items-center gap-2">
      <UserAvatar avatarId={avatarId} skin={skin} size={size} />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-ink">{name}</p>
        {at != null && <p className="text-[10px] text-faint">{timeAgo(at, lang)}</p>}
      </div>
    </div>
  );
}

/** Prompt shown when the user hasn't created a social profile yet. */
export function SocialGate() {
  const { t } = useLang();
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card/50 p-4 text-center">
      <Icon name="users" className="mx-auto size-7 text-brand" />
      <p className="mt-2 text-sm font-bold text-ink">{t("soc.needAccount")}</p>
      <Link
        href="/profile"
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-bold text-brandink"
      >
        <Icon name="user" className="size-4" /> {t("soc.goProfile")}
      </Link>
    </div>
  );
}
