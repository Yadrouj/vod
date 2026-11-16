"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, type ReactNode } from "react";
import { MusicPlaybackProvider } from "./music-playback-provider";
import { TelegramMiniAppBridge } from "./telegram-mini-app-bridge";

export function AudienceBoundary({ children, adultChrome, measurementId }: { children: ReactNode; adultChrome: ReactNode; measurementId: string }) {
  const pathname = usePathname();
  const kids = pathname === "/kids" || pathname.startsWith("/kids/");
  const tv = pathname === "/tv" || pathname.startsWith("/tv/");
  useLayoutEffect(() => {
    // Disable an already loaded GA instance as well as avoiding initial loading.
    Object.assign(window, { [`ga-disable-${measurementId}`]: kids });
  }, [kids, measurementId]);
  // TV owns its navigation/player; omit floating website chrome.
  if (kids || tv) return <>{children}</>;
  return <MusicPlaybackProvider><TelegramMiniAppBridge />{children}{adultChrome}</MusicPlaybackProvider>;
}
