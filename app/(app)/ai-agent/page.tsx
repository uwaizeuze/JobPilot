"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bot,
  Briefcase,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUiStore } from "@/stores/ui-store";

// ─── Types ──────────────────────────────────────────────────────────────────

interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: "remote" | "hybrid" | "onsite";
  salaryRange?: string;
  experienceRequired?: string;
  matchScore: number;
  whyMatch: string;
  requiredSkills: string[];
  jobUrl?: string;
  description: string;
  postedDate?: string;
}

interface SearchState {
  role: string;
  location: string;
  experience: string;
  skills: string;
  companyType: string;
  notes: string;
}

// ─── Quick action cards for Agent Hub ────────────────────────────────────────

const AGENT_FEATURES = [
  {
    icon: Search,
    title: "AI Job Discovery",
    description:
      "Let the agent scan and surface high-match jobs tailored to your resume and preferences.",
    action: "Find Jobs",
    tab: "search",
    color: "text-blue-500",
  },
  {
    icon: MessageSquare,
    title: "Mock Interview",
    description:
      "Practice with a realistic senior interviewer that challenges your answers and scores you.",
    action: "Start Interview",
    href: "/interviews/mock",
    color: "text-purple-500",
  },
  {
    icon: FileText,
    title: "Resume Optimizer",
    description:
      "AI reviews your resume against a job description and rewrites weak sections.",
    action: "Optimize Resume",
    href: "/resumes",
    color: "text-green-500",
  },
  {
    icon: Briefcase,
    title: "Application Tracker",
    description:
      "Automated Kanban board — from discovered to offer. Every status update is logged.",
    action: "View Tracker",
    href: "/tracker",
    color: "text-orange-500",
  },
];

// ─── Score badge colour ───────────────────────────────────────────────────────

function scoreBadgeVariant(
  score: number
): "default" | "secondary" | "destructive" {
  if (score >= 85) return "default";
  if (score >= 70) return "secondary";
  return "destructive";
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AIAgentPage() {
  const [activeTab, setActiveTab] = useState<"hub" | "search">("hub");
  const { addToast } = useUiStore();

  // Search form state
  const [form, setForm] = useState<SearchState>({
    role: "",
    location: "",
    experience: "mid",
    skills: "",
    companyType: "any",
    notes: "",
  });

  // Results state
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [searchMeta, setSearchMeta] = useState<{
    model?: string;
    tokensUsed?: number;
    profileMatched?: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function updateForm(field: keyof SearchState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSearch() {
    if (!form.role.trim()) {
      addToast({
        title: "Role required",
        message: "Please enter a target job role to search for.",
        type: "warning",
      });
      return;
    }

    setSearching(true);
    setJobs([]);
    setError(null);
    setSearchMeta(null);

    try {
      const res = await fetch("/api/agent/career/job-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: form.role.trim(),
          location: form.location.trim() || undefined,
          experience: form.experience,
          skills: form.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          companyType: form.companyType === "any" ? undefined : form.companyType,
          notes: form.notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresApiKey) {
          setError(
            "No OpenAI API key configured. Go to Settings → AI Settings to add your key."
          );
        } else if (data.budgetExhausted) {
          setError(
            "Monthly token budget exhausted. Increase your limit in Settings → AI Settings."
          );
        } else {
          setError(data.error ?? "Job search failed. Please try again.");
        }
        return;
      }

      setJobs(data.jobs ?? []);
      setSearchMeta({
        model: data.model,
        tokensUsed: data.tokensUsed,
        profileMatched: data.profileMatched,
      });

      if ((data.jobs ?? []).length === 0) {
        addToast({
          message: "No matching jobs found. Try broadening your criteria.",
          type: "info",
        });
      } else {
        addToast({
          message: `Found ${data.jobs.length} tailored opportunities!`,
          type: "success",
        });
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSearching(false);
    }
  }

  async function handleImportJob(job: JobResult) {
    setImportingId(job.id);
    try {
      const validDesc =
        job.description && job.description.trim().length >= 20
          ? job.description.trim()
          : `${job.title} at ${job.company}. Key skills: ${job.requiredSkills.join(", ")}. Location: ${job.location}.`;

      const res = await fetch("/api/jobs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: job.title,
          company: job.company,
          location: job.location || "Remote",
          workMode: job.workMode,
          employmentType: "full-time",
          originalUrl: job.jobUrl || "",
          sourcePlatform: "AI Agent Search",
          description: validDesc,
        }),
      });

      if (res.ok) {
        setImportedIds((prev) => new Set(prev).add(job.id));
        addToast({
          title: "Added to Tracker",
          message: `"${job.title}" at ${job.company} added to your tracker.`,
          type: "success",
        });
      } else {
        const d = await res.json();
        addToast({
          title: "Import Failed",
          message: d.error ?? "Failed to add job to tracker.",
          type: "error",
        });
      }
    } catch {
      addToast({
        title: "Network Error",
        message: "Could not add job to tracker.",
        type: "error",
      });
    } finally {
      setImportingId(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <Bot className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Career AI Agent</h1>
          <p className="text-sm text-muted-foreground">
            Autonomous job discovery, application tracking &amp; interview prep
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto">
          <Sparkles className="mr-1 size-3" />
          AI-Powered
        </Badge>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("hub")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "hub"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bot className="size-4" />
          Agent Hub
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("search")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "search"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Search className="size-4" />
          AI Job Search
        </button>
      </div>

      {/* ── Hub Tab ──────────────────────────────────────────────────────── */}
      {activeTab === "hub" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {AGENT_FEATURES.map((feat) => (
              <Card
                key={feat.title}
                className="group transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div
                    className={`mb-2 flex size-9 items-center justify-center rounded-lg bg-muted ${feat.color}`}
                  >
                    <feat.icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{feat.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {feat.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {feat.href ? (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Link href={feat.href}>{feat.action}</Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setActiveTab((feat.tab as "hub" | "search") ?? "search")}
                    >
                      {feat.action}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Status banner */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-4 py-4">
              <Sparkles className="size-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">AI Engine — Phase 1 Active</p>
                <p className="text-xs text-muted-foreground">
                  Autonomous job discovery, tracker synchronization &amp; mock
                  interview simulations are operational.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Search Tab ───────────────────────────────────────────────────── */}
      {activeTab === "search" && (
        <div className="space-y-6">
          {/* Search form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Target Search Criteria</CardTitle>
              <CardDescription>
                AI leverages your profile and these filters to discover tailored roles. Zero static data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Role */}
                <div className="space-y-1.5">
                  <Label htmlFor="role">Job Role *</Label>
                  <Input
                    id="role"
                    placeholder="e.g. Senior Full Stack Engineer"
                    value={form.role}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateForm("role", e.target.value)
                    }
                  />
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g. Remote, Bengaluru, London"
                    value={form.location}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateForm("location", e.target.value)
                    }
                  />
                </div>

                {/* Experience */}
                <div className="space-y-1.5">
                  <Label htmlFor="experience">Experience Level</Label>
                  <select
                    id="experience"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form.experience}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      updateForm("experience", e.target.value)
                    }
                  >
                    <option value="junior">Junior (0–2 yrs)</option>
                    <option value="mid">Mid-Level (2–5 yrs)</option>
                    <option value="senior">Senior (5–8 yrs)</option>
                    <option value="lead">Lead / Staff (8+ yrs)</option>
                  </select>
                </div>

                {/* Company type */}
                <div className="space-y-1.5">
                  <Label htmlFor="companyType">Company Type</Label>
                  <select
                    id="companyType"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form.companyType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      updateForm("companyType", e.target.value)
                    }
                  >
                    <option value="any">Any Organization Type</option>
                    <option value="startup">High-Growth Startup</option>
                    <option value="scaleup">Scale-up / Mid-Market</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="faang">Tier-1 / FAANG / Big Tech</option>
                  </select>
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-1.5">
                <Label htmlFor="skills">
                  Key Skills{" "}
                  <span className="text-muted-foreground">(comma-separated)</span>
                </Label>
                <Input
                  id="skills"
                  placeholder="e.g. Next.js, TypeScript, Redis, BullMQ, Playwright"
                  value={form.skills}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateForm("skills", e.target.value)
                  }
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">
                  Additional Notes / Preferences{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <textarea
                  id="notes"
                  className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Specific industries, team culture, architecture focus, tech stack constraints…"
                  rows={3}
                  value={form.notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    updateForm("notes", e.target.value)
                  }
                />
              </div>

              <Button
                onClick={handleSearch}
                disabled={searching}
                className="w-full sm:w-auto"
              >
                {searching ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Searching Live AI Models…
                  </>
                ) : (
                  <>
                    <Search className="mr-2 size-4" />
                    Discover Jobs
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Error state */}
          {error && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="py-4 text-sm text-destructive">
                {error}
              </CardContent>
            </Card>
          )}

          {/* Search metadata */}
          {searchMeta && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {searchMeta.model && (
                <Badge variant="outline">Engine: {searchMeta.model}</Badge>
              )}
              {searchMeta.tokensUsed !== undefined && (
                <Badge variant="outline">
                  Tokens: {searchMeta.tokensUsed.toLocaleString()}
                </Badge>
              )}
              {searchMeta.profileMatched && (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  ✓ Verified Match with Your Resume Profile
                </Badge>
              )}
            </div>
          )}

          {/* Results list */}
          {jobs.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {jobs.length} tailored opportunit{jobs.length !== 1 ? "ies" : "y"} found — ranked by compatibility score
              </h2>

              {jobs.map((job) => {
                const isImported = importedIds.has(job.id);
                return (
                  <Card
                    key={job.id}
                    className="transition-shadow hover:shadow-sm"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">{job.title}</CardTitle>
                          <CardDescription>
                            {job.company} · {job.location}
                            {job.workMode && (
                              <Badge
                                variant="outline"
                                className="ml-2 text-[10px] capitalize"
                              >
                                {job.workMode}
                              </Badge>
                            )}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={scoreBadgeVariant(job.matchScore)}
                          className="shrink-0"
                        >
                          <Star className="mr-1 size-3" />
                          {job.matchScore}% Match
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {/* Why match */}
                      <p className="text-sm text-muted-foreground">
                        {job.whyMatch}
                      </p>

                      {/* Required skills */}
                      {job.requiredSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.requiredSkills.map((skill) => (
                            <Badge
                              key={skill}
                              variant="secondary"
                              className="text-[11px]"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Details row */}
                      {(job.salaryRange ?? job.experienceRequired ?? job.postedDate) && (
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          {job.salaryRange && <span>💰 {job.salaryRange}</span>}
                          {job.experienceRequired && (
                            <span>🎓 {job.experienceRequired}</span>
                          )}
                          {job.postedDate && (
                            <span>📅 {job.postedDate}</span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant={isImported ? "secondary" : "default"}
                          onClick={() => handleImportJob(job)}
                          disabled={importingId === job.id || isImported}
                        >
                          {importingId === job.id ? (
                            <Loader2 className="mr-1 size-3 animate-spin" />
                          ) : isImported ? (
                            <CheckCircle2 className="mr-1 size-3 text-emerald-500" />
                          ) : (
                            <Plus className="mr-1 size-3" />
                          )}
                          {isImported ? "Added to Tracker" : "Add to Tracker"}
                        </Button>

                        {job.jobUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={job.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Opportunity
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
