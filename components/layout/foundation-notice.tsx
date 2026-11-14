"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function FoundationNotice({ className }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur-xs transition-colors hover:border-border ${
        className || ""
      }`}
      role="status"
      aria-label="Development status"
    >
      <span className="flex h-2 w-2 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <Badge
        variant="secondary"
        className="h-4 px-1.5 text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border-transparent"
      >
        Phase 1
      </Badge>
      <span className="hidden sm:inline text-[11px] text-muted-foreground font-medium">
        AI Job Engine &bull; Active Preview
      </span>
      <Sparkles className="h-3 w-3 text-primary/70 ml-0.5" />
    </div>
  );
}
