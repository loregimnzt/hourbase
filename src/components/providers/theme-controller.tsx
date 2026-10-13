"use client";
import { useEffect } from "react";
import type { ThemePreference } from "@/types";

export const THEME_STORAGE_KEY = "hourbase:theme";

/** Inline script (runs before paint) so the saved theme never flashes. */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}")||"dark";var t=p==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):p;document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export function ThemeController({ theme }: { theme: ThemePreference }) {
  useEffect(() => {
    const apply = () => {
      const resolved = theme === "system" ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : theme;
      document.documentElement.dataset.theme = resolved;
    };
    apply();
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* storage blocked — theme still applies for this page view */
    }
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
  return null;
}
