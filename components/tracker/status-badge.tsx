import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/models/application";

interface StatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  switch (status) {
    case "DISCOVERED":
    case "ANALYZING":
      return (
        <Badge variant="outline" className={`border-muted-foreground/30 text-muted-foreground ${className}`}>
          {status}
        </Badge>
      );
    case "SHORTLISTED":
    case "PREPARING":
      return (
        <Badge variant="secondary" className={`bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 ${className}`}>
          {status}
        </Badge>
      );
    case "READY_FOR_REVIEW":
    case "AWAITING_APPROVAL":
      return (
        <Badge variant="secondary" className={`bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 ${className}`}>
          {status.replace(/_/g, " ")}
        </Badge>
      );
    case "SUBMITTING":
    case "APPLIED":
      return (
        <Badge variant="default" className={`bg-emerald-600 hover:bg-emerald-700 text-white ${className}`}>
          {status}
        </Badge>
      );
    case "ASSESSMENT":
    case "INTERVIEW":
      return (
        <Badge variant="default" className={`bg-purple-600 hover:bg-purple-700 text-white ${className}`}>
          {status}
        </Badge>
      );
    case "OFFER":
      return (
        <Badge variant="default" className={`bg-green-600 hover:bg-green-700 text-white ${className}`}>
          OFFER
        </Badge>
      );
    case "REJECTED":
    case "FAILED":
      return (
        <Badge variant="destructive" className={className}>
          {status}
        </Badge>
      );
    case "NOT_QUALIFIED":
    case "WITHDRAWN":
    case "CANCELLED":
      return (
        <Badge variant="secondary" className={`text-muted-foreground ${className}`}>
          {status.replace(/_/g, " ")}
        </Badge>
      );
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>;
  }
}
