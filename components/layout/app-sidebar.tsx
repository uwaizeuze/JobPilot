import Link from "next/link";
import {
  Activity,
  Bell,
  Briefcase,
  Calendar,
  FileText,
  LayoutDashboard,
  Kanban,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Job discovery", icon: Briefcase },
  { href: "/tracker", label: "Tracker", icon: Kanban },
  { href: "/resumes", label: "Resumes", icon: FileText },
  { href: "/interviews/prep", label: "Interviews", icon: Calendar },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/agent", label: "AI agent", icon: Sparkles },
  { href: "/settings/jobs", label: "Background jobs", icon: Activity },
  { href: "/settings/profile", label: "Settings", icon: Settings },
  { href: "/settings/privacy", label: "Privacy & Data", icon: Shield },
];

export function AppSidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "w-60 shrink-0 border-r border-border bg-card p-4",
        className,
      )}
    >
      <Link href="/dashboard" className="mb-6 block px-2 text-sm font-semibold">
        JobPilot
      </Link>
      <nav className="space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
