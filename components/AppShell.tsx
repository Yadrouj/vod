"use client";

import { usePathname } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { cn } from "@/components/ui";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const cinematic = pathname.startsWith("/vod");
  const admin = pathname.startsWith("/admin");
  const magazine = pathname.startsWith("/mag");

  if (cinematic || admin) {
    return (
      <div className={cn("min-h-dvh text-ink", admin ? "bg-[#090b10]" : "bg-[#050505]")}>
        {children}
      </div>
    );
  }

  if (magazine) {
    return (
      <div
        className={cn(
          "mx-auto min-h-dvh w-full max-w-md bg-base text-ink",
          "shadow-[0_0_60px_-20px_rgb(0_0_0/0.9)]"
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-md flex-col bg-base",
        "shadow-[0_0_60px_-20px_rgb(0_0_0/0.9)]"
      )}
    >
      <AppHeader />
      <main className="flex-1 pb-24">{children}</main>
    </div>
  );
}
