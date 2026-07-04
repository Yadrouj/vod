import { Icon } from "./icons";

/** Full-screen branded loading splash (رمق). Presentational — safe in server components. */
export default function Splash({ label }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-base">
      <span className="flex size-20 items-center justify-center rounded-3xl bg-brand text-brandink shadow-2xl shadow-brand/40">
        <Icon name="dumbbell" className="size-11" />
      </span>
      <p className="text-3xl font-extrabold tracking-tight text-ink">رمق</p>
      <div className="size-6 animate-spin rounded-full border-2 border-line border-t-brand" />
      {label && <p className="text-sm text-muted">{label}</p>}
    </div>
  );
}
