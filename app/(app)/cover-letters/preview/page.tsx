"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { IJob } from "@/models/job";

function CoverLetterContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");

  const [job, setJob] = useState<IJob | null>(null);
  const [content, setContent] = useState("");
  const [tone, setTone] = useState<"professional" | "enthusiastic" | "concise">("professional");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        if (jobId) {
          const [jobRes, clRes] = await Promise.all([
            fetch(`/api/jobs/${jobId}`),
            fetch(`/api/cover-letter?jobId=${jobId}`),
          ]);

          if (jobRes.ok) {
            const jobData = await jobRes.json();
            if (!ignore) setJob(jobData.job);
          }

          if (clRes.ok) {
            const clData = await clRes.json();
            if (!ignore && clData.coverLetter) {
              setContent(clData.coverLetter.content);
              if (clData.coverLetter.tone) {
                setTone(clData.coverLetter.tone);
              }
            }
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg =
            err instanceof Error ? err.message : "Error loading cover letter data";
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
  }, [jobId]);

  async function handleGenerate(selectedTone = tone) {
    if (!jobId) return;

    setGenerating(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, tone: selectedTone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate cover letter.");
      }

      setContent(data.content || "");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error generating cover letter";
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!jobId || !content.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/cover-letter", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, content, tone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save cover letter.");
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error saving cover letter";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading cover letter editor...</p>
      </div>
    );
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link href={jobId ? `/jobs/preview?id=${jobId}` : "/jobs"}>
            <Button variant="ghost" size="sm" className="gap-2 text-xs">
              <ArrowLeft className="h-4 w-4" />
              {jobId ? "Back to Job" : "Back to Jobs"}
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
          {jobId && content && (
            <>
              <a
                href={`/api/cover-letter/export?jobId=${jobId}&format=pdf`}
                download
              >
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5 text-primary" />
                  PDF
                </Button>
              </a>

              <a
                href={`/api/cover-letter/export?jobId=${jobId}&format=docx`}
                download
              >
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  DOCX
                </Button>
              </a>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="gap-1.5 text-xs"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Draft
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

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 p-3 text-xs text-primary">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Cover letter draft saved successfully.</span>
        </div>
      )}

      {/* Tone Selection & Generation Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Personalized Cover Letter Generator
              </CardTitle>
              <CardDescription className="text-xs">
                Creates tailored letters connecting your verified accomplishments with target company objectives.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Tone:</span>
              {(["professional", "enthusiastic", "concise"] as const).map((t) => (
                <Button
                  key={t}
                  variant={tone === t ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs capitalize"
                  onClick={() => {
                    setTone(t);
                    if (content) {
                      handleGenerate(t);
                    }
                  }}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {!content && jobId && (
            <div className="rounded-md border border-dashed border-border p-8 text-center space-y-3">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                No draft generated yet for {job ? `${job.title} at ${job.company}` : "this job"}.
              </p>
              <Button
                size="sm"
                onClick={() => handleGenerate()}
                disabled={generating}
                className="gap-2 text-xs"
                id="generate-cover-letter-btn"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Generate Cover Letter
                  </>
                )}
              </Button>
            </div>
          )}

          {content && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="cover-letter-text" className="text-xs font-semibold">
                  Editable Cover Letter Content
                </Label>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{wordCount} words</span>
                  <span>•</span>
                  <span>{charCount} characters</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGenerate()}
                    disabled={generating}
                    className="h-6 text-[11px] gap-1 text-muted-foreground"
                    title="Regenerate letter"
                  >
                    <RefreshCw className={`h-3 w-3 ${generating ? "animate-spin" : ""}`} />
                    Regenerate
                  </Button>
                </div>
              </div>

              <textarea
                id="cover-letter-text"
                rows={16}
                className="w-full rounded-md border border-input bg-card p-4 text-xs font-mono leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CoverLetterEditorPage() {
  return (
    <PageShell
      title="Cover Letter Editor"
      description="Create, review, edit, and export personalized cover letters grounded in your verified experience."
    >
      <Suspense
        fallback={
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        }
      >
        <CoverLetterContent />
      </Suspense>
    </PageShell>
  );
}
