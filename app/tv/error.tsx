"use client";
import Link from "next/link";
export default function TVError({ reset }: { reset: () => void }) {
  return <section className="tv-empty"><h1>اتصال برقرار نشد</h1><p>ارتباط اینترنت را بررسی کن و دوباره تلاش کن.</p><div className="tv-actions"><button className="tv-button tv-button--primary" onClick={reset}>تلاش دوباره</button><Link className="tv-button" href="/tv">خانهٔ تلویزیون</Link></div></section>;
}
