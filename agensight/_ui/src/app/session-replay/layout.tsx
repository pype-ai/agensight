'use client';

import { ReactNode } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/sidebar';
import { Header } from '@/components/Header';

interface SessionReplayLayoutProps {
  children: ReactNode;
}

export default function SessionReplayLayout({ children }: SessionReplayLayoutProps) {
  const { open } = useSidebar();
  const { darkMode, toggleDarkMode } = useTheme();
  
  return (
    <div className="h-screen bg-background w-full flex flex-col">
      <div className="flex flex-1 min-h-0">
        {/* Main Content */}
        <main
          className={`transition-all ${
            open ? 'ml-0' : 'ml-[4.5rem]'
          } flex-1 duration-200 flex flex-col min-h-0`}
        >
          <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
          <div className="flex-1 min-h-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}