import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          JobPilot
        </Link>
        <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/jobs" className="hover:text-foreground">
            Jobs
          </Link>
          <Link href="/tracker" className="hover:text-foreground">
            Tracker
          </Link>
          <Link href="/settings/profile" className="hover:text-foreground">
            Settings
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
