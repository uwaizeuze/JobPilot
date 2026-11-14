"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function ToastContainer() {
  const { toasts, removeToast } = useUiStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";
        const isWarning = toast.type === "warning";

        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border p-3.5 shadow-lg backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2",
              isSuccess && "border-emerald-500/30 bg-card/95 text-card-foreground dark:border-emerald-500/30",
              isError && "border-destructive/40 bg-card/95 text-card-foreground dark:border-destructive/40",
              isWarning && "border-amber-500/30 bg-card/95 text-card-foreground dark:border-amber-500/30",
              (!toast.type || toast.type === "info") && "border-border bg-card/95 text-card-foreground"
            )}
          >
            <div className="shrink-0 pt-0.5">
              {isSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              {isError && <AlertCircle className="h-4 w-4 text-destructive" />}
              {isWarning && <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
              {(!toast.type || toast.type === "info") && <Info className="h-4 w-4 text-primary" />}
            </div>

            <div className="flex-1 space-y-0.5">
              {toast.title && <div className="text-xs font-semibold">{toast.title}</div>}
              <div className="text-xs text-muted-foreground leading-relaxed">{toast.message}</div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
