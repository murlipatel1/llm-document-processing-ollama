"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button type="button" className="secondary-btn" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === "dark" ? "Light" : "Dark"} mode
    </button>
  );
}
