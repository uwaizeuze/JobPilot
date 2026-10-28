"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Mail,
  Sparkles,
  Trash2,
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
import type { IResumeVersion } from "@/models/resume";
import type { TailoredResumeContent } from "@/lib/document-exporter";

function ResumeEditorContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const versionIdParam = searchParams.get("versionId");

  const [job, setJob] = useState<IJob | null>(null);
  const [versions, setVersions] = useState<IResumeVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<IResumeVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        if (jobId) {
          const jobRes = await fetch(`/api/jobs/${jobId}`);
          if (jobRes.ok) {
            const jobData = await jobRes.json();
            if (!ignore) setJob(jobData.job);
          }
        }

        const url = jobId
          ? `/api/resume/versions?jobId=${jobId}`
          : "/api/resume/versions";
        const verRes = await fetch(url);
        if (verRes.ok) {
          const verData = await verRes.json();
          if (!ignore) {
            const list: IResumeVersion[] = verData.versions || [];
            setVersions(list);
            if (versionIdParam) {
              const match = list.find((v) => String(v._id) === versionIdParam);
              setActiveVersion(match || list[0] || null);
            } else {
              setActiveVersion(list[0] || null);
            }
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg =
            err instanceof Error ? err.message : "Error loading resume data";
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [jobId, versionIdParam]);

  async function handleGenerateDraft() {
    if (!jobId) return;

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/resume/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to tailor resume.");
      }

      const newVer: IResumeVersion = data.version;
      setVersions((prev) => [newVer, ...prev]);
      setActiveVersion(newVer);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error generating tailored draft";
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }

  async function handleDeleteVersion() {
    if (!activeVersion) return;
    if (!confirm("Are you sure you want to delete this generated resume version?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/resume/versions/${activeVersion._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete version.");
      }

      const updated = versions.filter((v) => v._id !== activeVersion._id);
      setVersions(updated);
      setActiveVersion(updated[0] || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting version";
      setError(msg);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading tailored resume...</p>
      </div>
    );
  }

  const content = (activeVersion?.tailoredContent ||
    null) as TailoredResumeContent | null;

  return (
    <div className="space-y-6">
      {/* Top Action & Navigation Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link href={jobId ? `/jobs/preview?id=${jobId}` : "/resumes"}>
            <Button variant="ghost" size="sm" className="gap-2 text-xs">
              <ArrowLeft className="h-4 w-4" />
              {jobId ? "Back to Job" : "Back to Resumes"}
            </Button>
          </Link>
          {job && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Target:</span>
              <span className="font-semibold text-foreground">{job.title}</span>
              <span>at</span>
              <span className="font-medium text-foreground">{job.company}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {jobId && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleGenerateDraft}
                disabled={generating}
                className="gap-1.5 text-xs"
                id="generate-tailored-draft-btn"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Tailoring Draft...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {activeVersion ? "Generate New Version" : "Generate Tailored Resume"}
                  </>
                )}
              </Button>

              <Link href={`/cover-letters/preview?jobId=${jobId}`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  Cover Letter
                </Button>
              </Link>
            </>
          )}

          {activeVersion && (
            <>
              <a
                href={`/api/resume/versions/${activeVersion._id}/export?format=pdf`}
                download
              >
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5 text-primary" />
                  PDF
                </Button>
              </a>

              <a
                href={`/api/resume/versions/${activeVersion._id}/export?format=docx`}
                download
              >
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  DOCX
                </Button>
              </a>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleDeleteVersion}
                disabled={deleting}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                title="Delete this version"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Version Selector Bar (if multiple versions exist) */}
      {versions.length > 1 && (
        <div className="flex items-center gap-2 border-y border-border py-2 text-xs">
          <span className="font-medium text-muted-foreground">Versions:</span>
          {versions.map((ver) => (
            <Button
              key={String(ver._id)}
              variant={ver._id === activeVersion?._id ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveVersion(ver)}
            >
              v{ver.versionNumber} ({new Date(ver.createdAt).toLocaleDateString()})
            </Button>
          ))}
        </div>
      )}

      {/* Unsupported Claims Banner */}
      {activeVersion?.unsupportedClaimsDetected &&
        activeVersion.unsupportedClaimsDetected.length > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Unsupported Claims Warning
            </div>
            <p className="text-muted-foreground">
              The following items were detected in the tailored draft that lack verified backing in your master profile:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
              {activeVersion.unsupportedClaimsDetected.map((claim, idx) => (
                <li key={idx}>{claim}</li>
              ))}
            </ul>
          </div>
        )}

      {/* Main Resume Content Card */}
      {!activeVersion || !content ? (
        <Card className="p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <CardTitle className="mt-2 text-base font-semibold">
            No tailored resume draft generated yet
          </CardTitle>
          <CardDescription className="mt-1 text-xs">
            {jobId
              ? "Click 'Generate Tailored Resume' to assemble a factual draft grounded in your verified profile and target job requirements."
              : "Select a job listing from Job Discovery to tailor a targeted resume."}
          </CardDescription>
          {jobId ? (
            <Button
              size="sm"
              onClick={handleGenerateDraft}
              disabled={generating}
              className="mt-4 gap-1.5 text-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate Tailored Resume
            </Button>
          ) : (
            <Link href="/jobs" className="mt-4 inline-block">
              <Button size="sm" variant="outline" className="text-xs">
                Browse Jobs
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border pb-6 text-center space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              {content.fullName}
            </CardTitle>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              {content.email && <span>{content.email}</span>}
              {content.phone && <span>• {content.phone}</span>}
              {content.location && <span>• {content.location}</span>}
              {content.urls?.linkedin && (
                <span>• {content.urls.linkedin}</span>
              )}
              {content.urls?.github && <span>• {content.urls.github}</span>}
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6 text-sm">
            {/* Summary */}
            {content.summary && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                  Professional Summary
                </h4>
                <p className="text-xs leading-relaxed text-foreground">
                  {content.summary}
                </p>
              </div>
            )}

            {/* Technical Skills */}
            {content.skills && content.skills.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                  Core Competencies & Technical Skills
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {content.skills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {content.experience && content.experience.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                  Professional Experience
                </h4>
                <div className="space-y-4">
                  {content.experience.map((exp, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
                        <span className="font-bold text-foreground text-xs">
                          {exp.title} — {exp.company}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {exp.startDate} – {exp.current ? "Present" : exp.endDate || "Present"}
                          {exp.location ? ` | ${exp.location}` : ""}
                        </span>
                      </div>
                      <ul className="list-disc pl-5 text-xs space-y-1 text-muted-foreground">
                        {exp.responsibilities.map((r, rIdx) => (
                          <li key={rIdx}>{r}</li>
                        ))}
                        {exp.achievements?.map((a, aIdx) => (
                          <li key={`ach-${aIdx}`} className="font-medium text-foreground">
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {content.education && content.education.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                  Education
                </h4>
                <div className="space-y-2 text-xs">
                  {content.education.map((edu, idx) => (
                    <div key={idx} className="flex justify-between items-baseline">
                      <div>
                        <span className="font-semibold text-foreground">
                          {edu.degree}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          — {edu.institution}
                          {edu.fieldOfStudy ? ` (${edu.fieldOfStudy})` : ""}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {edu.startYear ? `${edu.startYear} – ` : ""}
                        {edu.endYear || ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ResumeEditorPage() {
  return (
    <PageShell
      title="Tailored Resume Editor"
      description="Review job-tailored resume drafts grounded in your verified master profile, with version history and export."
    >
      <Suspense
        fallback={
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        }
      >
        <ResumeEditorContent />
      </Suspense>
    </PageShell>
  );
}
