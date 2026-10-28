"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Flame,
  Play,
  Trash2,
  TrendingUp,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AnalyticsResponse {
  totalSessions: number;
  averageScore: number;
  completedSessions: number;
  scoreTrend: Array<{ date: string; score: number; type: string }>;
  rubricAverages: {
    clarity: number;
    structure: number;
    technicalAccuracy: number;
    depth: number;
    relevance: number;
  };
  weakTopics: string[];
  recommendedPractice: string[];
  sessions: Array<{
    _id: string;
    interviewType: string;
    difficulty: string;
    durationMinutes: number;
    status: string;
    overallScore?: number;
    summary?: string;
    createdAt: string;
  }>;
}

export default function InterviewHistoryPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/interviews/sessions");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to permanently delete this interview transcript?")) {
      return;
    }
    try {
      setDeletingId(id);
      const res = await fetch(`/api/interviews/sessions/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchHistory();
      }
    } finally {
      setDeletingId(null);
    }
  }

  const sessions = data?.sessions || [];

  return (
    <PageShell
      title="Interview History & Analytics"
      description="Track performance trends across interview types, review rubric competencies, and isolate weak topics."
    >
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total Sessions</CardDescription>
              <CardTitle className="text-2xl font-bold">
                {data?.totalSessions ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-[11px] text-muted-foreground">
                {data?.completedSessions ?? 0} completed
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Average Score</CardDescription>
              <CardTitle className="text-2xl font-bold">
                {data?.averageScore ?? 0}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-[11px] text-muted-foreground">
                Weighted across 5 rubric factors
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Weak Topics Flagged</CardDescription>
              <CardTitle className="text-2xl font-bold">
                {data?.weakTopics?.length ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-[11px] text-muted-foreground">
                Feeding upcoming prep packs
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Practice Drills</CardDescription>
              <CardTitle className="text-2xl font-bold">
                {data?.recommendedPractice?.length ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-[11px] text-muted-foreground">
                Actionable study plans
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Rubric Overview */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Score Trends */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Recent Score Trends
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Overall rubric scores across chronological sessions.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {data?.scoreTrend && data.scoreTrend.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-end gap-2 h-36 pt-4 border-b">
                    {data.scoreTrend.map((item, idx) => {
                      const heightPercent = Math.max(15, Math.min(100, item.score));
                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
                        >
                          <span className="text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.score}%
                          </span>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t transition-all ${
                              item.score >= 80
                                ? "bg-emerald-500"
                                : item.score >= 70
                                ? "bg-primary"
                                : "bg-amber-500"
                            }`}
                          />
                          <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                            {item.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> &ge;80%
                      Strong
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-primary" /> 70-79% Proficient
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" /> &lt;70% Needs
                      Drill
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No completed mock interviews recorded yet. Complete a session in the Mock Room to see trends.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rubric Category Averages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-primary" />
                Rubric Competency Averages
              </CardTitle>
              <CardDescription className="text-xs">
                Performance breakdown across the 5 evaluation pillars.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.rubricAverages ? (
                <div className="space-y-3 pt-1 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">Technical Accuracy (25%)</span>
                      <span className="font-mono font-bold">
                        {data.rubricAverages.technicalAccuracy}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        style={{ width: `${data.rubricAverages.technicalAccuracy}%` }}
                        className="h-full bg-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">STAR Structure & Flow (20%)</span>
                      <span className="font-mono font-bold">
                        {data.rubricAverages.structure}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        style={{ width: `${data.rubricAverages.structure}%` }}
                        className="h-full bg-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">Tradeoff & Edge-Case Depth (20%)</span>
                      <span className="font-mono font-bold">
                        {data.rubricAverages.depth}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        style={{ width: `${data.rubricAverages.depth}%` }}
                        className="h-full bg-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">Relevance to Question (20%)</span>
                      <span className="font-mono font-bold">
                        {data.rubricAverages.relevance}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        style={{ width: `${data.rubricAverages.relevance}%` }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">Clarity & Brevity (15%)</span>
                      <span className="font-mono font-bold">
                        {data.rubricAverages.clarity}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        style={{ width: `${data.rubricAverages.clarity}%` }}
                        className="h-full bg-amber-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  Complete mock interviews to generate competency analytics.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weak Topics & Practice Recommendations */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Flame className="h-4 w-4" />
                Aggregated Weak Topics
              </CardTitle>
              <CardDescription className="text-xs">
                Subjects where answers scored below 75% across past mock sessions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.weakTopics && data.weakTopics.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
                  {data.weakTopics.map((topic, i) => (
                    <li key={i}>{topic}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No consistent weak topics identified yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                <BookOpen className="h-4 w-4" />
                Personalized Practice Roadmap
              </CardTitle>
              <CardDescription className="text-xs">
                Suggested study drills based on rubric gaps.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.recommendedPractice && data.recommendedPractice.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
                  {data.recommendedPractice.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No practice drills suggested yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sessions Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">
                Recorded Mock Interview Sessions
              </CardTitle>
              <CardDescription className="text-xs">
                Private transcripts. Transcripts are never logged publicly and can be deleted anytime.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="gap-1.5 text-xs">
              <Link href="/interviews/mock">
                <Play className="h-3.5 w-3.5" />
                New Session
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Loading session history...
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <p>No mock interview sessions on record.</p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link href="/interviews/mock">Start Your First Mock Interview</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Difficulty</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Score</TableHead>
                    <TableHead className="text-right text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((sess) => (
                    <TableRow key={sess._id}>
                      <TableCell className="text-xs font-medium">
                        {new Date(sess.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-xs capitalize">
                        {sess.interviewType.replace("_", " ")}
                      </TableCell>
                      <TableCell className="text-xs capitalize">
                        {sess.difficulty}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant={
                            sess.status === "completed"
                              ? "default"
                              : sess.status === "in_progress"
                              ? "secondary"
                              : "outline"
                          }
                          className="capitalize text-[10px]"
                        >
                          {sess.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold">
                        {sess.overallScore != null ? `${sess.overallScore}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(sess._id)}
                          disabled={deletingId === sess._id}
                          className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
