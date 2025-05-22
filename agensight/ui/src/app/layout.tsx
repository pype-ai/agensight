"use client"

import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { QueryProvider } from "@/components/QueryProvider";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar";
import { Header } from "@/components/Header";


const metadata: Metadata = {
  title: 'Dashboard - Agensight',
  description: 'Agensight Dashboard - Monitor and analyze your application traces',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { darkMode, toggleDarkMode } = useTheme();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <QueryProvider>
            <SidebarProvider>
              <div className="flex w-full">
                <AppSidebar />
                <div className="flex flex-col w-full h-full">
                  {children}
                </div>
              </div>
              <Toaster />
            </SidebarProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
