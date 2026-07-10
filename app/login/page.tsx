"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Segmented } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LogoMark } from "@/components/Logo";
import { useLang } from "@/components/LangProvider";
import { applyAuthPayload } from "@/lib/authClient";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { lang } = useLang();
  const fa = lang === "fa";
  const [mode, setMode] = useState<"signin" | "signup">(
    params.get("mode") === "signup" ? "signup" : "signin"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const cleanEmail = email.trim().toLowerCase();
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
    if (!okEmail || password.length < 6 || (mode === "signup" && name.trim().length < 2)) {
      setError(fa ? "نام، ایمیل و رمز عبور حداقل ۶ کاراکتر را کامل کن." : "Complete name, email, and a password of at least 6 characters.");
      return;
    }
    if (mode === "signup" && password !== confirm) {
      setError(fa ? "تکرار رمز عبور یکسان نیست." : "Password confirmation does not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          name: name.trim(),
          email: cleanEmail,
          password,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "exists") {
          setError(fa ? "این ایمیل قبلا ثبت شده است. وارد حساب شو." : "This email is already registered. Sign in instead.");
        } else if (json.error === "restricted") {
          setError(json.user?.adminMessage || (fa ? "حساب شما محدود شده است." : "Your account has been restricted."));
        } else {
          setError(fa ? "ایمیل یا رمز عبور درست نیست." : "Email or password is incorrect.");
        }
        return;
      }
      await applyAuthPayload(json);
      router.push(params.get("next") || "/profile");
    } catch {
      setError(fa ? "اتصال برقرار نشد. دوباره تلاش کن." : "Could not connect. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh px-6 pb-10 pt-14">
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-3">
          <LogoMark className="size-14 drop-shadow-[0_0_18px_rgb(184_242_74/0.35)]" />
          <div>
            <p className="text-2xl font-extrabold text-ink">{fa ? "رمق" : "Ramagh"}</p>
            <p className="text-xs text-muted">
              {fa ? "حساب کاربری، VIP و برنامه‌های شخصی" : "Account, VIP, and personal plans"}
            </p>
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-extrabold text-ink">
          {mode === "signup" ? (fa ? "ساخت حساب" : "Create Account") : fa ? "ورود به حساب" : "Sign In"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {fa
            ? "برای استفاده از قابلیت‌های VIP، چت خصوصی و مدیریت برنامه‌ها با ایمیل و رمز عبور وارد شو."
            : "Use email and password to access VIP features, private chat, and saved plans."}
        </p>

        <div className="mt-6 space-y-5 rounded-3xl bg-card p-5 ring-1 ring-line">
          <Segmented
            value={mode}
            onChange={(v) => {
              setMode(v);
              setError(null);
            }}
            options={[
              { value: "signin", label: fa ? "ورود" : "Sign in" },
              { value: "signup", label: fa ? "ثبت نام" : "Sign up" },
            ]}
          />

          {mode === "signup" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={fa ? "نام کامل" : "Full name"}
              className="h-12 w-full rounded-xl bg-base2 px-4 text-sm font-semibold text-ink ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand"
            />
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={fa ? "ایمیل" : "Email"}
            type="email"
            dir="ltr"
            className="h-12 w-full rounded-xl bg-base2 px-4 text-sm font-semibold text-ink ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={fa ? "رمز عبور" : "Password"}
            type="password"
            dir="ltr"
            className="h-12 w-full rounded-xl bg-base2 px-4 text-sm font-semibold text-ink ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {mode === "signup" && (
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={fa ? "تکرار رمز عبور" : "Confirm password"}
              type="password"
              dir="ltr"
              className="h-12 w-full rounded-xl bg-base2 px-4 text-sm font-semibold text-ink ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand"
            />
          )}

          {error && <p className="rounded-xl bg-danger-dim p-3 text-xs font-bold text-danger ring-1 ring-danger/25">{error}</p>}

          <Button className="w-full" onClick={submit} disabled={busy}>
            <Icon name={mode === "signup" ? "plus" : "user"} className="size-4" />
            {busy
              ? fa
                ? "در حال انجام..."
                : "Working..."
              : mode === "signup"
              ? fa
                ? "ساخت حساب"
                : "Create account"
              : fa
              ? "ورود"
              : "Sign in"}
          </Button>

          <p className="text-center text-[11px] leading-relaxed text-faint">
            {fa
              ? "اولین حسابی که در این نصب ساخته شود، نقش مدیر می‌گیرد و می‌تواند از پنل ادمین کاربران را مدیریت کند."
              : "The first account created on this install becomes admin and can manage users from the admin panel."}
          </p>
        </div>
      </div>
    </div>
  );
}
