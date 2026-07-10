function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ramagh-tile" x1="7" y1="5" x2="57" y2="59" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f4ff9f" />
          <stop offset="0.48" stopColor="#b9ff4f" />
          <stop offset="1" stopColor="#48d44d" />
        </linearGradient>
        <linearGradient id="ramagh-ink" x1="18" y1="16" x2="46" y2="51" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#151b28" />
          <stop offset="1" stopColor="#05070d" />
        </linearGradient>
        <filter id="ramagh-soft-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.4" floodColor="#051009" floodOpacity="0.22" />
        </filter>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="17" fill="url(#ramagh-tile)" />
      <g filter="url(#ramagh-soft-shadow)">
        <path d="M12 30h40" fill="none" stroke="#05070d" strokeWidth="5.6" strokeLinecap="round" />
        <rect x="8" y="22" width="7.6" height="16" rx="3.8" fill="#05070d" />
        <rect x="48.4" y="22" width="7.6" height="16" rx="3.8" fill="#05070d" />
        <circle cx="32" cy="20.2" r="6.1" fill="url(#ramagh-ink)" />
        <path d="M18.8 48c.5-10 6-16.3 13.2-16.3S44.7 38 45.2 48v2H18.8v-2Z" fill="url(#ramagh-ink)" />
        <path
          d="M21.5 39.7h5.4l2.4-5.8 5.2 12.2 2.9-6.4h5.1"
          fill="none"
          stroke="#caff61"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <path d="M19 53h26" fill="none" stroke="#05070d" strokeWidth="3" strokeLinecap="round" opacity="0.14" />
    </svg>
  );
}

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
    <span className={cx("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClass} />
      {text && (
        <span className="text-xl font-black tracking-tight text-ink" aria-label="رمق">
          رمق
        </span>
      )}
    </span>
  );
}
