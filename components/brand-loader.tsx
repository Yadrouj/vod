import { BRAND_MARK, BRAND_NAME } from "@/lib/brand";

export function BrandLoader({
  label = "Loading",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div className={["brand-loader", compact ? "brand-loader-compact" : ""].filter(Boolean).join(" ")} role="status" aria-live="polite">
      <span className="brand-loader-orbit" aria-hidden="true">
        <span className="brand-loader-mark" style={{ backgroundImage: `url(${BRAND_MARK})` }} />
        <span className="brand-loader-play" />
      </span>
      <span className="brand-loader-copy">
        <strong>{BRAND_NAME}</strong>
        <small>{label}</small>
      </span>
    </div>
  );
}
