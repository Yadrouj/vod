"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, Segmented } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { saveAccount } from "@/lib/db";
import { useUsage } from "@/lib/hooks";
import { FREE_USAGE_LIMIT } from "@/lib/db";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleCredentialResponse {
  credential: string;
}

/** Decode the payload of a Google ID token (JWT) without verification —
 * fine for a local-first app where the token is used only to read profile info. */
function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const base64 = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(base64))));
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const usage = useUsage();
  const gsiRef = useRef<HTMLDivElement>(null);
  const [gsiReady, setGsiReady] = useState(false);
  const [gsiSlow, setGsiSlow] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  // null = user hasn't chosen yet → default follows the limit banner.
  const [modeChoice, setModeChoice] = useState<"signin" | "signup" | null>(null);

  // The GSI script/button can be slow or blocked (or the origin not yet
  // authorized in Google Console) — if nothing rendered after 8s, say so
  // instead of leaving a blank area.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const timer = setTimeout(() => {
      if (!gsiRef.current || gsiRef.current.childElementCount === 0) {
        setGsiSlow(true);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const limitReached = (usage?.count ?? 0) >= FREE_USAGE_LIMIT;
  const mode: "signin" | "signup" =
    modeChoice ?? (limitReached ? "signup" : "signin");

  useEffect(() => {
    if (!gsiReady || !GOOGLE_CLIENT_ID || !gsiRef.current) return;
    type GsiWindow = typeof window & {
      google?: {
        accounts: {
          id: {
            initialize: (o: object) => void;
            renderButton: (el: HTMLElement, o: object) => void;
          };
        };
      };
    };
    const g = (window as GsiWindow).google;
    if (!g) return;
    g.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (res: GoogleCredentialResponse) => {
        const p = decodeJwtPayload(res.credential);
        if (!p?.email) return;
        await saveAccount({
          provider: "google",
          email: String(p.email),
          name: String(p.name ?? p.email),
          picture: typeof p.picture === "string" ? p.picture : null,
        });
        router.push("/profile");
      },
    });
    g.accounts.id.renderButton(gsiRef.current, {
      theme: "filled_black",
      size: "large",
      shape: "pill",
      width: 320,
      text: "continue_with",
      locale: lang === "fa" ? "fa" : "en",
    });
  }, [gsiReady, lang, router]);

  async function createLocal() {
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!name.trim() || !okEmail) {
      setError(t("login.invalid"));
      return;
    }
    await saveAccount({
      provider: "local",
      email: email.trim(),
      name: name.trim(),
      picture: null,
    });
    router.push("/profile");
  }

  async function signInLocal() {
    const trimmed = email.trim();
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!okEmail) {
      setError(t("login.invalid"));
      return;
    }
    await saveAccount({
      provider: "local",
      email: trimmed,
      name: trimmed.split("@")[0],
      picture: null,
    });
    router.push("/profile");
  }

  return (
    <div className="min-h-dvh px-6 pb-10 pt-14">
      {GOOGLE_CLIENT_ID && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => setGsiReady(true)}
        />
      )}

      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand text-brandink shadow-lg shadow-brand/30">
            <Icon name="dumbbell" className="size-8" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-ink">{t("app.name")}</p>
            <p className="text-xs text-muted">{t("app.tagline")}</p>
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-extrabold text-ink">{t("login.title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("login.subtitle")}</p>

        {limitReached && (
          <div className="mt-4 rounded-2xl bg-warn-dim p-4 text-sm font-semibold text-warn ring-1 ring-warn/25">
            {t("login.limitBanner")}
          </div>
        )}

        <div className="mt-6 space-y-5 rounded-3xl bg-card p-5 ring-1 ring-line">
          {/* Sign-in / sign-up mode */}
          <Segmented
            value={mode}
            onChange={(v) => {
              setModeChoice(v);
              setError(null);
            }}
            options={[
              { value: "signin", label: t("login.signin") },
              { value: "signup", label: t("login.signup") },
            ]}
          />

          {/* Google */}
          {GOOGLE_CLIENT_ID ? (
            <div>
              <div ref={gsiRef} className="flex min-h-11 justify-center" />
              {gsiSlow && (
                <p className="mt-2 text-center text-xs text-faint">
                  {t("login.gsiSlow")}
                </p>
              )}
            </div>
          ) : (
            <p className="rounded-xl bg-base2 p-3 text-xs text-faint ring-1 ring-line">
              {t("login.googleUnavailable")}
            </p>
          )}

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs font-bold text-faint">{t("login.or")}</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {/* Local account */}
          <div className="space-y-3">
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("login.name")}
                className="h-12 w-full rounded-xl bg-base2 px-4 text-sm font-semibold text-ink ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand"
              />
            )}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("login.email")}
              type="email"
              dir="ltr"
              className="h-12 w-full rounded-xl bg-base2 px-4 text-sm font-semibold text-ink ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {error && <p className="text-xs font-semibold text-danger">{error}</p>}
            {mode === "signup" ? (
              <Button className="w-full" onClick={createLocal}>
                {t("login.create")}
              </Button>
            ) : (
              <Button className="w-full" onClick={signInLocal}>
                {t("login.signin")}
              </Button>
            )}
          </div>
        </div>

        {!limitReached && (
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 w-full py-2 text-center text-sm font-semibold text-faint"
          >
            {t("login.later")}
          </button>
        )}
      </div>
    </div>
  );
}
