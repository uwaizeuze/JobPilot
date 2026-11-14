import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/models/application";

interface StatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  DISCOVERED: {
    label: "Discovered",
    className:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  },
  ANALYZING: {
    label: "Analyzing",
    className:
      "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    className:
      "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700",
  },
  NOT_QUALIFIED: {
    label: "Not Qualified",
    className:
      "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700",
  },
  PREPARING: {
    label: "Preparing",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  },
  READY_FOR_REVIEW: {
    label: "Ready for Review",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  },
  AWAITING_APPROVAL: {
    label: "Awaiting Approval",
    className:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
  },
  SUBMITTING: {
    label: "Submitting",
    className:
      "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700",
  },
  APPLIED: {
    label: "Applied",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
  },
  ASSESSMENT: {
    label: "Assessment",
    className:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700",
  },
  INTERVIEW: {
    label: "Interview",
    className:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
  },
  OFFER: {
    label: "🎉 Offer",
    className:
      "bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600 font-semibold",
  },
  REJECTED: {
    label: "Rejected",
    className:
      "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
  },
  FAILED: {
    label: "Failed",
    className:
      "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    className:
      "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700",
  },
  CANCELLED: {
    label: "Cancelled",
    className:
      "bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-500 dark:border-zinc-700",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, " "),
    className: "",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-medium px-1.5 py-0 leading-5 border",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
