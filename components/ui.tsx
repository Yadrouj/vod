"use client";

// Shared UI primitives — dark fitness theme.

import type { ReactNode } from "react";
import { useLang } from "./LangProvider";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card ring-1 ring-line/70 shadow-lg shadow-black/20",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Chip({
  label,
  active,
  onClick,
  className,
}: {
  label: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 whitespace-nowrap rounded-full px-3 text-xs font-bold transition-all duration-150 active:scale-[0.96]",
        active
          ? "bg-brand text-brandink shadow-[0_2px_10px_-2px_rgb(184_242_74/0.5)] hover:bg-brand3"
          : "bg-card2 text-muted ring-1 ring-line hover:bg-card3 hover:text-ink hover:ring-line2",
        className
      )}
    >
      {label}
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-2xl bg-base2 p-1 ring-1 ring-line">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "h-9 flex-1 rounded-xl px-2.5 text-[13px] font-bold transition-colors duration-200",
            value === o.value
              ? "bg-brand text-brandink shadow-[0_1px_6px_rgb(184_242_74/0.3)]"
              : "text-muted hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3"
    >
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          checked ? "bg-brand" : "bg-line"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </span>
      {label && <span className="text-sm font-medium text-ink">{label}</span>}
    </button>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  className,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const styles = {
    primary:
      "bg-brand text-brandink shadow-[0_8px_28px_-8px_rgb(184_242_74/0.45)] hover:bg-brand3 active:bg-brand2 active:shadow-none disabled:bg-card2 disabled:text-faint disabled:shadow-none",
    secondary:
      "bg-card2 text-ink ring-1 ring-line hover:bg-card3 hover:ring-line2 active:bg-card disabled:text-faint disabled:ring-line/50",
    ghost: "text-muted hover:bg-card hover:text-ink active:bg-card2 disabled:text-faint",
    danger:
      "bg-danger-dim text-danger ring-1 ring-danger/25 hover:bg-danger/20 hover:ring-danger/40 active:bg-danger/25 disabled:opacity-40",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl px-4 text-[13px] font-bold transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] disabled:pointer-events-none",
        styles,
        className
      )}
    >
      {children}
    </button>
  );
}

export function Spinner({ label }: { label?: string }) {
  const { t } = useLang();
  const text = label ?? t("common.loading");
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted">
      <div className="size-8 animate-spin rounded-full border-2 border-line border-t-brand" />
      {text && <p className="text-sm">{text}</p>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  children,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-card/40 px-6 py-8 text-center">
      {icon && <div className="text-brand">{icon}</div>}
      <p className="font-bold text-ink">{title}</p>
      {hint && <p className="max-w-xs text-sm text-muted">{hint}</p>}
      {children}
    </div>
  );
}
