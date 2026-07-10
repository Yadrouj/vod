import { LogoMark } from "./Logo";

export default function Splash({ label }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-base px-8 text-center">
      <div className="relative">
        <span className="absolute -inset-6 animate-pulse rounded-[2rem] bg-brand/20 blur-2xl" />
        <LogoMark className="relative size-24 drop-shadow-[0_0_28px_rgb(184_242_74/0.42)]" />
      </div>
      <div>
        <p className="text-3xl font-black tracking-tight text-ink">رمق</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-brand">RAMAGH</p>
      </div>
      <span className="h-1.5 w-28 overflow-hidden rounded-full bg-card2 ring-1 ring-line">
        <span className="block h-full w-1/2 animate-[ramagh-load_1.1s_ease-in-out_infinite] rounded-full bg-brand shadow-[0_0_18px_rgb(184_242_74/0.55)]" />
      </span>
      {label && <p className="max-w-xs text-sm font-semibold text-muted">{label}</p>}
    </div>
  );
}
