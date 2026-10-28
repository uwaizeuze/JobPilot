"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Lightbulb,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

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

interface PrepPack {
  _id: string;
  jobId: {
    _id: string;
    title: string;
    company: string;
    location: string;
    workMode: string;
    requiredSkills?: string[];
  } | string;
  likelyQuestions: Array<{
    category: "technical" | "behavioral" | "system_design" | "role_specific" | "culture";
    question: string;
    rationale: string;
  }>;
  starOutlines: Array<{
    question: string;
    situation: string;
    task: string;
    action: string;
    result: string;
    verifiedExperienceReference?: string;
  }>;
  skillGaps: Array<{
    skill: string;
    studyPlan: string;
  }>;
  questionsForInterviewer: string[];
  checklist: string[];
  createdAt: string;
}

function InterviewPrepContent() {
  const searchParams = useSearchParams();
  const initialJobId = searchParams.get("jobId");

  const [prepPacks, setPrepPacks] = useState<PrepPack[]>([]);
  const [selectedPack, setSelectedPack] = useState<PrepPack | null>(null);
  const [activeTab, setActiveTab] = useState<
    "questions" | "star" | "gaps" | "interviewer" | "checklist"
  >("questions");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [completedChecks, setCompletedChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/interviews/prep");
        if (res.ok && !ignore) {
          const data = await res.json();
          const packs: PrepPack[] = data.prepPacks || [];
          setPrepPacks(packs);

          if (initialJobId) {
            const match = packs.find(
              (p) =>
                (typeof p.jobId === "object" ? p.jobId._id : p.jobId) === initialJobId
            );
            if (match) setSelectedPack(match);
            else if (packs.length > 0) setSelectedPack(packs[0]);
          } else if (packs.length > 0) {
            setSelectedPack((prev) => prev || packs[0]);
          }
        }
      } catch {
        // Offline fallback
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [initialJobId]);

  async function refetchPacks() {
    try {
      const res = await fetch("/api/interviews/prep");
      if (res.ok) {
        const data = await res.json();
        setPrepPacks(data.prepPacks || []);
      }
    } catch {
      // Offline fallback
    }
  }

  async function handleRegenerate() {
    if (!selectedPack) return;
    const jId =
      typeof selectedPack.jobId === "object"
        ? selectedPack.jobId._id
        : selectedPack.jobId;

    try {
      setGenerating(true);
      const res = await fetch("/api/interviews/prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: jId, forceRegenerate: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedPack(data.prepPack);
        refetchPacks();
      }
    } finally {
      setGenerating(false);
    }
  }

  function toggleCheck(idx: number) {
    setCompletedChecks((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  }

  const jobMeta =
    selectedPack && typeof selectedPack.jobId === "object"
      ? selectedPack.jobId
      : null;

  return (
    <PageShell
      title="Interview Prep Packs"
      description="Tailored questions, grounded STAR outlines, skill-gap roadmaps, and day-of checklists."
    >
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Prep Packs List */}
        <div className="space-y-4 lg:col-span-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <BookOpen className="h-4 w-4 text-primary" />
                Your Prep Packs ({prepPacks.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Generated from job analyses & verified master profiles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Loading prep packs...
                </div>
              ) : prepPacks.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    No prep packs generated yet.
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <Link href="/jobs">Browse Jobs to Prepare</Link>
                  </Button>
                </div>
              ) : (
                prepPacks.map((pack) => {
                  const job = typeof pack.jobId === "object" ? pack.jobId : null;
                  const isSelected = selectedPack?._id === pack._id;
                  return (
                    <button
                      key={pack._id}
                      onClick={() => setSelectedPack(pack)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-medium leading-tight">
                            {job?.title || "Target Role"}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {job?.company || "Company"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {pack.likelyQuestions.length} Qs
                        </Badge>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Practice Banner */}
          {selectedPack && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                  <Sparkles className="h-4 w-4" />
                  Ready to Practice?
                </CardTitle>
                <CardDescription className="text-xs">
                  Launch a text-based mock interview session tailored to this role.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  asChild
                  className="w-full gap-2 shadow-xs"
                  size="sm"
                >
                  <Link
                    href={`/interviews/mock?jobId=${
                      typeof selectedPack.jobId === "object"
                        ? selectedPack.jobId._id
                        : selectedPack.jobId
                    }`}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Launch Mock Interview
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Active Prep Pack Detail */}
        <div className="space-y-6 lg:col-span-8">
          {selectedPack ? (
            <div className="space-y-6">
              {/* Header Card */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl font-bold">
                          {jobMeta?.title || "Engineering Role"}
                        </CardTitle>
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] gap-1"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          Grounded Profile
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-1">
                        {jobMeta?.company} &bull; {jobMeta?.location} &bull;{" "}
                        {jobMeta?.workMode}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRegenerate}
                        disabled={generating}
                        className="gap-1.5 text-xs"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`}
                        />
                        Regenerate
                      </Button>

                      {jobMeta && (
                        <Button asChild size="sm" variant="ghost" className="text-xs">
                          <Link href={`/jobs/preview?id=${jobMeta._id}`}>
                            Job Details <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Navigation Tabs */}
                  <div className="flex flex-wrap gap-1.5 pt-4 border-t mt-4">
                    <Button
                      size="sm"
                      variant={activeTab === "questions" ? "default" : "outline"}
                      onClick={() => setActiveTab("questions")}
                      className="text-xs h-8"
                    >
                      Likely Questions ({selectedPack.likelyQuestions.length})
                    </Button>
                    <Button
                      size="sm"
                      variant={activeTab === "star" ? "default" : "outline"}
                      onClick={() => setActiveTab("star")}
                      className="text-xs h-8"
                    >
                      STAR Outlines ({selectedPack.starOutlines.length})
                    </Button>
                    <Button
                      size="sm"
                      variant={activeTab === "gaps" ? "default" : "outline"}
                      onClick={() => setActiveTab("gaps")}
                      className="text-xs h-8"
                    >
                      Skill Gaps & Study ({selectedPack.skillGaps.length})
                    </Button>
                    <Button
                      size="sm"
                      variant={activeTab === "interviewer" ? "default" : "outline"}
                      onClick={() => setActiveTab("interviewer")}
                      className="text-xs h-8"
                    >
                      Questions to Ask ({selectedPack.questionsForInterviewer.length})
                    </Button>
                    <Button
                      size="sm"
                      variant={activeTab === "checklist" ? "default" : "outline"}
                      onClick={() => setActiveTab("checklist")}
                      className="text-xs h-8"
                    >
                      Day-of Checklist ({selectedPack.checklist.length})
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Tab 1: Likely Questions */}
              {activeTab === "questions" && (
                <div className="space-y-4">
                  {selectedPack.likelyQuestions.map((q, idx) => (
                    <Card key={idx} className="transition-all hover:border-primary/40">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="secondary"
                            className="capitalize text-[10px] font-mono tracking-wider"
                          >
                            {q.category.replace("_", " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            Q{idx + 1}
                          </span>
                        </div>
                        <CardTitle className="text-sm font-semibold mt-2">
                          {q.question}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-md border">
                          <span className="font-semibold text-foreground">
                            Why Interviewers Ask This:{" "}
                          </span>
                          {q.rationale}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Tab 2: STAR Outlines */}
              {activeTab === "star" && (
                <div className="space-y-4">
                  {selectedPack.starOutlines.map((star, idx) => (
                    <Card key={idx} className="border-primary/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge className="text-[10px] bg-primary text-primary-foreground">
                            STAR Outline
                          </Badge>
                          {star.verifiedExperienceReference && (
                            <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                              {star.verifiedExperienceReference}
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-sm font-semibold mt-2">
                          {star.question}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                          <div className="p-2.5 rounded-lg border bg-blue-500/5 border-blue-500/20">
                            <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">
                              [S] Situation
                            </span>
                            <p className="text-muted-foreground">{star.situation}</p>
                          </div>
                          <div className="p-2.5 rounded-lg border bg-amber-500/5 border-amber-500/20">
                            <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">
                              [T] Task
                            </span>
                            <p className="text-muted-foreground">{star.task}</p>
                          </div>
                          <div className="p-2.5 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                              [A] Action
                            </span>
                            <p className="text-muted-foreground">{star.action}</p>
                          </div>
                          <div className="p-2.5 rounded-lg border bg-purple-500/5 border-purple-500/20">
                            <span className="font-bold text-purple-600 dark:text-purple-400 block mb-1">
                              [R] Result
                            </span>
                            <p className="text-muted-foreground">{star.result}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Tab 3: Skill Gaps & Study Plans */}
              {activeTab === "gaps" && (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-amber-500/5 border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Identified qualification deltas between your verified profile and
                      the job posting. Use these targeted study plans to bridge technical
                      questions honestly.
                    </span>
                  </div>

                  {selectedPack.skillGaps.map((gap, idx) => (
                    <Card key={idx}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {gap.skill}
                          </Badge>
                          <span>Preparation Roadmap</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-md border">
                          {gap.studyPlan}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Tab 4: Questions for the Interviewer */}
              {activeTab === "interviewer" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Asking insightful technical and culture questions demonstrates
                    seniority and strategic curiosity.
                  </p>
                  {selectedPack.questionsForInterviewer.map((q, idx) => (
                    <Card key={idx} className="p-3.5 flex items-start gap-3">
                      <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs font-medium leading-relaxed">{q}</p>
                    </Card>
                  ))}
                </div>
              )}

              {/* Tab 5: Day-of Checklist */}
              {activeTab === "checklist" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Review and check off these critical logistical items 15-30 minutes
                    before joining the call.
                  </p>
                  {selectedPack.checklist.map((item, idx) => {
                    const isDone = completedChecks[idx];
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleCheck(idx)}
                        className={`w-full text-left p-3.5 rounded-lg border flex items-center gap-3 transition-colors ${
                          isDone
                            ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                            : "bg-card border-border hover:bg-muted/30"
                        }`}
                      >
                        <CheckCircle2
                          className={`h-4 w-4 shrink-0 ${
                            isDone ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                          }`}
                        />
                        <span
                          className={`text-xs ${
                            isDone ? "line-through opacity-80" : "font-medium"
                          }`}
                        >
                          {item}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <Card className="py-12 text-center">
              <CardContent className="space-y-3">
                <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <h3 className="text-base font-semibold">Select a Prep Pack</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Choose a target position from the list on the left to inspect
                  tailored interview questions, STAR outlines, and study plans.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}

export default function InterviewPrepPage() {
  return (
    <Suspense
      fallback={
        <PageShell
          title="Interview Prep Packs"
          description="Tailored questions, grounded STAR outlines, skill-gap roadmaps, and day-of checklists."
        >
          <div className="py-12 text-center text-xs text-muted-foreground">
            Loading prep pack workspace...
          </div>
        </PageShell>
      }
    >
      <InterviewPrepContent />
    </Suspense>
  );
}
