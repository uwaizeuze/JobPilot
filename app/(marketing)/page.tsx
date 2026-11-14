import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  FileText,
  Kanban,
  MessageSquare,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "JobPilot — Autonomous AI Job Search & Application Agent",
  description:
    "Autonomously ingest job listings, generate ATS-tailored resumes and custom cover letters, track interview pipelines, and land your next dream role.",
  alternates: {
    canonical: "/",
  },
};

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 py-24 md:py-36 overflow-hidden">
        {/* Background gradient */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,hsl(var(--primary)/0.12),transparent)]"
        />

        <Badge variant="secondary" className="mb-6 gap-1.5 text-xs font-medium">
          <Sparkles className="h-3 w-3" />
          AI-Powered Job Search
        </Badge>

        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl max-w-3xl">
          Your AI-Powered{" "}
          <span className="text-primary">Job Search</span>{" "}
          Workspace
        </h1>

        <p className="mt-6 max-w-xl text-base text-muted-foreground leading-relaxed md:text-lg">
          JobPilot autonomously discovers roles, tailors your applications, and
          coaches you through interviews — so you can focus on the conversations
          that matter.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="gap-2 px-6">
            <Link href="/register">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-6">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 pb-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Everything you need to land your next role
            </h2>
            <p className="mt-3 text-muted-foreground text-sm max-w-xl mx-auto">
              A unified workspace powered by AI agents that work while you sleep.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Search,
                title: "AI Job Discovery",
                description:
                  "Continuously scans job boards and surfaces high-match opportunities tailored to your profile.",
                iconBg: "bg-primary/10",
                iconColor: "text-primary",
              },
              {
                icon: FileText,
                title: "Smart Resume Builder",
                description:
                  "Craft AI-tailored resumes and cover letters that speak directly to each job description.",
                iconBg: "bg-emerald-500/10",
                iconColor: "text-emerald-600",
              },
              {
                icon: Kanban,
                title: "Application Tracker",
                description:
                  "Visual pipeline to track every application from discovered to offer — in one place.",
                iconBg: "bg-blue-500/10",
                iconColor: "text-blue-600",
              },
              {
                icon: MessageSquare,
                title: "Mock Interviews",
                description:
                  "Practice with an AI interviewer that gives real-time feedback on your answers and delivery.",
                iconBg: "bg-indigo-500/10",
                iconColor: "text-indigo-600",
              },
              {
                icon: Zap,
                title: "Autonomous Agents",
                description:
                  "Background AI agents handle discovery, outreach prep, and status monitoring 24/7.",
                iconBg: "bg-amber-500/10",
                iconColor: "text-amber-600",
              },
              {
                icon: Briefcase,
                title: "Pipeline Analytics",
                description:
                  "Track conversion rates, interview ratios, and offer velocity to optimize your strategy.",
                iconBg: "bg-rose-500/10",
                iconColor: "text-rose-600",
              },
            ].map(({ icon: Icon, title, description, iconBg, iconColor }) => (
              <Card
                key={title}
                className="border-border/60 hover:border-border hover:shadow-md transition-all duration-200"
              >
                <CardContent className="p-6 space-y-4">
                  <div className={`rounded-xl p-3 w-fit ${iconBg}`}>
                    <Icon className={`h-6 w-6 ${iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-4 pb-24">
        <div className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 px-8 py-12 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,hsl(var(--primary)/0.15),transparent)]"
            />
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-primary">
                JobPilot
              </span>
            </div>
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl mb-3">
              Ready to automate your job search?
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
              Join thousands of job seekers who let AI handle the grunt work
              while they focus on the interviews.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild size="lg" className="gap-2 px-8">
                <Link href="/register">
                  Create Free Account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
