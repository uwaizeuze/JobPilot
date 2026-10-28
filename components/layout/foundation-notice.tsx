import { Badge } from "@/components/ui/badge";

export function FoundationNotice() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      <Badge variant="warning">Phase 1</Badge>
      <span>
        UI foundation only. Auth, database, AI, job sources, and applications
        are not connected.
      </span>
    </div>
  );
}
