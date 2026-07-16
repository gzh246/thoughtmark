"use client";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-full px-2 py-1 text-sm border border-tm bg-tm-card text-tm-muted hover:border-tm-accent hover:text-tm-accent transition-all duration-200 cursor-pointer"
    >
      {theme === "dark" ? "Sun" : "Moon"}
    </button>
  );
}
