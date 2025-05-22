import {
  Home,
  LayoutDashboard,
  Activity,
  ChevronDown,
  List,
  FileText,
  Settings,
  Users,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { useRouter } from 'next/navigation';
import Link from 'next/link'


// Define navigation items as a JSON structure
const navigationItems = [
  {
    label: 'Home',
    icon: Home,
    href: '/dashboard',
    children: null,
  },
  // {
  //   label: 'Traces',
  //   icon: Activity,
  //   href: null,
  //   children: [
  //     {
  //       label: 'Sessions',
  //       icon: List,
  //       href: '/sessions',
  //     },
  // {
  //   label: 'Traces',
  //   icon: FileText,
  //   href: '/traces',
  // },
  //   ],
  // },
  // if needed add more menu items
  // {
  //   label: 'Settings',
  //   icon: Settings,
  //   href: '/settings',
  //   children: null,
  // },
  // {
  //   label: 'Users',
  //   icon: Users,
  //   href: '/users',
  //   children: [
  //     {
  //       label: 'Team',
  //       icon: Users,
  //       href: '/users/team',
  //     },
  //     {
  //       label: 'Permissions',
  //       icon: FileText,
  //       href: '/users/permissions',
  //     },
  //   ],
  // },
];

export function AppSidebar() {
  const { open, toggleSidebar } = useSidebar();
  const router = useRouter();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(
    () => Object.fromEntries(navigationItems.map(item => [item.label, false]))
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const toggleMenu = (menuLabel: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuLabel]: !prev[menuLabel],
    }));
  };

  // Function to render a menu item based on its structure
  const renderMenuItem = (item: any) => {
    const IconComponent = item.icon;

    // If the item has children, render a collapsible menu
    if (item.children) {
      return (
        <Collapsible
          key={item.label}
          className="w-full group/collapsible"
          open={openMenus[item.label]}
          onOpenChange={() => toggleMenu(item.label)}
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full">
                <IconComponent className={cn('w-5 h-5', !open && 'mx-auto')} />
                {open && (
                  <>
                    <span className="font-medium">{item.label}</span>
                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                  </>
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>

            <CollapsibleContent>
              {open && (
                <SidebarMenuSub>
                  {item.children.map((child: any) => {
                    const ChildIconComponent = child.icon;
                    return (
                      <SidebarMenuSubItem key={child.label}>
                        <SidebarMenuSubButton asChild>
                          <a
                            href={child.href}
                            className="flex items-center gap-2"
                          >
                            <ChildIconComponent className="h-4 w-4" />
                            <span>{child.label}</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              )}
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    // If the item doesn't have children, render a regular menu item
    return (
      <SidebarMenuItem key={item.label}>
        <SidebarMenuButton
          asChild
          className="gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
      <Link href={item.href}>
    <IconComponent className={cn('w-5 h-5', !open && 'mx-auto')} />
                {open && <span className="font-medium">{item.label}</span>}
              </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      side="left"
      variant="sidebar"
      collapsible="offcanvas"
      className={cn(
        'transition-all duration-300 ease-in-out border-r border-sidebar-border',
        open ? 'w-64' : 'w-18'
      )}
    >
      <SidebarHeader className="p-3 border-b border-sidebar-border">
        <div
          className={`flex ${
            open ? 'justify-start' : 'justify-center'
          } items-center gap-2`}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-lg shadow-md transition-all duration-300">
              <Image
                src="/pype-logo.png"
                alt="PYPE Logo"
                width={100}
                height={100}
                className="relative z-10"
              />
            </div>
          </div>
          {open && (
            <a className="flex items-center space-x-3 font-bold group" href="/">
              <span className="hidden sm:inline-block text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70 text-xl tracking-tight transition-all duration-300 group-hover:tracking-normal">
                Agensight{' '}
                <span className="font-normal text-foreground/90">Studio</span>
              </span>
            </a>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel
            className={cn(
              'px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider',
              !open && 'sr-only'
            )}
          >
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-2">
            <SidebarMenu>
              {/* Dynamically render menu items based on navigationItems JSON */}
              {navigationItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <div
          className={cn(
            'flex items-center gap-2 text-sm text-muted-foreground',
            !open && 'justify-center'
          )}
        >
          {open ? <span>© 2025 Agensight</span> : <span>©</span>}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
