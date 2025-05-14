"use client";

import React from "react";
import { Header } from "@/components/Header";
import { useTheme } from "@/components/ThemeProvider";

export function HeaderWrapper({ children }: { children: React.ReactNode }) {
  const { darkMode, toggleDarkMode } = useTheme();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
} 