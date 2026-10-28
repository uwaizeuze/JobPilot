"use client";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Send,
  Sparkles,
  Trash2,
  X,
  Bot,
  BookOpen,
  Play,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/tracker/status-badge";
import { VALID_TRANSITIONS } from "@/services/application-state-machine";
import type { ApplicationStatus, IApplication } from "@/models/application";
import type { IApplicationEvent } from "@/models/application-event";
import type { IJob } from "@/models/job";

type ApplicationWithJob = IApplication & { jobId: IJob };

interface ApplicationDetailDialogProps {
  application: ApplicationWithJob | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

function ApplicationDetailContent({
  application,
  onClose,
  onUpdated,
}: {
  application: ApplicationWithJob;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [events, setEvents] = useState<IApplicationEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [advancingStatus, setAdvancingStatus] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Status transition state
  const [targetStatus, setTargetStatus] = useState<ApplicationStatus | "">("");
  const [transitionReason, setTransitionReason] = useState("");

  // Editable fields initialized from application prop
  const [notes, setNotes] = useState(application.notes || "");
  const [recruiterName, setRecruiterName] = useState(
    application.recruiterContact?.name || ""
  );
  const [recruiterEmail, setRecruiterEmail] = useState(
    application.recruiterContact?.email || ""
  );
  const [recruiterPhone, setRecruiterPhone] = useState(
    application.recruiterContact?.phone || ""
  );
  const [interviewDate, setInterviewDate] = useState(
    application.interviewDate
      ? new Date(application.interviewDate).toISOString().slice(0, 16)
      : ""
  );
  const [followUpDate, setFollowUpDate] = useState(
    application.followUpDate
      ? new Date(application.followUpDate).toISOString().slice(0, 10)
      : ""
  );

  // Audit event note input
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Preparation checklist results
  const [preparationResult, setPreparationResult] = useState<{
    checklist: Array<{
      category: string;
      label: string;
      status: "verified" | "warning" | "missing";
      value?: string;
      note?: string;
    }>;
    isReadyForReview: boolean;
    blockers: string[];
  } | null>(null);

  useEffect(() => {
    let ignore = false;

    async function fetchEvents() {
      try {
        const res = await fetch(`/api/applications/${application._id}/events`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setEvents(data.events || []);
          }
        }
      } catch (err: unknown) {
        console.error("Failed to load events", err);
      } finally {
        if (!ignore) {
          setLoadingEvents(false);
        }
      }
    }

    fetchEvents();

    return () => {
      ignore = true;
    };
  }, [application._id]);

  const currentStatus = application.status;
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
  const job = application.jobId;

  async function handleStatusChange(e: React.FormEvent) {
    e.preventDefault();
    if (!targetStatus) return;

    setAdvancingStatus(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/applications/${application._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          statusReason: transitionReason || `Transitioned to ${targetStatus}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to advance status.");
      }

      setSuccessMsg(`Status advanced to ${targetStatus}`);
      setTargetStatus("");
      setTransitionReason("");
      onUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error changing status";
      setError(msg);
    } finally {
      setAdvancingStatus(false);
    }
  }

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSavingDetails(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/applications/${application._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          recruiterContact: {
            name: recruiterName,
            email: recruiterEmail,
            phone: recruiterPhone,
          },
          interviewDate: interviewDate ? new Date(interviewDate) : null,
          followUpDate: followUpDate ? new Date(followUpDate) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save application details.");
      }

      setSuccessMsg("Details saved successfully.");
      onUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving details";
      setError(msg);
    } finally {
      setSavingDetails(false);
    }
  }

  async function handlePrepareApplication() {
    setPreparing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/applications/${application._id}/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forcePrepare: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to prepare application.");
      }

      setPreparationResult({
        checklist: data.checklist || [],
        isReadyForReview: data.isReadyForReview,
        blockers: data.blockers || [],
      });

      setSuccessMsg("Application materials compiled and validated.");
      onUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error preparing application";
      setError(msg);
    } finally {
      setPreparing(false);
    }
  }

  async function handleExecuteSubmission() {
    setSubmittingAction(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/applications/${application._id}/submit`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Submission request failed");
      }
      setSuccessMsg(data.message || "Application action processed successfully.");
      onUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error executing submission";
      setError(msg);
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleAddEventNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;

    setAddingNote(true);
    try {
      const res = await fetch(`/api/applications/${application._id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: newNote,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEvents((prev) => [data.event, ...prev]);
        setNewNote("");
      }
    } catch (err: unknown) {
      console.error("Failed to add event note", err);
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this tracked application?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/applications/${application._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onClose();
        onUpdated();
      }
    } catch (err: unknown) {
      console.error("Failed to delete", err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="relative w-full max-w-3xl my-8 border-border bg-card shadow-2xl max-h-[90vh] flex flex-col">
      {/* Modal Header */}
      <CardHeader className="flex flex-row items-start justify-between border-b border-border pb-4 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={currentStatus} />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {application.submissionMethod} method
            </span>
          </div>
          <CardTitle className="text-xl font-bold flex items-center gap-2 mt-1">
            {job?.title || "Target Role"}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              {job?.company || "Company"}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job?.location || "Remote"} ({job?.workMode || "remote"})
            </span>
            {job?.originalUrl && (
              <a
                href={job.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Original Posting
              </a>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </CardHeader>

      {/* Scrollable Content */}
      <CardContent className="space-y-6 pt-4 overflow-y-auto flex-1">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Section 1: State Machine Transition Controller */}
        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              State Machine Transition
            </Label>
            <span className="text-xs text-muted-foreground">
              Allowed transitions: {allowedTransitions.length}
            </span>
          </div>

          <form onSubmit={handleStatusChange} className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as ApplicationStatus)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Advance status to...</option>
                {allowedTransitions.map((st) => (
                  <option key={st} value={st}>
                    {st.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-1">
              <Input
                placeholder="Reason / note (optional)"
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div className="sm:col-span-1">
              <Button
                type="submit"
                size="sm"
                disabled={!targetStatus || advancingStatus}
                className="w-full text-xs h-9"
              >
                {advancingStatus ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Apply Transition"
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Section 2: Materials & Preparation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Application Materials & Verification
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrepareApplication}
              disabled={preparing}
              className="gap-1.5 text-xs h-7"
            >
              {preparing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Packaging Materials...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 text-primary" />
                  Prepare & Validate Materials
                </>
              )}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border border-border p-3 text-xs bg-card">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium">Tailored Resume</div>
                  <div className="text-[11px] text-muted-foreground">
                    {application.resumeVersionId ? "Version linked" : "Default master profile"}
                  </div>
                </div>
              </div>
              {job?._id && (
                <Link href={`/resumes/preview?jobId=${job._id}`}>
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    View Draft
                  </Button>
                </Link>
              )}
            </div>

            <div className="flex items-center justify-between rounded-md border border-border p-3 text-xs bg-card">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium">Tailored Cover Letter</div>
                  <div className="text-[11px] text-muted-foreground">
                    {application.coverLetterId ? "Draft customized" : "Standard letter"}
                  </div>
                </div>
              </div>
              {job?._id && (
                <Link href={`/cover-letters/preview?jobId=${job._id}`}>
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    View Letter
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Preparation Checklist Output */}
          {preparationResult && (
            <div className="rounded-md border border-border bg-card p-3 space-y-2 text-xs">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>Pre-flight Application Checklist</span>
                <span
                  className={
                    preparationResult.isReadyForReview
                      ? "text-emerald-500 font-semibold"
                      : "text-amber-500 font-semibold"
                  }
                >
                  {preparationResult.isReadyForReview
                    ? "Ready for Candidate Review"
                    : "Pending Items"}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {preparationResult.checklist.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded bg-muted/40 border border-border/50 text-xs"
                  >
                    {item.status === "verified" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-medium">{item.label}</div>
                      {item.value && <div className="text-muted-foreground">{item.value}</div>}
                      {item.note && (
                        <div className="text-[11px] text-muted-foreground/80 mt-0.5">
                          {item.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tier-Gated Submission Action */}
        {(currentStatus === "READY_FOR_REVIEW" || currentStatus === "AWAITING_APPROVAL") && (
          <div className="rounded-md border border-primary/30 bg-primary/[0.04] p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">
                  {currentStatus === "AWAITING_APPROVAL"
                    ? "Candidate Approval Required"
                    : "Application Ready for Dispatch"}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {job?.sourcePlatform || "Custom"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Materials and eligibility have been verified. Click below to execute submission according to platform safety tiers.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="default"
                disabled={submittingAction}
                onClick={handleExecuteSubmission}
                className="gap-1.5 text-xs h-8"
                id="execute-submission-btn"
              >
                {submittingAction ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {job?.sourcePlatform?.toLowerCase().includes("greenhouse") ||
                job?.sourcePlatform?.toLowerCase().includes("lever")
                  ? "Launch Assisted Prefill"
                  : job?.applicationMethod === "auto"
                  ? "Authorize & Submit Application"
                  : "Prepare & Open Application Portal"}
              </Button>
              {job?.originalUrl && (
                <a href={job.originalUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1 text-xs h-8">
                    Open Job URL
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Section 2B: Interview Coach Integration */}
        {(currentStatus === "INTERVIEW" || interviewDate) && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/[0.04] p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold text-foreground">
                  Interview Coach Active
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                AI Practice Ready
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              This application is in the interview stage. Tailored prep packs and a text-based mock interview room are ready.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button asChild size="sm" variant="default" className="gap-1.5 text-xs h-8">
                <Link href={`/interviews/prep?jobId=${job?._id}`}>
                  <BookOpen className="h-3.5 w-3.5" />
                  Open Prep Pack
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                <Link href={`/interviews/mock?jobId=${job?._id}`}>
                  <Play className="h-3.5 w-3.5" />
                  Practice Mock Interview
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Section 3: Recruiter Contact & Key Dates */}
        <form onSubmit={handleSaveDetails} className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recruiter Contact & Schedule
          </h4>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="recruiter-name" className="text-xs">
                Recruiter / Contact Name
              </Label>
              <Input
                id="recruiter-name"
                placeholder="e.g. Sarah Jenkins"
                value={recruiterName}
                onChange={(e) => setRecruiterName(e.target.value)}
                className="text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="recruiter-email" className="text-xs">
                Recruiter Email
              </Label>
              <Input
                id="recruiter-email"
                type="email"
                placeholder="sarah@company.com"
                value={recruiterEmail}
                onChange={(e) => setRecruiterEmail(e.target.value)}
                className="text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="recruiter-phone" className="text-xs">
                Recruiter Phone
              </Label>
              <Input
                id="recruiter-phone"
                placeholder="+1 (555) 012-3456"
                value={recruiterPhone}
                onChange={(e) => setRecruiterPhone(e.target.value)}
                className="text-xs mt-1"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="interview-date" className="text-xs">
                Interview Date & Time
              </Label>
              <Input
                id="interview-date"
                type="datetime-local"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="followup-date" className="text-xs">
                Follow-up Reminder Date
              </Label>
              <Input
                id="followup-date"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="text-xs mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="app-notes" className="text-xs">
              Private Candidate Notes
            </Label>
            <textarea
              id="app-notes"
              rows={3}
              placeholder="Interview notes, salary expectations, referral names..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mt-1 rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={savingDetails} className="text-xs">
              {savingDetails ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save Contact & Notes
            </Button>
          </div>
        </form>

        {/* Section 4: Audit Event Timeline */}
        <div className="space-y-3 pt-2 border-t border-border">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Activity & Transition Audit Timeline
          </h4>

          {/* Quick Note Add */}
          <form onSubmit={handleAddEventNote} className="flex gap-2">
            <Input
              placeholder="Log activity note (e.g. 'Sent follow-up email to recruiter')..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="text-xs"
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              disabled={addingNote || !newNote.trim()}
              className="text-xs shrink-0"
            >
              {addingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : "Log Note"}
            </Button>
          </form>

          {loadingEvents ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-xs text-muted-foreground">No timeline events logged yet.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {events.map((ev, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 rounded-md border border-border/60 bg-muted/20 p-2 text-xs"
                >
                  <div className="rounded-full bg-primary/10 p-1 text-primary shrink-0 mt-0.5">
                    <MessageSquare className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        {ev.toStatus ? ev.toStatus.replace(/_/g, " ") : "Note"}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(ev.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 break-words">{ev.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Modal Footer */}
      <div className="flex items-center justify-between border-t border-border p-4 bg-muted/20 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Application
        </Button>

        <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
          Close
        </Button>
      </div>
    </Card>
  );
}

export function ApplicationDetailDialog({
  application,
  isOpen,
  onClose,
  onUpdated,
}: ApplicationDetailDialogProps) {
  if (!isOpen || !application) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <ApplicationDetailContent
        key={String(application._id)}
        application={application}
        onClose={onClose}
        onUpdated={onUpdated}
      />
    </div>
  );
}
