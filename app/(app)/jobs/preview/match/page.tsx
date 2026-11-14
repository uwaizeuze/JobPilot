import Link from "next/link";
import {
  Award,
  ShieldCheck,
  Sparkles,
  Zap,
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
import { ContrastChartPreview } from "@/components/ui/token-preview";

export default function MatchPage() {
  return (
    <PageShell
      title="Match Analysis & Scoring Engine"
      description="Transparent, deterministic evaluation framework explaining how JobPilot calculates fit between candidate profiles and job postings."
      actions={
        <Button asChild size="sm" className="gap-1.5 text-xs">
          <Link href="/jobs">
            <Sparkles className="h-3.5 w-3.5" />
            Discover & Score Jobs
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Architecture Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/60 p-5 space-y-2">
            <div className="rounded-lg bg-primary/10 p-2.5 w-fit text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Zero Hallucinations</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Match scores are computed strictly against your verified master profile. The engine never infers missing qualifications or fabricates metrics.
            </p>
          </Card>

          <Card className="border-border/60 p-5 space-y-2">
            <div className="rounded-lg bg-emerald-500/10 p-2.5 w-fit text-emerald-600">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Weighted Dimensions</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Evaluates mandatory technical skills (40%), years of experience (25%), location compatibility (15%), title relevance (10%), and education (10%).
            </p>
          </Card>

          <Card className="border-border/60 p-5 space-y-2">
            <div className="rounded-lg bg-indigo-500/10 p-2.5 w-fit text-indigo-600">
              <Award className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Actionable Guidance</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every score outputs explicit recommendations: Apply Immediately (&ge;80%), Tailor First (60-79%), or Address Skill Gaps (&lt;60%).
            </p>
          </Card>
        </div>

        {/* 5 Dimension Breakdown */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Evaluation Criteria Dimensions</CardTitle>
            <CardDescription className="text-xs">
              How the deterministic scoring formula parses requirements and compares them to your experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 text-xs">
            <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Technical Skills</span>
                <Badge variant="secondary" className="text-[10px]">40%</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Direct overlap between required keywords and verified repository/project experience.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Experience</span>
                <Badge variant="secondary" className="text-[10px]">25%</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Total professional tenure vs. required minimum seniority level.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Work Mode</span>
                <Badge variant="secondary" className="text-[10px]">15%</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Remote, hybrid, or onsite compatibility based on candidate geographic location.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Title Alignment</span>
                <Badge variant="secondary" className="text-[10px]">10%</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Semantic closeness of recent titles to the target job requisition.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Education</span>
                <Badge variant="secondary" className="text-[10px]">10%</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Degrees and accredited certifications matching stated minimum thresholds.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Live Token Contrast Demo */}
        <ContrastChartPreview />
      </div>
    </PageShell>
  );
}
