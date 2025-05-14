"use client";

import React from "react";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Image from "next/image";

interface HeaderProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  children?: React.ReactNode;
}

export function Header({ darkMode, toggleDarkMode ,children }: HeaderProps) {
  return (
    <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm z-40 sticky top-0 left-0 right-0">
      <div className="px-6 flex h-14 justify-between w-full items-center">
        <div className="flex items-center gap-4">
          <a className="flex items-center space-x-3 font-bold group" href="/">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-lg shadow-md transition-all duration-300">
              <Image src="/pype-logo.png" alt="PYPE Logo" width={100} height={100} className="relative z-10" />
            </div>
            <span className="hidden sm:inline-block text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70 text-xl tracking-tight transition-all duration-300 group-hover:tracking-normal">
              Agensight <span className="font-normal text-foreground/90">Studio</span>
            </span>
          </a>
          {children}
        </div>
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full"
                  onClick={toggleDarkMode}
                >
                  {darkMode ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle theme</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
}
