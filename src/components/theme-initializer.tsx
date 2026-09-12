"use client";

import { useEffect } from "react";

export function ThemeInitializer() {
  useEffect(() => {
    const root = document.documentElement;
    const savedMode = localStorage.getItem("akcounting-theme") ?? "light";
    const resolvedMode = savedMode === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : savedMode;
    root.dataset.theme = resolvedMode;
    root.dataset.themePreference = savedMode;
    root.dataset.accent = localStorage.getItem("akcounting-accent") ?? "violet";
    root.dataset.density = localStorage.getItem("akcounting-density") ?? "comfortable";
    root.dataset.fontSize = localStorage.getItem("akcounting-font-size") ?? "default";
    root.dataset.motion = localStorage.getItem("akcounting-motion") ?? "full";
  }, []);
  return null;
}
