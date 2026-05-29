"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "akqaretro-theme";

function getStored(): Theme {
  if (typeof window === "undefined") return "system";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

function applyTheme(theme: Theme) {
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (isDark) document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(getStored());
    setMounted(true);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
    applyTheme(next);
  }, []);

  if (!mounted) {
    return (
      <span
        className="akqaretro-theme-toggle akqaretro-theme-toggle--placeholder w-9 h-9 inline-block text-[var(--akqa-muted)]"
        aria-hidden
      />
    );
  }

  const cycle = () => {
    const order: Theme[] = ["light", "dark", "system"];
    const i = order.indexOf(theme);
    setTheme(order[(i + 1) % order.length]);
  };

  const label =
    theme === "light"
      ? "Light mode (switch to dark)"
      : theme === "dark"
        ? "Dark mode (switch to light)"
        : "System theme (switch to light)";

  return (
    <button
      type="button"
      onClick={cycle}
      className="akqaretro-theme-toggle flex items-center justify-center w-9 h-9 rounded border border-[var(--akqa-border)] bg-[var(--surface-elevated)] text-[var(--akqa-muted)] hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)]"
      aria-label={label}
      title={label}
    >
      {theme === "light" && (
        <span className="akqaretro-theme-toggle__icon" aria-hidden>
          ☀
        </span>
      )}
      {theme === "dark" && (
        <span className="akqaretro-theme-toggle__icon" aria-hidden>
          ☽
        </span>
      )}
      {theme === "system" && (
        <span className="akqaretro-theme-toggle__icon text-sm" aria-hidden>
          ◐
        </span>
      )}
    </button>
  );
}
