"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSettings } from "@/lib/hooks";
import type { AppTheme } from "@/lib/types";

export const THEME_STORAGE_KEY = "ramagh-theme";
const THEMES: AppTheme[] = ["classic", "minimal"];

export function normalizeTheme(theme: unknown): AppTheme {
  return THEMES.includes(theme as AppTheme) ? (theme as AppTheme) : "classic";
}

export function applyAppTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = "dark";
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function setAppTheme(theme: AppTheme) {
  applyAppTheme(theme);
  window.dispatchEvent(new CustomEvent("ramagh-theme-change", { detail: theme }));
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const [localTheme, setLocalTheme] = useState<AppTheme>(() =>
    typeof window === "undefined"
      ? "classic"
      : normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY))
  );
  const theme = normalizeTheme(settings?.theme ?? localTheme);

  useEffect(() => {
    function onThemeChange(event: Event) {
      const next = normalizeTheme((event as CustomEvent).detail);
      setLocalTheme(next);
      applyAppTheme(next);
    }

    window.addEventListener("ramagh-theme-change", onThemeChange);
    return () => window.removeEventListener("ramagh-theme-change", onThemeChange);
  }, []);

  useEffect(() => {
    applyAppTheme(theme);
  }, [theme]);

  return children;
}
