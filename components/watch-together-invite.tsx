"use client";

import type { Locale } from "@/lib/i18n";
import type { PartyMedia } from "@/lib/watch-party-types";
import { WatchTogetherLauncher } from "@/components/watch-together-launcher";

export function WatchTogetherInvite({
  media,
  locale,
  placement = "inline",
  label,
}: {
  media: PartyMedia;
  locale: Locale;
  placement?: "inline" | "player";
  label?: string;
}) {
  return <WatchTogetherLauncher locale={locale} media={media} placement={placement} label={label} />;
}
