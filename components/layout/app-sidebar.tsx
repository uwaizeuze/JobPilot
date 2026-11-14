"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Kanban,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Job Discovery", icon: Briefcase },
  { href: "/tracker", label: "Tracker", icon: Kanban },
  { href: "/resumes", label: "Resumes", icon: FileText },
  { href: "/interviews/prep", label: "Interviews", icon: Calendar },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/agent", label: "AI Agent", icon: Sparkles },
  { href: "/settings/jobs", label: "Background Jobs", icon: Activity },
  { href: "/settings/profile", label: "Settings", icon: Settings },
  { href: "/settings/privacy", label: "Privacy & Data", icon: Shield },
];

interface AppSidebarProps {
  className?: string;
  onClose?: () => void;
}

export function AppSidebar({ className, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-60",
        "shrink-0",
        className,
      )}
    >
      {/* Logo / Branding */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-border px-4",
          collapsed ? "justify-center" : "gap-2",
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold"
          onClick={onClose}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          {!collapsed && (
            <span className="text-base font-bold tracking-tight text-foreground">
              JobPilot
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-0.5 px-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === href
                : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    collapsed && "justify-center",
                  )}
                >
                  {/* Active left-border indicator */}
                  {isActive && !collapsed && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                  )}
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {!collapsed && <span>{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse toggle button */}
      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            collapsed && "justify-center",
          )}
        >
          {collapsed ? (
            <ChevronRight className="size-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="size-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
