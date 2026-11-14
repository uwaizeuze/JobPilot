import type { ReactNode } from "react";

import { FoundationNotice } from "@/components/layout/foundation-notice";

export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Subtle background gradient that works in both light and dark */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,hsl(var(--primary)/0.08),transparent)]"
        aria-hidden
      />
      <main className="flex flex-1 items-center justify-center py-8">
        {children}
      </main>
      <FoundationNotice />
    </div>
  );
}
