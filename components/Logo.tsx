import { cn } from "./ui";

/**
 * Ramagh («رمق» = vitality/energy) brand mark: three rising bars = strength &
 * progressive overload, in the app's phosphor-lime on a rounded tile.
 */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="rmg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d6ff7e" />
          <stop offset="1" stopColor="#7bd93a" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#rmg)" />
      <rect x="7.5" y="18" width="4" height="7" rx="2" fill="#0a1004" />
      <rect x="14" y="12.5" width="4" height="12.5" rx="2" fill="#0a1004" />
      <rect x="20.5" y="7.5" width="4" height="17.5" rx="2" fill="#0a1004" />
    </svg>
  );
}

/** Full lockup: mark + «رمق» wordmark. */
export function Logo({
  className,
  markClass = "size-8",
  text = true,
}: {
  className?: string;
  markClass?: string;
  text?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClass} />
      {text && <span className="text-xl font-extrabold tracking-tight text-ink">رمق</span>}
    </span>
  );
}
