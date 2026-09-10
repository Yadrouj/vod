"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, type ReactNode } from "react";
import { MusicPlaybackProvider } from "./music-playback-provider";

export function AudienceBoundary({ children, adultChrome, measurementId }: { children: ReactNode; adultChrome: ReactNode; measurementId: string }) {
  const pathname = usePathname();
  const kids = pathname === "/kids" || pathname.startsWith("/kids/");
  useLayoutEffect(() => {
    // Disable an already loaded GA instance as well as avoiding initial loading.
    Object.assign(window, { [`ga-disable-${measurementId}`]: kids });
  }, [kids, measurementId]);
  if (kids) return <>{children}</>;
  return <MusicPlaybackProvider>{children}{adultChrome}</MusicPlaybackProvider>;
}
