import Link from "next/link";
import { Sparkles } from "lucide-react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { FoundationNotice } from "@/components/layout/foundation-notice";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            JobPilot
          </Link>
          <FoundationNotice className="hidden sm:inline-flex" />
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link
            href="/dashboard"
            className="transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
          <Link href="/jobs" className="transition-colors hover:text-foreground">
            Jobs
          </Link>
          <Link
            href="/tracker"
            className="transition-colors hover:text-foreground"
          >
            Tracker
          </Link>
          <Link
            href="/settings/profile"
            className="transition-colors hover:text-foreground"
          >
            Settings
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <FoundationNotice className="sm:hidden" />
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
