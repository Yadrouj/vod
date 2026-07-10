"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/db";
import { syncCurrentUser } from "@/lib/authClient";
import { useAccount } from "@/lib/hooks";
import { showInAppMessage } from "./InAppMessages";

export default function AccountStatusSync() {
  const account = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const shownMessageAt = useRef<number | null>(null);

  useEffect(() => {
    if (!account?.token) return;
    let alive = true;
    const run = () => {
      syncCurrentUser()
        .then(async (user) => {
          if (!alive || !user) return;
          if (user.restricted) {
            showInAppMessage({
              tone: "danger",
              title: "Account restricted",
              body: user.adminMessage || "Your account is restricted.",
            });
            await signOut();
            router.push("/login");
            return;
          }
          if (
            user.adminMessage &&
            user.adminMessageAt &&
            user.adminMessageAt !== shownMessageAt.current
          ) {
            shownMessageAt.current = user.adminMessageAt;
            showInAppMessage({
              tone: "info",
              title: "Admin message",
              body: user.adminMessage,
            });
          }
        })
        .catch(() => undefined);
    };
    const id = window.setTimeout(run, 0);
    const interval = window.setInterval(run, 60_000);
    return () => {
      alive = false;
      window.clearTimeout(id);
      window.clearInterval(interval);
    };
  }, [account?.token, router, pathname]);

  return null;
}
