"use client";

import React, { useState, useEffect } from "react";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Image from "next/image";
import { SidebarTrigger } from "./ui/sidebar";


interface HeaderProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  children?: React.ReactNode;
}

export function Header({ darkMode, toggleDarkMode, children }: HeaderProps) {  
  return (
    <header
      className={'sticky top-0 z-50 border-b border-border/40 bg-card/50 backdrop-blur-sm w-full'}
    >
      <div className="pr-6 pl-3 flex h-14 justify-between w-full items-center">
        <div className="flex items-center gap-3">
          {/* <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span> */}
                  <SidebarTrigger />
                {/* </span>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                <span className="flex items-center gap-2 text-xs">
                  <kbd className="bg-muted px-1 py-0.5 rounded text-[10px] font-mono text-muted-foreground border border-border ml-1">
                    {typeof window !== 'undefined' && (navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')}+B
                  </kbd>
                </span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider> */}
          <div className="flex items-center gap-4">
            
            {children}
          </div>
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
                  {darkMode ? (
                    <IconSun className="h-4 w-4" />
                  ) : (
                    <IconMoon className="h-4 w-4" />
                  )}
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
