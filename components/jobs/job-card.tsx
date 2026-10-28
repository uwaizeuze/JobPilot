"use client";

import { Building2, ExternalLink, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { IJob } from "@/models/job";

export function JobCard({ job }: { job: IJob }) {
  const hasMatchScore = typeof job.matchScore === "number" && job.matchScore > 0;

  return (
    <Card className="flex flex-col justify-between border-border bg-card transition-colors hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold text-foreground line-clamp-1">
              {job.title}
            </CardTitle>
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{job.company}</span>
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            {hasMatchScore && (
              <Badge
                variant={
                  job.matchScore! >= 80
                    ? "default"
                    : job.matchScore! >= 60
                    ? "secondary"
                    : "outline"
                }
                className="text-[10px] gap-1 font-semibold"
              >
                <Sparkles className="h-2.5 w-2.5" />
                {job.matchScore}% Match
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] capitalize">
              {job.sourcePlatform}
            </Badge>
            <Badge
              variant={
                job.workMode === "remote"
                  ? "default"
                  : job.workMode === "hybrid"
                  ? "secondary"
                  : "outline"
              }
              className="text-[10px] capitalize"
            >
              {job.workMode}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{job.location}</span>
        </div>

        <p className="line-clamp-2 text-muted-foreground">
          {job.description}
        </p>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="text-[11px] text-muted-foreground">
            Discovered {new Date(job.dateDiscovered).toLocaleDateString()}
          </div>

          <div className="flex items-center gap-2">
            {job.originalUrl ? (
              <a
                href={job.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                Posting
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}

            <Link href={`/jobs/preview?id=${job._id}`}>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                View Details
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
