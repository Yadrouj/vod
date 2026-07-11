import Link from "next/link";
import { BRAND_NAME, BRAND_NAME_FA, BRAND_SLOGAN, BRAND_SLOGAN_FA } from "@/lib/brand";
import type { Locale } from "@/lib/i18n";

type BrandLogoProps = {
  locale: Locale;
  className?: string;
  compact?: boolean;
  showSlogan?: boolean;
  href?: string;
};

export function BrandLogo({
  locale,
  className,
  compact = false,
  showSlogan = true,
  href = "/",
}: BrandLogoProps) {
  const isFa = locale === "fa";
  const label = isFa ? BRAND_NAME_FA : BRAND_NAME;
  const slogan = isFa ? BRAND_SLOGAN_FA : BRAND_SLOGAN;

  return (
    <Link
      className={["brand-logo", compact ? "brand-logo-compact" : "", className ?? ""].filter(Boolean).join(" ")}
      href={href}
      aria-label={label}
    >
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 64 64" role="img">
          <path
            fill="currentColor"
            d="M32 4c11.6 10.6 18 22.2 18 34.1 0 12.1-7.6 20.2-18 21.9-10.4-1.7-18-9.8-18-21.9C14 26.2 20.4 14.6 32 4Z"
          />
          <path fill="#050505" d="M30 25.2 43.4 32 30 38.8V25.2Z" />
          <path fill="#050505" fillOpacity="0.22" d="M31.8 10.8c4.9 8.3 7.5 17.1 7.5 26.4 0 7.6-2.4 13.8-7.3 18.5 8.6-2 13.6-8.5 13.6-17.5 0-9.6-4.8-18.8-13.8-27.4Z" />
        </svg>
      </span>
      <span className="brand-copy">
        <span className="brand-word">{label}</span>
        {showSlogan && !compact && <span className="brand-slogan">{slogan}</span>}
      </span>
    </Link>
  );
}
