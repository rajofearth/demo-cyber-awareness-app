"use client";

import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type Theme = "light" | "dark";

const STORAGE_KEY = "ph-theme";

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function currentTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.dataset.theme = theme;
}

function storedTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      applyTheme(storedTheme());
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    currentTheme,
    () => "dark" as Theme,
  );

  // React's dev remount resets attributes it manages on <html>, dropping the
  // class the inline script set before paint. Re-apply the stored choice.
  useLayoutEffect(() => {
    const next = storedTheme();
    if (currentTheme() !== next) {
      applyTheme(next);
      notify();
    }
  }, []);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the DOM still updates.
    }
    notify();
  }, []);

  const toggle = useCallback(() => {
    setTheme(currentTheme() === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { theme, setTheme, toggle };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={cn(
        "mat-cap grid size-11 shrink-0 place-items-center rounded-[10px] text-ink-2 transition-colors hover:text-ink sm:size-9",
        className,
      )}
    >
      {theme === "dark" ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
