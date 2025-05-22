'use client';

import { ReactNode } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useSidebar } from '@/components/ui/sidebar';
import { Header } from '@/components/Header';

interface SingleSessionLayoutProps {
  children: ReactNode;
}

export default function SingleSessionLayout({ children }: SingleSessionLayoutProps) {
  const { open } = useSidebar();
  const { darkMode, toggleDarkMode } = useTheme();
  return (
    <div className="h-full bg-background w-full">
      <div className="flex h-full w-full">
        {/* Main Content */}
        <main
          className={`transition-all ${
            open ? 'ml-0' : 'ml-18'
          } w-full duration-200`}
        >
          <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
          {children}
        </main>
      </div>
    </div>
  );
}
