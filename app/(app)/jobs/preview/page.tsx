"use client";

import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { IJob } from "@/models/job";
import type { IJobAnalysis } from "@/models/job-analysis";
import type { JobMatchResult } from "@/services/job-matching.service";
import { AgentRunDialog } from "@/components/jobs/agent-run-dialog";

function JobPreviewContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("id");

  const [job, setJob] = useState<IJob | null>(null);
  const [analysis, setAnalysis] = useState<IJobAnalysis | null>(null);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);
  const [loading, setLoading] = useState(Boolean(jobId));
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [trackStatus, setTrackStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    let ignore = false;

    async function loadJobAndMatch() {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) {
          throw new Error("Job not found or unavailable");
        }
        const data = await res.json();
        if (!ignore) {
          setJob(data.job);
        }

        // Check if existing match analysis is available
        const matchRes = await fetch(`/api/jobs/${jobId}/match`);
        if (matchRes.ok) {
          const matchData = await matchRes.json();
          if (!ignore && matchData.match) {
            setMatchResult(matchData.match);
          }
        }

        // Check if role is already tracked
        const dupRes = await fetch("/api/applications/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        });
        if (dupRes.ok) {
          const dupData = await dupRes.json();
          if (!ignore && dupData.isDuplicate && dupData.existingApplicationId) {
            setApplicationId(dupData.existingApplicationId);
            setTrackStatus(dupData.existingStatus || "TRACKED");
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Error loading job";
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadJobAndMatch();

    return () => {
      ignore = true;
    };
  }, [jobId]);

  async function handleTrackApplication() {
    if (!jobId) return;
    setTracking(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, status: "DISCOVERED" }),
      });
      const data = await res.json();
      if (res.ok) {
        setApplicationId(data.application._id);
        setTrackStatus(data.application.status);
      } else if (data.isDuplicate && data.duplicateCheck) {
        setApplicationId(data.duplicateCheck.existingApplicationId);
        setTrackStatus(data.duplicateCheck.existingStatus);
      }
    } catch (err: unknown) {
      console.error("Track failed", err);
    } finally {
      setTracking(false);
    }
  }

  async function handleRunAnalysis() {
    if (!jobId) return;

    setAnalyzing(true);
    setError(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/analyze`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Analysis failed.");
      }

      setAnalysis(data.analysis);
      setMatchResult(data.match);
      if (job) {
        setJob((prev) =>
          prev
            ? ({
                ...prev,
                matchScore: data.match.overallScore,
              } as unknown as IJob)
            : null
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error running analysis";
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading job details...</p>
      </div>
    );
  }

  if (error || (!job && jobId)) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-medium text-destructive">{error || "Job not found"}</p>
        <Link href="/jobs" className="mt-4 inline-block">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Job Discovery
          </Button>
        </Link>
      </Card>
    );
  }

  if (!job) {
    return (
      <Card className="p-8 text-center">
        <CardTitle className="text-base font-semibold">No job selected</CardTitle>
        <CardDescription className="mt-2 text-xs">
          Select a job listing from the Job Discovery catalog to view complete details, requirements, and tailoring options.
        </CardDescription>
        <Link href="/jobs" className="mt-4 inline-block">
          <Button variant="default" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Browse Job Discovery
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation & Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/jobs">
          <Button variant="ghost" size="sm" className="gap-2 text-xs">
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Button>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {job.originalUrl ? (
            <a
              href={job.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5"
            >
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                View Original Posting
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          ) : null}

          <Button
            size="sm"
            variant="secondary"
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="gap-1.5 text-xs"
            id="run-analysis-btn"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analyzing & Matching...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {matchResult ? "Re-Analyze Match" : "Analyze & Calculate Match"}
              </>
            )}
          </Button>

          <Link href={`/resumes/preview?jobId=${job._id}`}>
            <Button size="sm" className="gap-1.5 text-xs">
              Tailor Resume
            </Button>
          </Link>

          <Link href={`/cover-letters/preview?jobId=${job._id}`}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              Cover Letter
            </Button>
          </Link>

          <AgentRunDialog
            job={job}
            onPipelineComplete={(pipelineRes) => {
              if (pipelineRes.applicationId) {
                setApplicationId(pipelineRes.applicationId);
                setTrackStatus(pipelineRes.status.toUpperCase());
              }
            }}
          />

          {applicationId ? (
            <Link href="/tracker">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Tracked: {trackStatus || "Active"}
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleTrackApplication}
              disabled={tracking}
              className="gap-1.5 text-xs"
              id="track-role-btn"
            >
              {tracking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Briefcase className="h-3.5 w-3.5 text-primary" />
              )}
              Track in Pipeline
            </Button>
          )}
        </div>
      </div>

      {/* Match Result Card (if analyzed) */}
      {matchResult && (
        <Card className="border-primary/30 bg-primary/[0.03]">
          <CardHeader className="pb-4 border-b border-border">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Match & Relevance Evaluation
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {matchResult.explanation}
                </CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-2xl font-black text-foreground">
                    {matchResult.overallScore}%
                  </span>
                  <span className="block text-[10px] uppercase font-semibold text-muted-foreground">
                    Overall Match
                  </span>
                </div>
                <Badge
                  variant={
                    matchResult.recommendedAction === "APPLY"
                      ? "default"
                      : matchResult.recommendedAction === "TAILOR_FIRST"
                      ? "secondary"
                      : "destructive"
                  }
                  className="font-bold uppercase tracking-wider text-[11px]"
                >
                  {matchResult.recommendedAction.replace("_", " ")}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-4 text-xs">
            {/* Component Breakdown */}
            <div className="grid gap-3 sm:grid-cols-5 text-center">
              <div className="rounded-md border border-border bg-card p-2">
                <span className="text-[10px] text-muted-foreground block">Technical Skills</span>
                <span className="text-sm font-bold text-foreground">
                  {matchResult.componentScores.skillsScore}%
                </span>
              </div>
              <div className="rounded-md border border-border bg-card p-2">
                <span className="text-[10px] text-muted-foreground block">Experience Years</span>
                <span className="text-sm font-bold text-foreground">
                  {matchResult.componentScores.experienceScore}%
                </span>
              </div>
              <div className="rounded-md border border-border bg-card p-2">
                <span className="text-[10px] text-muted-foreground block">Work Mode & Loc</span>
                <span className="text-sm font-bold text-foreground">
                  {matchResult.componentScores.locationScore}%
                </span>
              </div>
              <div className="rounded-md border border-border bg-card p-2">
                <span className="text-[10px] text-muted-foreground block">Title Relevance</span>
                <span className="text-sm font-bold text-foreground">
                  {matchResult.componentScores.titleScore}%
                </span>
              </div>
              <div className="rounded-md border border-border bg-card p-2">
                <span className="text-[10px] text-muted-foreground block">Education</span>
                <span className="text-sm font-bold text-foreground">
                  {matchResult.componentScores.educationScore}%
                </span>
              </div>
            </div>

            {/* Eligibility Concerns Alert */}
            {matchResult.eligibilityConcerns.length > 0 && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  Mandatory Eligibility Considerations
                </div>
                <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                  {matchResult.eligibilityConcerns.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Matching & Missing Skills */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Matching Verified Skills ({matchResult.matchingSkills.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {matchResult.matchingSkills.length > 0 ? (
                    matchResult.matchingSkills.map((skill, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
                      >
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-[11px]">No exact skill matches detected.</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5 text-amber-500" />
                  Missing or Unverified Skills ({matchResult.missingSkills.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {matchResult.missingSkills.length > 0 ? (
                    matchResult.missingSkills.map((skill, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]"
                      >
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-[11px]">All required skills are covered!</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Job Details Card */}
      <Card>
        <CardHeader className="border-b border-border pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                {job.title}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Building2 className="h-4 w-4 text-primary" />
                  {job.company}
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Discovered {new Date(job.dateDiscovered).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
              <Badge variant="outline" className="capitalize">
                Source: {job.sourcePlatform}
              </Badge>
              <Badge
                variant={
                  job.workMode === "remote"
                    ? "default"
                    : job.workMode === "hybrid"
                    ? "secondary"
                    : "outline"
                }
                className="capitalize"
              >
                {job.workMode}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {job.employmentType}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {job.salaryRange?.min || job.salaryRange?.max ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Compensation Range
              </h4>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {job.salaryRange.currency}{" "}
                {job.salaryRange.min?.toLocaleString() || "N/A"} -{" "}
                {job.salaryRange.max?.toLocaleString() || "N/A"}
              </p>
            </div>
          ) : null}

          {job.requiredSkills && job.requiredSkills.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Required Skills
              </h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {job.requiredSkills.map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Structured Responsibilities (if analyzed) */}
          {analysis?.responsibilities && analysis.responsibilities.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Structured Responsibilities
              </h4>
              <ul className="list-disc pl-5 text-sm space-y-1 text-foreground">
                {analysis.responsibilities.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Full Job Description
            </h4>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line text-sm leading-relaxed text-foreground">
              {job.description}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function JobDetailsPage() {
  return (
    <PageShell
      title="Job Details & AI Match"
      description="View detailed requirements, source platform, and compute deterministic match scores."
    >
      <Suspense
        fallback={
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        }
      >
        <JobPreviewContent />
      </Suspense>
    </PageShell>
  );
}
