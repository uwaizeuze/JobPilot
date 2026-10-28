"use client";

import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Play,
  ShieldCheck,
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

  // Derive apply tier based on platform
  const tier =
    job.applicationMethod === "auto"
      ? "AUTO_SUBMIT"
      : job.sourcePlatform.toLowerCase().includes("greenhouse") ||
        job.sourcePlatform.toLowerCase().includes("lever")
      ? "PREFILL_ASSISTED"
      : "MANUAL";

  async function handleStartPipeline() {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: String(job._id) }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start agent pipeline.");
      }

      setCurrentTaskId(data.taskId);
      setResult(data);
      if (onPipelineComplete) {
        onPipelineComplete(data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error executing pipeline";
      setError(msg);
    } finally {
      setRunning(false);
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
    if (!result?.stepLogs) return "pending";
    const log = result.stepLogs.find((l: PipelineStepLog) => l.step === stepKey);
    if (!log) return "pending";
    return log.status === "completed"
      ? "completed"
      : log.status === "failed"
      ? "failed"
      : log.status === "running"
      ? "running"
      : "pending";
  }

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

          {result && (
            <div
              className={`flex items-start gap-2 rounded-md border p-3 text-xs ${
                result.status === "completed"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : result.status === "cancelled"
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : result.status === "awaiting_approval"
                  ? "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                  : "border-destructive/20 bg-destructive/10 text-destructive"
              }`}
            >
              {result.status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : result.status === "awaiting_approval" ? (
                <Clock className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <span className="font-semibold block capitalize">
                  {result.status.replace("_", " ")}
                </span>
                <p className="text-[11px] leading-relaxed">{result.message}</p>
                {result.confirmationReference && (
                  <p className="text-[11px] font-mono mt-1 font-semibold">
                    Ref: {result.confirmationReference}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step-by-Step Pipeline Monitor */}
          <div className="space-y-2 pt-1">
            <span className="text-xs font-semibold text-foreground">Pipeline Execution Steps</span>
            <div className="divide-y divide-border/60 rounded-md border border-border text-xs">
              {pipelineSteps.map((s, idx) => {
                const status = getStepStatus(s.key);
                return (
                  <div
                    key={s.key}
                    className="flex items-center justify-between p-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-muted-foreground w-4 text-center">
                        {idx + 1}
                      </span>
                      <span
                        className={`text-xs ${
                          status === "completed"
                            ? "text-foreground font-medium"
                            : status === "failed"
                            ? "text-destructive font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {status === "completed" && (
                        <Badge
                          variant="outline"
                          className="h-5 text-[10px] text-emerald-600 border-emerald-500/30"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Done
                        </Badge>
                      )}
                      {status === "failed" && (
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
                      {status === "pending" && (
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
          <div className="flex items-center gap-2">
            {result?.applicationId && (
              <Link href={`/tracker?id=${result.applicationId}`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  View in Tracker
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
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
            ) : (
              <Button
                size="sm"
                variant="default"
                onClick={handleStartPipeline}
                className="gap-1.5 text-xs"
                id="start-agent-pipeline-btn"
              >
                <Play className="h-3.5 w-3.5" />
                {result ? "Run Again" : "Start Workflow"}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="text-xs">
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
