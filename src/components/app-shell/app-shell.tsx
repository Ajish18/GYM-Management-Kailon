"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { UserMenu } from "@/components/app-shell/user-menu";
import { RouteProgress } from "@/components/app-shell/route-progress";
import { NAV_CONFIG, type NavKey } from "@/components/app-shell/nav-config";

export function AppShell({
  navKey,
  roleLabel,
  gymName,
  gymCode,
  user,
  notificationBell,
  children,
}: {
  navKey: NavKey;
  roleLabel: string;
  gymName?: string | null;
  gymCode?: string | null;
  user: { name: string; email?: string | null; image?: string | null };
  // Rendered by a Server Component layout above us and passed down as a
  // slot — a Client Component (this file) can't import an async Server
  // Component and render it directly, but it CAN render one handed to it
  // this way (same reasoning as nav-config.tsx's icon-boundary comment).
  notificationBell?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = NAV_CONFIG[navKey];

  return (
    <div className="flex min-h-screen">
      <RouteProgress />
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-2 px-5">
          <Link href="/">
            <Logo />
          </Link>
        </div>
        {gymName && (
          <div className="px-5 pb-4">
            <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {gymName}
            </div>
            {gymCode && (
              <div className="mt-1 font-mono text-[11px] tracking-widest text-muted-foreground/70">
                ID: {gymCode}
              </div>
            )}
          </div>
        )}
        <SidebarNav items={navItems} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                className="lg:hidden"
                render={
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                }
              />
              <SheetContent side="left" className="w-64 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex h-16 items-center px-5">
                  <Logo />
                </div>
                <SidebarNav items={navItems} />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-medium text-muted-foreground">{roleLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {notificationBell}
            <UserMenu name={user.name} email={user.email} image={user.image} role={navKey} />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
