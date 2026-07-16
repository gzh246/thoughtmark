"use client";

/**
 * 主题管理 Provider
 *
 * 功能：
 * - 管理 Dark/Light 主题切换
 * - localStorage 持久化偏好
 * - 首次访问跟随系统偏好
 * - 暴露 useTheme() hook
 *
 * 📝 修复方案：
 * 1. SSR 默认 "light"（与 :root CSS 变量一致）
 * 2. 客户端 mount 后立即同步 localStorage → DOM class
 * 3. 用 suppressHydrationWarning 消除警告
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  // SSR 统一用 "light" 以匹配 :root CSS 变量的默认值
  const [theme, setTheme] = useState<Theme>("light");

  // 客户端 mount：从 localStorage 或系统偏好读取真实主题
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    let resolved: Theme = "light";

    if (stored === "dark" || stored === "light") {
      resolved = stored;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      resolved = "dark";
    }

    // 立即应用到 DOM（不等 React 渲染周期）
    if (resolved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", resolved);

    // 更新 React state（触发重新渲染以同步 UI）
    // Hydration intentionally starts from the SSR-safe light theme, then syncs
    // to the user's persisted/system preference after the component mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(resolved);
  }, []);

  // 后续主题切换：同步 DOM class + localStorage
  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";

      // 立即同步 DOM
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("theme", next);

      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
