"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Award,
  Briefcase,
  Calendar,
  Clock,
  FileCheck,
  Kanban,
  Loader2,
  MessageSquare,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DashboardStats {
  jobsDiscovered: number;
  highMatchJobs: number;
  applicationsSubmitted: number;
  awaitingReview: number;
  upcomingInterviews: number;
  offersCount: number;
  mockInterviewAvg: number;
  mockSessionsCount: number;
  failedTasksCount: number;
  conversionFunnel: {
    discovered: number;
    shortlisted: number;
    applied: number;
    interview: number;
    offer: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadStats() {
      try {
        const res = await fetch("/api/analytics/dashboard");
        if (!ignore && res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (err) {
        console.error("Error loading dashboard stats:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadStats();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <PageShell
      title="Candidate Dashboard"
      description="Autonomous AI job discovery, application pipeline health, interview practice readiness, and real-time conversion metrics."
    >
      {/* Quick Action Navigation Buttons */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <Button asChild size="sm" className="gap-1.5 text-xs">
          <Link href="/jobs">
            <Briefcase className="h-3.5 w-3.5" />
            Discover Jobs
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
          <Link href="/tracker">
            <Kanban className="h-3.5 w-3.5" />
            Pipeline Tracker
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
          <Link href="/interviews/mock">
            <MessageSquare className="h-3.5 w-3.5" />
            Practice Mock Interview
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
          <Link href="/settings/jobs">
            <Activity className="h-3.5 w-3.5" />
            Background Job Monitor
          </Link>
        </Button>
      </div>

      {/* Failed Tasks Alert (if any) */}
      {stats && stats.failedTasksCount > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2 text-xs">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>
                <strong>{stats.failedTasksCount} background task(s)</strong> encountered errors and are awaiting retry in the queue inspector.
              </span>
            </div>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Link href="/settings/jobs">
                Inspect Queues
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* High-Level Metric Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              Jobs Discovered
              <Briefcase className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="text-2xl font-bold">{loading ? "—" : stats?.jobsDiscovered || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              High-Match (80%+)
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="text-2xl font-bold text-primary">{loading ? "—" : stats?.highMatchJobs || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              Submitted
              <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-600">{loading ? "—" : stats?.applicationsSubmitted || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              Awaiting Review
              <Clock className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-600">{loading ? "—" : stats?.awaitingReview || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              Interviews
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-indigo-600">{loading ? "—" : stats?.upcomingInterviews || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              Mock Score Avg
              <Award className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="text-2xl font-bold">
              {loading ? "—" : stats?.mockInterviewAvg ? `${stats.mockInterviewAvg}%` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Conversion Funnel & Quick Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pipeline Conversion Funnel */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Application Pipeline Funnel</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <CardDescription className="text-xs">
              Conversion rates across the autonomous job discovery and interview lifecycle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1 text-xs">
            {[
              {
                stage: "1. Jobs Discovered",
                count: stats?.conversionFunnel.discovered || 0,
                color: "bg-muted",
              },
              {
                stage: "2. Tracked in Pipeline",
                count: stats?.conversionFunnel.shortlisted || 0,
                color: "bg-blue-500",
              },
              {
                stage: "3. Dispatched & Applied",
                count: stats?.conversionFunnel.applied || 0,
                color: "bg-emerald-500",
              },
              {
                stage: "4. Interview Rounds",
                count: stats?.conversionFunnel.interview || 0,
                color: "bg-indigo-500",
              },
              {
                stage: "5. Offers Received",
                count: stats?.conversionFunnel.offer || 0,
                color: "bg-amber-500",
              },
            ].map(({ stage, count, color }) => {
              const maxCount = Math.max(1, stats?.conversionFunnel.discovered || 1);
              const percent = Math.min(100, Math.round((count / maxCount) * 100));

              return (
                <div key={stage} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-foreground">{stage}</span>
                    <span className="font-semibold text-foreground">{count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className={`h-full transition-all ${color}`}
                      style={{ width: `${Math.max(4, percent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Activity Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Pipeline Activity</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <CardDescription className="text-xs">
              Live audit stream of application status advancements and agent actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground text-xs">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading activity...
              </div>
            ) : !stats || stats.recentActivity.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-3">
                <p>No recent activity recorded yet.</p>
                <Button asChild variant="outline" size="sm" className="text-xs gap-1">
                  <Link href="/jobs">
                    Discover Opportunities
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border text-xs max-h-[300px] overflow-y-auto">
                {stats.recentActivity.map((ev) => (
                  <div key={ev.id} className="p-3.5 space-y-1 hover:bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{ev.title}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      {ev.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
