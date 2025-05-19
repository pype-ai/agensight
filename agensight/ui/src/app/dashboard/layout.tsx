"use client"

import { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { useTheme } from '@/components/ThemeProvider';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { darkMode, toggleDarkMode } = useTheme();

    return (
      <SidebarProvider>
        <div className="min-h-screen bg-background">
          <div className="flex min-h-screen">
            <AppSidebar />
            {/* Main Content */}
            <div className="container mx-auto p-6">
              {children}
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
}
