"use client";

import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  StopCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type IJob } from "@/models/job";
import { type PipelineExecutionResult, type PipelineStepLog } from "@/services/agent-orchestration.service";

interface AgentRunDialogProps {
  job: IJob;
  onPipelineComplete?: (result: PipelineExecutionResult) => void;
}

export function AgentRunDialog({ job, onPipelineComplete }: AgentRunDialogProps) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [markingApplied, setMarkingApplied] = useState(false);
  const [isMarkedApplied, setIsMarkedApplied] = useState(false);

  // Live real-time orchestration streaming states
  const [activeStepKey, setActiveStepKey] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [liveStepMessages, setLiveStepMessages] = useState<Record<string, string>>({});
  const [liveStepStatuses, setLiveStepStatuses] = useState<
    Record<string, "completed" | "failed" | "running" | "pending">
  >({});

  // Derive apply tier based on platform
  const tier =
    job.applicationMethod === "auto"
      ? "AUTO_SUBMIT"
      : job.sourcePlatform.toLowerCase().includes("greenhouse") ||
        job.sourcePlatform.toLowerCase().includes("lever")
      ? "PREFILL_ASSISTED"
      : "MANUAL";

  async function handleStartPipeline(options?: { force?: boolean }) {
    setRunning(true);
    setError(null);
    setResult(null);
    setIsMarkedApplied(false);
    setLiveStepMessages({});
    setLiveStepStatuses({ preflight: "running" });
    setProgressPercent(10);
    setActiveStepKey("preflight");

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: String(job._id),
          force: Boolean(options?.force),
          stream: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start agent pipeline.");
      }

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        setResult(data);
        if (data.taskId) setCurrentTaskId(data.taskId);
        setProgressPercent(100);
        setActiveStepKey(null);
        if (onPipelineComplete) onPipelineComplete(data);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("ReadableStream is not supported in this browser.");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          if (!block.trim()) continue;
          let eventType = "message";
          let dataStr = "";

          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataStr = line.slice(5).trim();
            }
          }

          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            if (eventType === "step") {
              setActiveStepKey(data.step);
              if (data.progress) setProgressPercent(data.progress);
              setLiveStepStatuses((prev) => ({
                ...prev,
                [data.step]: data.status,
              }));
              if (data.message) {
                setLiveStepMessages((prev) => ({
                  ...prev,
                  [data.step]: data.message,
                }));
              }
            } else if (eventType === "complete") {
              setResult(data);
              setProgressPercent(100);
              setActiveStepKey(null);
              if (data.taskId) setCurrentTaskId(data.taskId);
              if (onPipelineComplete) onPipelineComplete(data);
            } else if (eventType === "error") {
              setError(data.error || "An error occurred during pipeline execution.");
            }
          } catch (e) {
            console.error("Error parsing SSE block", e);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error executing pipeline";
      setError(msg);
    } finally {
      setRunning(false);
      setActiveStepKey(null);
    }
  }

  async function handleCancelPipeline() {
    if (!currentTaskId) return;
    setCancelling(true);

    try {
      const res = await fetch("/api/agent/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: currentTaskId }),
      });

      if (res.ok) {
        setResult((prev) =>
          prev
            ? {
                ...prev,
                status: "cancelled",
                message: "Agent workflow cancelled by user.",
              }
            : null
        );
      }
    } catch (err) {
      console.error("Cancel failed", err);
    } finally {
      setCancelling(false);
      setRunning(false);
    }
  }

  async function handleMarkAsApplied() {
    if (!result?.applicationId) return;
    setMarkingApplied(true);
    try {
      const res = await fetch(`/api/applications/${result.applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "APPLIED",
          statusReason: `Application marked as applied by candidate via ${job.sourcePlatform || "official career portal"}.`,
          appliedDate: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to mark application as applied.");
      }
      setIsMarkedApplied(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error marking application as applied.");
    } finally {
      setMarkingApplied(false);
    }
  }

  const pipelineSteps = [
    { key: "preflight", label: "Preflight Check (Limits & Pause Switch)" },
    { key: "fetch_job", label: "Job Description Ingestion" },
    { key: "verify_job_open", label: "Job Availability Verification" },
    { key: "check_duplicate", label: "Duplicate Application Detection" },
    { key: "analyze_job", label: "AI Structured Requirements Analysis" },
    { key: "calculate_match", label: "Deterministic Match & Eligibility Check" },
    { key: "generate_documents", label: "Tailored Resume & Cover Letter Draft" },
    { key: "validate_application", label: "Verified Profile Integrity Check" },
    { key: "tier_branching", label: `Apply Tier Execution (${tier})` },
  ];

  function getStepStatus(stepKey: string): "completed" | "failed" | "running" | "pending" {
    // 1. If result has completed or has stepLogs, evaluate actual logs
    if (result?.stepLogs && result.stepLogs.length > 0) {
      for (let i = result.stepLogs.length - 1; i >= 0; i--) {
        const log = result.stepLogs[i];
        if (log.step === stepKey) {
          if (log.status === "completed") return "completed";
          if (log.status === "failed") return "failed";
          if (log.status === "running") {
            if (!running && result.status === "completed") return "completed";
            if (!running && (result.status === "failed" || result.status === "cancelled")) {
              return "failed";
            }
            return "running";
          }
        }
      }

      if (result.status === "completed") {
        return "completed";
      }
    }

    // 2. If actively running via live stream
    if (running && liveStepStatuses[stepKey]) {
      return liveStepStatuses[stepKey];
    }

    if (running) {
      if (stepKey === activeStepKey) return "running";
      return "pending";
    }

    return "pending";
  }

  const isDuplicateDetected = Boolean(
    result?.currentStep === "check_duplicate" ||
      (result?.message && result.message.toLowerCase().includes("active application tracked")) ||
      (result?.message && result.message.toLowerCase().includes("already applied or tracked"))
  );

  if (!open) {
    return (
      <Button
        size="sm"
        variant="default"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-xs"
        id="apply-ai-agent-btn"
      >
        <Bot className="h-3.5 w-3.5" />
        Apply with AI Agent
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-xl border-border bg-card shadow-2xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between border-b border-border pb-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                Autonomous Agent Orchestration
              </CardTitle>
              <Badge
                variant={
                  tier === "AUTO_SUBMIT"
                    ? "default"
                    : tier === "PREFILL_ASSISTED"
                    ? "secondary"
                    : "outline"
                }
                className="text-[11px]"
              >
                {tier === "AUTO_SUBMIT"
                  ? "Tier 1: Direct Submit"
                  : tier === "PREFILL_ASSISTED"
                  ? "Tier 2: Assisted Prefill"
                  : "Tier 3: Manual Link"}
              </Badge>
            </div>
            <CardDescription className="text-xs mt-1">
              Executes the step-by-step pipeline for <strong>{job.title}</strong> at{" "}
              <strong>{job.company}</strong> ({job.sourcePlatform}).
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-3 pt-3 overflow-y-auto">
          {/* Tier Safety Policy Notice */}
          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Integrity & Gating Protocol</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {tier === "MANUAL"
                ? "Platform Terms Policy: LinkedIn, Indeed, and manual imports require manual candidate submission. The agent prepares verified materials, performs duplicate checks, and provides the application package."
                : tier === "PREFILL_ASSISTED"
                ? "Assisted Prefill: The agent generates tailored documents and maps verified fields, then halts before the submission barrier for candidate review."
                : "Direct Submission: Only permitted through authorized ATS endpoints or employer application emails with active consent."}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && isDuplicateDetected && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground">
                      Application Already Tracked
                    </span>
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    >
                      Duplicate Guardrail
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {result.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                    To comply with job board policies and avoid submitting redundant applications, the agent halted duplicate creation. You can view your existing materials in the Tracker or force a re-run to refresh them.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
                {result.applicationId && (
                  <Link href={`/tracker?id=${result.applicationId}`}>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View in Tracker
                    </Button>
                  </Link>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStartPipeline({ force: true })}
                  disabled={running}
                  className="h-7 gap-1.5 text-xs border-amber-500/40 hover:bg-amber-500/10 text-foreground"
                >
                  <RefreshCw className={`h-3 w-3 ${running ? "animate-spin" : ""}`} />
                  Re-run & Refresh Materials
                </Button>
              </div>
            </div>
          )}

          {result && !isDuplicateDetected && (
            result.status === "completed" ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-900 dark:text-emerald-200 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">
                          Application Package Ready
                        </span>
                        {typeof result.matchScore === "number" && (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/40 text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold"
                          >
                            <Sparkles className="h-2.5 w-2.5 mr-1 text-emerald-500" />
                            {result.matchScore}% Match Score
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                        {result.message}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-[11px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span>ATS-Tailored Resume Draft</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span>Custom Cover Letter Draft</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span>Factual Integrity Verified</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className={`h-3 w-3 ${isMarkedApplied ? "text-emerald-500" : "text-amber-500"} shrink-0`} />
                    <span>
                      {isMarkedApplied
                        ? "Saved to Tracker (Status: APPLIED)"
                        : "Saved to Tracker (Ready for Review)"}
                    </span>
                  </div>
                </div>

                {result.applicationId && (
                  <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-emerald-500/20">
                    <Link href={`/tracker?id=${result.applicationId}`}>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open in Tracker & Review Package
                      </Button>
                    </Link>

                    {job.originalUrl && (
                      <a href={job.originalUrl} target="_blank" rel="noopener noreferrer">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Apply on Career Site ↗
                        </Button>
                      </a>
                    )}

                    <Button
                      size="sm"
                      variant={isMarkedApplied ? "outline" : "default"}
                      disabled={isMarkedApplied || markingApplied}
                      onClick={handleMarkAsApplied}
                      className={
                        isMarkedApplied
                          ? "h-7 gap-1.5 text-xs border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                          : "h-7 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                      }
                    >
                      {markingApplied ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {isMarkedApplied ? "Marked as Applied ✓" : "✓ Mark as Applied (Move to Applied)"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`flex items-start gap-2 rounded-md border p-3 text-xs ${
                  result.status === "cancelled"
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : result.status === "awaiting_approval"
                    ? "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    : "border-destructive/20 bg-destructive/10 text-destructive"
                }`}
              >
                {result.status === "awaiting_approval" ? (
                  <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <span className="font-semibold block capitalize">
                    {result.status.replace("_", " ")}
                  </span>
                  <p className="text-[11px] leading-relaxed">{result.message}</p>
                </div>
              </div>
            )
          )}

          {/* Real-Time Progress Bar */}
          {(running || progressPercent > 0) && (
            <div className="space-y-1.5 rounded-md border border-border bg-muted/30 p-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-foreground font-medium">
                  {running && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                  <span>{running ? "Orchestrating AI Pipeline..." : "Pipeline Execution Summary"}</span>
                </div>
                <span className="font-mono font-semibold text-primary">{progressPercent}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Step-by-Step Pipeline Monitor */}
          <div className="space-y-2 pt-1">
            <span className="text-xs font-semibold text-foreground">Pipeline Execution Steps</span>
            <div className="divide-y divide-border/60 rounded-md border border-border text-xs">
              {pipelineSteps.map((s, idx) => {
                const status = getStepStatus(s.key);
                const isThisDuplicateStep = s.key === "check_duplicate" && isDuplicateDetected;

                return (
                  <div
                    key={s.key}
                    className="flex items-center justify-between p-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0 pr-2">
                      <span className="text-[11px] font-mono text-muted-foreground w-4 text-center mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span
                          className={`text-xs ${
                            status === "completed"
                              ? "text-foreground font-medium"
                              : isThisDuplicateStep
                              ? "text-amber-600 dark:text-amber-400 font-medium"
                              : status === "running"
                              ? "text-primary font-medium"
                              : status === "failed"
                              ? "text-destructive font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {s.label}
                        </span>
                        {liveStepMessages[s.key] && (
                          <span className="text-[11px] text-muted-foreground leading-snug mt-0.5 break-words">
                            ↳ {liveStepMessages[s.key]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {status === "completed" && (
                        <Badge
                          variant="outline"
                          className="h-5 text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Done
                        </Badge>
                      )}
                      {isThisDuplicateStep && (
                        <Badge
                          variant="outline"
                          className="h-5 text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10"
                        >
                          <ShieldAlert className="h-3 w-3 mr-1" />
                          Already Tracked
                        </Badge>
                      )}
                      {!isThisDuplicateStep && status === "failed" && (
                        <Badge variant="destructive" className="h-5 text-[10px]">
                          Failed
                        </Badge>
                      )}
                      {status === "running" && (
                        <Badge variant="secondary" className="h-5 text-[10px]">
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Running
                        </Badge>
                      )}
                      {status === "pending" && !isThisDuplicateStep && (
                        <span className="text-[10px] text-muted-foreground">Pending</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 border-t border-border shrink-0 bg-muted/20">
          <div className="flex flex-wrap items-center gap-2">
            {result?.applicationId ? (
              <Link href={`/tracker?id=${result.applicationId}`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  View in Tracker
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <Link href="/tracker">
                <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground">
                  Go to Tracker
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}

            {job.originalUrl && (
              <a href={job.originalUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  Apply on Career Site
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            {running ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancelPipeline}
                disabled={cancelling}
                className="gap-1.5 text-xs"
              >
                {cancelling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <StopCircle className="h-3.5 w-3.5" />
                )}
                Cancel Workflow
              </Button>
            ) : isDuplicateDetected ? (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleStartPipeline({ force: true })}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Re-run & Refresh
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="text-xs">
                  Close
                </Button>
              </>
            ) : result?.status === "completed" ? (
              <>
                <Button
                  size="sm"
                  variant={isMarkedApplied ? "outline" : "default"}
                  disabled={isMarkedApplied || markingApplied}
                  onClick={handleMarkAsApplied}
                  className={
                    isMarkedApplied
                      ? "gap-1.5 text-xs border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                      : "gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                  }
                >
                  {markingApplied ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {isMarkedApplied ? "Applied ✓" : "Mark as Applied"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStartPipeline()}
                  className="gap-1.5 text-xs"
                  id="start-agent-pipeline-btn"
                >
                  <Play className="h-3.5 w-3.5" />
                  Run Again
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="text-xs">
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleStartPipeline()}
                  className="gap-1.5 text-xs"
                  id="start-agent-pipeline-btn"
                >
                  <Play className="h-3.5 w-3.5" />
                  Start Workflow
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="text-xs">
                  Close
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
