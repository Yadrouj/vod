import Link from "next/link";
import { ArrowUpLeft, Sparkles } from "lucide-react";
import styles from "./discovery-update-strip.module.css";

export function DiscoveryUpdateStrip({ title, description, updatedAt, links, music = false }: {
  title: string; description: string; updatedAt?: string | null; links: { href: string; label: string }[]; music?: boolean;
}) {
  const valid = updatedAt && Number.isFinite(Date.parse(updatedAt));
  return <section className={styles.strip} data-discovery-refresh data-theme={music ? "music" : "cinema"}>
    <div className={styles.copy}><Sparkles size={19} aria-hidden="true" /><div><h2>{title}</h2><p>{description}</p></div>
      {valid && <time dateTime={updatedAt}>{new Intl.DateTimeFormat("fa-IR", { month: "long", day: "numeric", timeZone: "Asia/Tehran" }).format(new Date(updatedAt))}</time>}
    </div>
    <nav aria-label={title}>{links.map(link => <Link href={link.href} key={link.href}>{link.label}<ArrowUpLeft size={15} /></Link>)}</nav>
  </section>;
}
