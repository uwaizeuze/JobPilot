import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";

export function AppHeader() {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-background px-4 md:px-6">
      <p className="text-sm text-muted-foreground">
        Personal AI job-search workspace
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Notifications
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
