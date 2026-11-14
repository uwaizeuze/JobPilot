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
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Kanban,
  MessageSquare,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
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
import { cn } from "@/lib/utils";

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


function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return then.toLocaleDateString();
}

function getActivityColor(type: string): string {
  const map: Record<string, string> = {
    job_discovered: "bg-primary",
    application_submitted: "bg-emerald-500",
    interview_scheduled: "bg-indigo-500",
    offer_received: "bg-amber-500",
    status_update: "bg-blue-500",
  };
  return map[type] ?? "bg-muted-foreground";
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function MetricSkeleton() {
  return (
    <Card className="relative overflow-hidden border-border/60">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="animate-pulse h-3 bg-muted rounded w-24" />
            <div className="animate-pulse h-8 bg-muted rounded w-16" />
            <div className="animate-pulse h-3 bg-muted rounded w-32" />
          </div>
          <div className="animate-pulse rounded-xl bg-muted h-12 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  iconBg,
  iconColor,
  valueColor,
}: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden border-border/60 hover:border-border hover:shadow-md transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
              {label}
            </p>
            <p className={cn("text-3xl font-bold text-foreground", valueColor)}>
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={cn("rounded-xl p-3 ml-3 shrink-0", iconBg)}>
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[
        {
          icon: Search,
          title: "Discover Jobs",
          description:
            "Let AI scan thousands of job boards and surface the best matches for your profile.",
          href: "/jobs",
          cta: "Start Discovering",
          iconBg: "bg-primary/10",
          iconColor: "text-primary",
        },
        {
          icon: FileText,
          title: "Build Your Resume",
          description:
            "Create an AI-tailored resume that highlights your strengths for each role.",
          href: "/resumes",
          cta: "Create Resume",
          iconBg: "bg-emerald-500/10",
          iconColor: "text-emerald-600",
        },
        {
          icon: MessageSquare,
          title: "Practice Interviews",
          description:
            "Hone your skills with AI mock interviews and get real-time feedback.",
          href: "/interviews/mock",
          cta: "Start Practicing",
          iconBg: "bg-indigo-500/10",
          iconColor: "text-indigo-600",
        },
      ].map(({ icon: Icon, title, description, href, cta, iconBg, iconColor }) => (
        <Card
          key={title}
          className="border-border/60 hover:border-border hover:shadow-md transition-all duration-200"
        >
          <CardContent className="p-6 space-y-4">
            <div className={cn("rounded-xl p-3 w-fit", iconBg)}>
              <Icon className={cn("h-6 w-6", iconColor)} />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs w-full">
              <Link href={href}>
                {cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("Welcome back");

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
        if (!ignore) {
          setLoading(false);
          const hour = new Date().getHours();
          if (hour < 12) {
            setGreeting("Good morning");
          } else if (hour < 17) {
            setGreeting("Good afternoon");
          } else {
            setGreeting("Good evening");
          }
        }
      }
    }
    loadStats();
    return () => {
      ignore = true;
    };
  }, []);

  const isEmpty =
    !loading &&
    stats &&
    stats.jobsDiscovered === 0 &&
    stats.applicationsSubmitted === 0;

  const metrics: MetricCardProps[] = [
    {
      label: "Jobs Discovered",
      value: stats?.jobsDiscovered ?? 0,
      description: "Total roles found by AI",
      icon: Briefcase,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "High-Match (80%+)",
      value: stats?.highMatchJobs ?? 0,
      description: "Strong profile alignment",
      icon: Sparkles,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
      valueColor: "text-primary",
    },
    {
      label: "Submitted",
      value: stats?.applicationsSubmitted ?? 0,
      description: "Applications dispatched",
      icon: FileCheck,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-600",
    },
    {
      label: "Awaiting Review",
      value: stats?.awaitingReview ?? 0,
      description: "Pending employer response",
      icon: Clock,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
      valueColor: "text-amber-600",
    },
    {
      label: "Interviews",
      value: stats?.upcomingInterviews ?? 0,
      description: "Scheduled & upcoming",
      icon: Calendar,
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-600",
      valueColor: "text-indigo-600",
    },
    {
      label: "Mock Score Avg",
      value: stats?.mockInterviewAvg ? `${stats.mockInterviewAvg}%` : "—",
      description:
        stats?.mockSessionsCount
          ? `From ${stats.mockSessionsCount} session${stats.mockSessionsCount !== 1 ? "s" : ""}`
          : "No sessions yet",
      icon: Award,
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-600",
    },
  ];

  return (
    <PageShell
      title="Candidate Dashboard"
      description="Autonomous AI job discovery, application pipeline health, interview readiness, and real-time conversion metrics."
      actions={
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="gap-1.5 text-xs shadow-xs">
            <Link href="/jobs">
              <Search className="h-3.5 w-3.5" />
              Discover Jobs
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link href="/tracker">
              <Kanban className="h-3.5 w-3.5" />
              Tracker
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Personalized Greeting Card */}
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-gradient-to-r from-card to-card/60 p-4 shadow-xs">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-foreground">
              {greeting ? `${greeting}! 👋` : "Welcome back! 👋"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Your AI copilot is monitoring career boards and keeping your application pipeline active.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium text-muted-foreground">
              AI Agent Standby
            </span>
          </div>
        </div>

        {/* Failed Tasks Alert */}
        {stats && stats.failedTasksCount > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <span>
                  <strong>{stats.failedTasksCount} background task(s)</strong>{" "}
                  encountered errors and are awaiting retry.
                </span>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 shrink-0 ml-4"
              >
                <Link href="/settings/jobs">
                  Inspect Queues
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Metric Cards */}
        <section>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <MetricSkeleton key={i} />)
              : metrics.map((m) => <MetricCard key={m.label} {...m} />)}
          </div>
        </section>

        {/* Empty state onboarding */}
        {isEmpty && (
          <section>
            <h2 className="text-base font-semibold text-foreground mb-4">
              Get started with JobPilot
            </h2>
            <EmptyState />
          </section>
        )}

        {/* Pipeline Funnel & Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Pipeline Funnel */}
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Application Pipeline
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Conversion rates across the job lifecycle
                  </CardDescription>
                </div>
                <div className="rounded-xl bg-primary/10 p-2.5">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-2 animate-pulse">
                      <div className="flex justify-between">
                        <div className="h-3.5 bg-muted rounded w-32" />
                        <div className="h-3.5 bg-muted rounded w-10" />
                      </div>
                      <div className="h-3 bg-muted rounded-full w-full" />
                    </div>
                  ))
                : [
                    {
                      stage: "Jobs Discovered",
                      count: stats?.conversionFunnel.discovered ?? 0,
                      color: "bg-primary",
                      step: "01",
                    },
                    {
                      stage: "Tracked in Pipeline",
                      count: stats?.conversionFunnel.shortlisted ?? 0,
                      color: "bg-blue-500",
                      step: "02",
                    },
                    {
                      stage: "Dispatched & Applied",
                      count: stats?.conversionFunnel.applied ?? 0,
                      color: "bg-emerald-500",
                      step: "03",
                    },
                    {
                      stage: "Interview Rounds",
                      count: stats?.conversionFunnel.interview ?? 0,
                      color: "bg-indigo-500",
                      step: "04",
                    },
                    {
                      stage: "Offers Received",
                      count: stats?.conversionFunnel.offer ?? 0,
                      color: "bg-amber-500",
                      step: "05",
                    },
                  ].map(({ stage, count, color, step }) => {
                    const maxCount = Math.max(
                      1,
                      stats?.conversionFunnel.discovered ?? 1
                    );
                    const percent = Math.min(
                      100,
                      Math.round((count / maxCount) * 100)
                    );
                    return (
                      <div key={stage} className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {step}
                            </span>
                            <span className="font-medium text-foreground">{stage}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">
                              {percent}%
                            </span>
                            <span className="font-bold text-foreground w-6 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700",
                              color
                            )}
                            style={{ width: `${Math.max(2, percent)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Live audit stream of agent actions
                  </CardDescription>
                </div>
                <div className="rounded-xl bg-primary/10 p-2.5">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="h-2.5 w-2.5 rounded-full bg-muted mt-1.5 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 bg-muted rounded w-40" />
                        <div className="h-3 bg-muted rounded w-56" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !stats || stats.recentActivity.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="rounded-xl bg-muted/50 p-4 w-fit mx-auto">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      No activity yet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Start discovering jobs to see your pipeline in action.
                    </p>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                  >
                    <Link href="/jobs">
                      Discover Opportunities
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="relative max-h-[340px] overflow-y-auto">
                  <div className="absolute left-[27px] top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-0 divide-y divide-border/50">
                    {stats.recentActivity.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors relative"
                      >
                        <div
                          className={cn(
                            "h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ring-2 ring-background z-10",
                            getActivityColor(ev.type)
                          )}
                        />
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-foreground leading-tight">
                              {ev.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0 pt-0.5">
                              {formatRelativeTime(ev.timestamp)}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-normal">
                            {ev.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-4">
            Quick Actions
          </h2>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[
              {
                icon: Search,
                label: "Discover Jobs",
                description: "AI-powered job matching",
                href: "/jobs",
                iconBg: "bg-primary/10",
                iconColor: "text-primary",
              },
              {
                icon: Kanban,
                label: "Pipeline Tracker",
                description: "Manage your applications",
                href: "/tracker",
                iconBg: "bg-blue-500/10",
                iconColor: "text-blue-600",
              },
              {
                icon: MessageSquare,
                label: "Mock Interview",
                description: "Practice & get feedback",
                href: "/interviews/mock",
                iconBg: "bg-indigo-500/10",
                iconColor: "text-indigo-600",
              },
              {
                icon: Zap,
                label: "Background Jobs",
                description: "Monitor AI agents",
                href: "/settings/jobs",
                iconBg: "bg-amber-500/10",
                iconColor: "text-amber-600",
              },
            ].map(({ icon: Icon, label, description, href, iconBg, iconColor }) => (
              <Link key={label} href={href}>
                <Card className="border-border/60 hover:border-border hover:shadow-md transition-all duration-200 cursor-pointer h-full">
                  <CardContent className="p-4 space-y-3">
                    <div className={cn("rounded-xl p-2.5 w-fit", iconBg)}>
                      <Icon className={cn("h-5 w-5", iconColor)} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {label}
                      </p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
