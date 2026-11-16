import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale } from "@/lib/server-locale";
import { TVShell } from "@/components/tv/tv-shell";
import "./tv.css";

export const metadata: Metadata = { title: "SarvNema TV | سرونما برای تلویزیون", robots: { index: false, follow: true } };
export default async function TVLayout({ children }: { children: ReactNode }) {
  return <TVShell locale={await getLocale()}>{children}</TVShell>;
}
