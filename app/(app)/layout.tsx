"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <AppSidebar className="hidden md:flex md:flex-col" />

      {/* Mobile sidebar – slide-out drawer */}
      {mobileNavOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <AppSidebar
              className="flex h-full w-60 flex-col shadow-xl"
              onClose={() => setMobileNavOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader onMobileNavToggle={() => setMobileNavOpen((o) => !o)} />
        <main
          className={cn(
            "flex-1 p-4 md:p-6",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
