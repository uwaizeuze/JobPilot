"use client";

import {
  Building2,
  Calendar,
  ExternalLink,
  MapPin,
  Sparkles,
  Tag,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { IJob } from "@/models/job";

const WORK_MODE_STYLES: Record<string, string> = {
  remote:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
  hybrid:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  onsite:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
};

function MatchScoreBadge({ score }: { score: number }) {
  const isHigh = score >= 80;
  const isMed = score >= 60;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold border",
        isHigh
          ? "bg-primary text-primary-foreground border-primary/20"
          : isMed
          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
          : "bg-muted text-muted-foreground border-border"
      )}
    >
      <Sparkles className="h-2.5 w-2.5" />
      {score}%
    </span>
  );
}

export function JobCard({ job }: { job: IJob }) {
  const hasMatchScore = typeof job.matchScore === "number" && job.matchScore > 0;
  const workModeStyle = WORK_MODE_STYLES[job.workMode ?? ""] ?? "";

  return (
    <Card className="group flex flex-col border-border bg-card transition-all duration-150 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5">
      {/* Header */}
      <div className="p-4 pb-3 space-y-2">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight flex-1">
            {job.title}
          </h3>
          {hasMatchScore && <MatchScoreBadge score={job.matchScore!} />}
        </div>

        {/* Company */}
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/80">
          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">{job.company}</span>
        </div>

        {/* Location + Work Mode tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          {job.location && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[140px]">{job.location}</span>
            </span>
          )}
          {job.workMode && (
            <Badge
              variant="outline"
              className={cn("text-[10px] capitalize px-1.5 py-0 font-medium", workModeStyle)}
            >
              {job.workMode}
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="pt-0 px-4 pb-4 flex flex-col flex-1 space-y-3">
        {/* Description snippet */}
        {job.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {job.description}
          </p>
        )}

        {/* Required skills (up to 4) */}
        {job.requiredSkills && job.requiredSkills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.requiredSkills.slice(0, 4).map((skill, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                <Tag className="h-2.5 w-2.5" />
                {skill}
              </span>
            ))}
            {job.requiredSkills.length > 4 && (
              <span className="text-[10px] text-muted-foreground px-1 py-0.5">
                +{job.requiredSkills.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
          <div className="flex flex-col gap-0.5">
            {job.postingDate ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                <Calendar className="h-3 w-3" />
                Posted {new Date(job.postingDate).toLocaleDateString()}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                Found {new Date(job.dateDiscovered).toLocaleDateString()}
              </span>
            )}
            <Badge variant="outline" className="text-[9px] capitalize w-fit px-1 py-0">
              {job.sourcePlatform}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            {job.originalUrl && (
              <a
                href={job.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <Link href={`/jobs/preview?id=${job._id}`}>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] px-2.5 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors"
              >
                View Details
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
