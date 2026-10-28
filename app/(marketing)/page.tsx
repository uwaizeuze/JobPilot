import Link from "next/link";

import { FoundationNotice } from "@/components/layout/foundation-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16">
      <FoundationNotice />
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Badge variant="secondary">Personal job-search agent</Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            JobPilot
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Discover jobs from permitted sources, match them against a verified
            profile, prepare applications, and track progress. This Phase 1
            build is the UI and architecture foundation only.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/register">Create account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">View UI shells</Link>
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>What exists now</CardTitle>
            <CardDescription>
              Honest status — later phases add real data and integrations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Working: app shell, theme tokens, dark/light/system toggle.</p>
            <p>Not working: auth, MongoDB, AI, job APIs, application submit.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
