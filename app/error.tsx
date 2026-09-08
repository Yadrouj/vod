"use client";
import { useEffect } from "react";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { window.dispatchEvent(new Event("sarvnema:navigation-error")); }, []);
  return <main className="route-loading-shell" dir="rtl"><h1>صفحه دریافت نشد</h1><p>ممکن است اتصال قطع شده یا سرور شلوغ باشد. کمی صبر کنید و دوباره تلاش کنید.</p><button type="button" onClick={reset}>تلاش دوباره</button></main>;
}
