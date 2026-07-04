import type { SVGProps } from "react";

// Lightweight Lucide-style stroke icons. Use: <Icon name="home" className="size-5" />
const PATHS: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" />,
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v3M16 3v3" />
    </>
  ),
  library: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
      <path d="M13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13z" />
    </>
  ),
  diet: (
    <>
      <path d="M12 21c-4 0-7-3.5-7-8 0-3 2-5 4.5-5 1.2 0 2 .5 2.5 1 .5-.5 1.3-1 2.5-1C17 8 19 10 19 13c0 4.5-3 8-7 8Z" />
      <path d="M12 8c0-2 1-3.5 3-4" />
    </>
  ),
  history: <path d="M4 7h10M4 12h16M4 17h7" />,
  dumbbell: (
    <>
      <path d="M6.5 6.5v11M4 8.5v7M17.5 6.5v11M20 8.5v7M6.5 12h11" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  play: <path d="M7 4.5 19 12 7 19.5z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  check: <path d="M4 12.5 9 17.5 20 6.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  chevronLeft: <path d="M15 5l-7 7 7 7" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13V9M9 2h6" />
    </>
  ),
  flame: (
    <path d="M12 3c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1 .3-1.8.8-2.5C9 10 9.5 12 11 12c0-2-2-3.5 1-9Z" />
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  refresh: <path d="M20 11a8 8 0 1 0-.6 4M20 5v6h-6" />,
  skip: <path d="M6 5l9 7-9 7zM18 5v14" />,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  scale: (
    <>
      <path d="M12 3a2 2 0 0 0-2 2H6l-3 8a4 4 0 0 0 8 0L8 5" />
      <path d="M12 3a2 2 0 0 1 2 2h4l3 8a4 4 0 0 1-8 0l2-8M12 5v16M7 21h10" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  pill: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(45 12 12)" />
      <path d="M8.5 8.5 15.5 15.5" />
    </>
  ),
  sparkles: (
    <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8zM19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 15h6M8 20h8M12 15v5" />
    </>
  ),
  store: (
    <>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />,
  bell: (
    <>
      <path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2.5H4.5z" />
      <path d="M10.5 21a1.8 1.8 0 0 0 3 0" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L20 8l-4-4L4 16z" />
      <path d="M13 7l4 4" />
    </>
  ),
  // ---- equipment glyphs ----
  barbell: <path d="M2 12h20M5 8v8M8 9.5v5M16 9.5v5M19 8v8" />,
  kettlebell: (
    <>
      <path d="M9 9c0-4 6-4 6 0" />
      <circle cx="12" cy="14.5" r="5.5" />
    </>
  ),
  ball: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M4 9.5c5 2.2 11 2.2 16 0" />
    </>
  ),
  band: (
    <>
      <path d="M5 15.5C8 7.5 16 7.5 19 15.5" />
      <circle cx="5" cy="17" r="1.8" />
      <circle cx="19" cy="17" r="1.8" />
    </>
  ),
  cable: (
    <>
      <path d="M7 3h10M12 3v9" />
      <circle cx="12" cy="16" r="3.5" />
    </>
  ),
  machine: (
    <>
      <path d="M5 3v18M19 3v18M5 8h14" />
      <path d="M9 8v6h6V8" />
    </>
  ),
  plate: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  trx: (
    <>
      <path d="M8 3l3 9M16 3l-3 9M11 12h2" />
      <path d="M9 21l3-7 3 7" />
    </>
  ),
  yoga: (
    <>
      <circle cx="12" cy="5.5" r="2.5" />
      <path d="M6 17c2-4.5 10-4.5 12 0M4 19h16" />
    </>
  ),
  bosu: (
    <>
      <path d="M4 16a8 8 0 0 1 16 0" />
      <path d="M3 16.5h18" />
    </>
  ),
  smith: <path d="M5 3v18M19 3v18M3 21h18M5 10h14M8 10V7M16 10V7" />,
  stretch: <path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4" />,
  heart: (
    <path d="M12 20C5.5 14.5 3 10.5 5 7.5c2-2.6 5.5-2 7 1 1.5-3 5-3.6 7-1 2 3-.5 7-7 12.5Z" />
  ),
  moon: <path d="M20 13.5A8 8 0 1 1 10.5 4 6.5 6.5 0 0 0 20 13.5Z" />,
  pilates: (
    <>
      <path d="M3 17.5h18M6 17.5v-3h9l4 3" />
      <circle cx="8.5" cy="10.5" r="2" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  className,
  ...props
}: { name: IconName; className?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "size-5"}
      aria-hidden="true"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
