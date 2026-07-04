"use client";

// Counts visits per app section into Dexie — powers the /admin usage stats.

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackSection } from "@/lib/db";

export default function SectionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const section = pathname === "/" ? "home" : pathname.split("/")[1];
    if (section === "admin") return; // don't count the admin itself
    trackSection(section).catch(() => {});
  }, [pathname]);

  return null;
}
