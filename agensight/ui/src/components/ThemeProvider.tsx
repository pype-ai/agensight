"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  attribute?: string;
}

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
};

const initialState: ThemeContextType = {
  theme: "system",
  setTheme: () => null,
  darkMode: false,
  toggleDarkMode: () => null,
};

const ThemeContext = createContext<ThemeContextType>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
  attribute = "data-theme",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [darkMode, setDarkMode] = useState(defaultTheme === "dark");

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system" && enableSystem) {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      setDarkMode(systemTheme === "dark");
    } else {
      root.classList.add(theme);
      setDarkMode(theme === "dark");
    }
  }, [theme, enableSystem]);

  const toggleDarkMode = () => {
    setTheme(darkMode ? "light" : "dark");
  };

  const value = {
    theme,
    setTheme,
    darkMode,
    toggleDarkMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}; 