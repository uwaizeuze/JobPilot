"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Award,
  BookOpen,
  Code2,
  Flame,
  MessageSquare,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  StopCircle,
  TrendingUp,
} from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AnswerRecord {
  questionNumber: number;
  questionText: string;
  answerText: string;
  feedback: {
    scores: {
      clarity: number;
      structure: number;
      technicalAccuracy: number;
      depth: number;
      relevance: number;
    };
    totalScore: number;
    strengths: string[];
    weaknesses: string[];
    sampleAnswer: string;
  };
}

interface SessionData {
  _id: string;
  interviewType: "technical" | "behavioral" | "system_design" | "mixed";
  difficulty: "junior" | "mid" | "senior" | "staff";
  status: "in_progress" | "completed" | "paused" | "abandoned";
  overallScore?: number;
  rubricSummary?: {
    clarity: number;
    structure: number;
    technicalAccuracy: number;
    depth: number;
    relevance: number;
  };
  weakTopics?: string[];
  recommendedPractice?: string[];
  summary?: string;
}

function MockInterviewContent() {
  const searchParams = useSearchParams();
  const initialJobId = searchParams.get("jobId") || "";

  // Setup state
  const [session, setSession] = useState<SessionData | null>(null);
  const [roleTitle, setRoleTitle] = useState("Full Stack Software Engineer");
  const [jobId] = useState(initialJobId);
  const [interviewType, setInterviewType] = useState<
    "technical" | "behavioral" | "system_design" | "mixed"
  >("mixed");
  const [difficulty, setDifficulty] = useState<
    "junior" | "mid" | "senior" | "staff"
  >("mid");
  const [totalQuestions, setTotalQuestions] = useState(4);

  // Active in-session state
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [currentQuestionText, setCurrentQuestionText] = useState("");
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [answeredHistory, setAnsweredHistory] = useState<AnswerRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<AnswerRecord["feedback"] | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Start a new session
  async function handleStartSession() {
    try {
      setStarting(true);
      setErrorMsg("");
      const res = await fetch("/api/interviews/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: jobId || undefined,
          roleTitle,
          interviewType,
          difficulty,
          totalQuestions,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start mock session");
      }

      const data = await res.json();
      setSession(data.session);
      setCurrentQuestionText(data.firstQuestion);
      setCurrentQuestionNumber(1);
      setAnsweredHistory([]);
      setCandidateAnswer("");
      setLastFeedback(null);
      setIsCompleted(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error starting session");
    } finally {
      setStarting(false);
    }
  }

  // Submit single answer
  async function handleSubmitAnswer() {
    if (!session || !candidateAnswer.trim() || submitting) return;

    try {
      setSubmitting(true);
      setErrorMsg("");
      const res = await fetch(`/api/interviews/sessions/${session._id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionNumber: currentQuestionNumber,
          questionText: currentQuestionText,
          answerText: candidateAnswer,
          totalQuestions,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to evaluate answer");
      }

      const data = await res.json();
      const ansRecord: AnswerRecord = {
        questionNumber: currentQuestionNumber,
        questionText: currentQuestionText,
        answerText: candidateAnswer,
        feedback: data.answer.feedback,
      };

      setAnsweredHistory((prev) => [...prev, ansRecord]);
      setLastFeedback(data.answer.feedback);
      setCandidateAnswer("");

      if (data.isCompleted) {
        setIsCompleted(true);
        if (data.sessionSummary) {
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  status: "completed",
                  overallScore: data.sessionSummary.overallScore,
                  rubricSummary: data.sessionSummary.rubricSummary,
                  weakTopics: data.sessionSummary.weakTopics,
                  recommendedPractice: data.sessionSummary.recommendedPractice,
                  summary: data.sessionSummary.summary,
                }
              : null
          );
        }
      } else {
        setCurrentQuestionNumber((prev) => prev + 1);
        if (data.nextQuestion) {
          setCurrentQuestionText(data.nextQuestion);
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error submitting answer");
    } finally {
      setSubmitting(false);
    }
  }

  // End or abandon session early
  async function handleEndEarly() {
    if (!session) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/interviews/sessions/${session._id}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setIsCompleted(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setSession(null);
    setAnsweredHistory([]);
    setLastFeedback(null);
    setIsCompleted(false);
    setCandidateAnswer("");
  }

  return (
    <PageShell
      title="Mock Interview Room"
      description="Interactive text-based interview practice with one question at a time and instant rubric evaluations."
    >
      {errorMsg && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* State 1: Configuration / Setup Card */}
      {!session ? (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Configure Your Mock Interview</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Select your target role, focus domain, and difficulty level. The AI
                interviewer will ask questions one at a time and grade your responses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Target Role or Title</label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer, Cloud Architect"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1">Interview Type</label>
                  <select
                    value={interviewType}
                    onChange={(e) =>
                      setInterviewType(
                        e.target.value as "technical" | "behavioral" | "system_design" | "mixed"
                      )
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="mixed">Mixed (Technical + Behavioral + System)</option>
                    <option value="technical">Technical Architecture & Coding</option>
                    <option value="behavioral">Behavioral & Leadership (STAR)</option>
                    <option value="system_design">System Design & Scalability</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Seniority Level</label>
                  <select
                    value={difficulty}
                    onChange={(e) =>
                      setDifficulty(
                        e.target.value as "junior" | "mid" | "senior" | "staff"
                      )
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="junior">Junior / Associate</option>
                    <option value="mid">Mid-Level</option>
                    <option value="senior">Senior Engineer</option>
                    <option value="staff">Staff / Principal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Question Count</label>
                <div className="flex gap-2">
                  {[3, 4, 5, 8].map((count) => (
                    <Button
                      key={count}
                      type="button"
                      variant={totalQuestions === count ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTotalQuestions(count)}
                      className="text-xs"
                    >
                      {count} Questions
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-between">
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/interviews/history">View History & Score Trends</Link>
              </Button>
              <Button
                size="sm"
                onClick={handleStartSession}
                disabled={starting}
                className="gap-2 shadow-xs"
              >
                <Play className="h-4 w-4" />
                {starting ? "Starting Session..." : "Enter Mock Room"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : isCompleted ? (
        /* State 3: Completed Session Summary */
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  <CardTitle className="text-lg">Interview Session Completed</CardTitle>
                </div>
                <Badge className="bg-emerald-600 text-white text-xs">
                  Overall Score: {session.overallScore || 0}%
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Here is your comprehensive rubric performance report, weak topics, and
                recommended practice roadmap.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground bg-background p-3 rounded-lg border">
                {session.summary}
              </p>

              {/* Rubric Breakdown */}
              {session.rubricSummary && (
                <div>
                  <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    Rubric Competency Averages
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-lg border bg-background">
                      <span className="text-[10px] text-muted-foreground block">
                        Clarity (15%)
                      </span>
                      <span className="font-bold text-sm">
                        {session.rubricSummary.clarity}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-background">
                      <span className="text-[10px] text-muted-foreground block">
                        Structure (20%)
                      </span>
                      <span className="font-bold text-sm">
                        {session.rubricSummary.structure}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-background">
                      <span className="text-[10px] text-muted-foreground block">
                        Technical (25%)
                      </span>
                      <span className="font-bold text-sm">
                        {session.rubricSummary.technicalAccuracy}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-background">
                      <span className="text-[10px] text-muted-foreground block">
                        Depth (20%)
                      </span>
                      <span className="font-bold text-sm">
                        {session.rubricSummary.depth}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-background">
                      <span className="text-[10px] text-muted-foreground block">
                        Relevance (20%)
                      </span>
                      <span className="font-bold text-sm">
                        {session.rubricSummary.relevance}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Weak Topics & Practice Recommendations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {session.weakTopics && session.weakTopics.length > 0 && (
                  <div className="p-3 rounded-lg border bg-background space-y-2">
                    <h5 className="text-xs font-semibold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <Flame className="h-3.5 w-3.5" />
                      Areas for Sharpening
                    </h5>
                    <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                      {session.weakTopics.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {session.recommendedPractice &&
                  session.recommendedPractice.length > 0 && (
                    <div className="p-3 rounded-lg border bg-background space-y-2">
                      <h5 className="text-xs font-semibold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                        <BookOpen className="h-3.5 w-3.5" />
                        Recommended Practice
                      </h5>
                      <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                        {session.recommendedPractice.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-between">
              <Button size="sm" variant="outline" onClick={handleReset} className="gap-2 text-xs">
                <RotateCcw className="h-3.5 w-3.5" />
                Start Another Session
              </Button>
              <Button asChild size="sm" className="text-xs">
                <Link href="/interviews/history">View All Session Analytics</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        /* State 2: Active In-Session Room */
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Interview Q&A Column */}
          <div className="space-y-6 lg:col-span-8">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Question {currentQuestionNumber} of {totalQuestions}
                    </Badge>
                    <Badge variant="secondary" className="capitalize text-[10px]">
                      {session.interviewType}
                    </Badge>
                    <Badge variant="secondary" className="capitalize text-[10px]">
                      {session.difficulty}
                    </Badge>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEndEarly}
                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <StopCircle className="h-3.5 w-3.5 mr-1" />
                    End Early
                  </Button>
                </div>

                <div className="mt-3 p-4 rounded-lg border bg-primary/5 border-primary/20">
                  <h3 className="text-sm font-semibold leading-relaxed text-foreground">
                    {currentQuestionText}
                  </h3>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold">Your Response</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCodeMode(!isCodeMode)}
                    className="text-[11px] h-7 gap-1 text-muted-foreground"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    {isCodeMode ? "Text Mode" : "Code Editor Mode"}
                  </Button>
                </div>

                <textarea
                  rows={isCodeMode ? 10 : 7}
                  value={candidateAnswer}
                  onChange={(e) => setCandidateAnswer(e.target.value)}
                  placeholder={
                    isCodeMode
                      ? "// Paste or write your solution / technical pseudocode here..."
                      : "Type your structured response. Mention concrete engineering decisions, STAR frameworks, or technical tradeoffs..."
                  }
                  className={`w-full rounded-md border border-input bg-background p-3 text-xs shadow-xs focus:ring-1 focus:ring-primary focus:outline-hidden ${
                    isCodeMode ? "font-mono bg-muted/30" : ""
                  }`}
                />
              </CardContent>

              <CardFooter className="border-t pt-3 flex justify-between items-center">
                <span className="text-[11px] text-muted-foreground">
                  Words: {candidateAnswer.trim().split(/\s+/).filter(Boolean).length}
                </span>

                <Button
                  size="sm"
                  onClick={handleSubmitAnswer}
                  disabled={submitting || !candidateAnswer.trim()}
                  className="gap-2 text-xs shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Grading Answer..." : "Submit Answer"}
                </Button>
              </CardFooter>
            </Card>

            {/* Answer Feedback Scorecard */}
            {lastFeedback && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Feedback on Question {answeredHistory.length}
                    </CardTitle>
                    <Badge className="bg-primary text-primary-foreground text-xs font-mono">
                      Rubric: {lastFeedback.totalScore}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  {/* Category Scores */}
                  <div className="grid grid-cols-5 gap-1.5 text-center">
                    <div className="p-1.5 rounded-md border bg-background">
                      <span className="text-[9px] text-muted-foreground block">Clarity</span>
                      <span className="font-bold">{lastFeedback.scores.clarity}%</span>
                    </div>
                    <div className="p-1.5 rounded-md border bg-background">
                      <span className="text-[9px] text-muted-foreground block">Structure</span>
                      <span className="font-bold">{lastFeedback.scores.structure}%</span>
                    </div>
                    <div className="p-1.5 rounded-md border bg-background">
                      <span className="text-[9px] text-muted-foreground block">Technical</span>
                      <span className="font-bold">{lastFeedback.scores.technicalAccuracy}%</span>
                    </div>
                    <div className="p-1.5 rounded-md border bg-background">
                      <span className="text-[9px] text-muted-foreground block">Depth</span>
                      <span className="font-bold">{lastFeedback.scores.depth}%</span>
                    </div>
                    <div className="p-1.5 rounded-md border bg-background">
                      <span className="text-[9px] text-muted-foreground block">Relevance</span>
                      <span className="font-bold">{lastFeedback.scores.relevance}%</span>
                    </div>
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded-md border bg-emerald-500/5 border-emerald-500/20">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">
                        Observed Strengths
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                        {lastFeedback.strengths.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-2.5 rounded-md border bg-amber-500/5 border-amber-500/20">
                      <span className="font-semibold text-amber-600 dark:text-amber-400 block mb-1">
                        Areas to Sharpen
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                        {lastFeedback.weaknesses.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Improved Sample Answer */}
                  <div className="p-2.5 rounded-md border bg-background">
                    <span className="font-semibold block mb-1 text-foreground">
                      Model High-Scoring Response (Grounded)
                    </span>
                    <p className="text-muted-foreground leading-relaxed">
                      {lastFeedback.sampleAnswer}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: In-Session History */}
          <div className="space-y-4 lg:col-span-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Answered Questions ({answeredHistory.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {answeredHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    Answers and rubric grades will be logged here as you progress.
                  </p>
                ) : (
                  answeredHistory.map((rec, i) => (
                    <div key={i} className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[11px]">
                          Q{rec.questionNumber}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {rec.feedback.totalScore}%
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {rec.questionText}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold">Evaluation Rubric</CardTitle>
              </CardHeader>
              <CardContent className="text-[11px] text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Technical Accuracy</span>
                  <span className="font-mono">25%</span>
                </div>
                <div className="flex justify-between">
                  <span>STAR / Problem Structure</span>
                  <span className="font-mono">20%</span>
                </div>
                <div className="flex justify-between">
                  <span>Tradeoff Depth</span>
                  <span className="font-mono">20%</span>
                </div>
                <div className="flex justify-between">
                  <span>Relevance</span>
                  <span className="font-mono">20%</span>
                </div>
                <div className="flex justify-between">
                  <span>Clarity & Brevity</span>
                  <span className="font-mono">15%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageShell>
  );
}

export default function MockInterviewPage() {
  return (
    <Suspense
      fallback={
        <PageShell
          title="Mock Interview Room"
          description="Interactive text-based interview practice with one question at a time and instant rubric evaluations."
        >
          <div className="py-12 text-center text-xs text-muted-foreground">
            Loading mock interview room...
          </div>
        </PageShell>
      }
    >
      <MockInterviewContent />
    </Suspense>
  );
}
