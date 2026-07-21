export function WatchTogetherMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`watch-together-mark ${className}`.trim()}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect className="watch-together-mark-back" x="4.5" y="8.5" width="27" height="22" rx="6.5" />
      <rect className="watch-together-mark-front" x="16.5" y="17.5" width="27" height="22" rx="6.5" />
      <path className="watch-together-mark-play" d="M27 24.75 36 29l-9 4.25v-8.5Z" />
      <path className="watch-together-mark-link" d="M10 35.5c3.5 4.9 10.1 7.2 16.2 5.35" />
      <circle className="watch-together-mark-live" cx="38.5" cy="10" r="3.5" />
    </svg>
  );
}
