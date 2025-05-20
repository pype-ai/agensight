"use client"

import { ReactNode } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
      <div className="h-full bg-background w-full">
        <div className="flex h-full w-full">
          {/* Main Content */}
          <main className={`transition-all w-full duration-200`}>
            {children}
          </main>
        </div>
      </div>
  );
}
