"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  FileText,
  Sparkles,
  UploadCloud,
} from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [roleTitle, setRoleTitle] = useState("Software Engineer");
  const [location, setLocation] = useState("Remote / Global");
  const [workMode, setWorkMode] = useState<"remote" | "hybrid" | "onsite">("remote");
  const [experienceYears, setExperienceYears] = useState("4");
  const [skills, setSkills] = useState("React, TypeScript, Node.js, Next.js");
  const [completed, setCompleted] = useState(false);

  function handleComplete() {
    setCompleted(true);
  }

  return (
    <PageShell
      title="Candidate Onboarding Wizard"
      description="Set up your job search parameters and initial criteria so our AI agents can surface high-match roles."
    >
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-border/70 pb-4">
          {[
            { num: 1, label: "Target Roles", icon: Briefcase },
            { num: 2, label: "Skills & Experience", icon: Sparkles },
            { num: 3, label: "Resume & Launch", icon: FileText },
          ].map((item) => (
            <div
              key={item.num}
              className={`flex items-center gap-2 text-xs font-semibold ${
                step === item.num
                  ? "text-primary"
                  : step > item.num
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step === item.num
                    ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
                    : step > item.num
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > item.num ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  item.num
                )}
              </div>
              <span className="hidden sm:inline">{item.label}</span>
            </div>
          ))}
        </div>

        {completed ? (
          <Card className="border-emerald-500/30 bg-emerald-500/5 text-center p-8 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold">Preferences Saved!</CardTitle>
              <CardDescription className="text-xs">
                Your target role preferences ({roleTitle}, {workMode}) are configured.
              </CardDescription>
            </div>
            <div className="pt-2 flex flex-wrap gap-3 justify-center">
              <Button asChild size="sm" className="gap-1.5 text-xs">
                <Link href="/jobs">
                  <Sparkles className="h-3.5 w-3.5" />
                  Explore Discovered Jobs
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                <Link href="/resumes">
                  <UploadCloud className="h-3.5 w-3.5" />
                  Upload Master Resume
                </Link>
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="border-border/60 shadow-sm">
            {step === 1 && (
              <>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    Step 1: Your Target Position
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Define the roles and work style you are seeking.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="roleTitle" className="text-xs font-semibold">
                      Primary Target Job Title
                    </Label>
                    <Input
                      id="roleTitle"
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                      placeholder="e.g. Senior Frontend Engineer"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="location" className="text-xs font-semibold">
                      Preferred Location or Region
                    </Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. United States, Remote, London, Bengaluru"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Work Mode Preference</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["remote", "hybrid", "onsite"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setWorkMode(mode)}
                          className={`rounded-lg border p-3 text-center text-xs font-medium capitalize transition-all ${
                            workMode === mode
                              ? "border-primary bg-primary/10 text-primary shadow-xs"
                              : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => setStep(2)}
                    className="gap-1.5 text-xs shadow-xs"
                  >
                    Next: Skills & Experience
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardFooter>
              </>
            )}

            {step === 2 && (
              <>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    Step 2: Experience & Core Competencies
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Our AI uses these keywords to calculate match percentages against ATS postings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="years" className="text-xs font-semibold">
                      Years of Relevant Experience
                    </Label>
                    <Input
                      id="years"
                      type="number"
                      min="0"
                      max="40"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="skills" className="text-xs font-semibold">
                      Key Technical & Domain Skills (Comma separated)
                    </Label>
                    <Input
                      id="skills"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="e.g. Python, AWS, Docker, Kubernetes, GraphQL"
                      className="text-xs h-9"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Skills are verified when you upload your resume to ensure 100% factual accuracy.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="text-xs"
                  >
                    Back
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setStep(3)}
                    className="gap-1.5 text-xs shadow-xs"
                  >
                    Next: Launch Workspace
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardFooter>
              </>
            )}

            {step === 3 && (
              <>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    Step 3: Ready to Launch JobPilot
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Your profile foundation is ready. You can now discover verified postings or upload your master resume.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                    <h4 className="font-semibold text-foreground">Summary of Search Profile:</h4>
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                      <div>Role: <span className="text-foreground font-medium">{roleTitle}</span></div>
                      <div>Mode: <span className="text-foreground font-medium capitalize">{workMode}</span></div>
                      <div>Location: <span className="text-foreground font-medium">{location}</span></div>
                      <div>Experience: <span className="text-foreground font-medium">{experienceYears} Years</span></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <Sparkles className="h-5 w-5 text-primary shrink-0" />
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      Next step: Upload your original PDF or DOCX resume in Resume Management to unlock tailored drafts and mock interview coaching.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="text-xs"
                  >
                    Back
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleComplete}
                    className="gap-1.5 text-xs shadow-xs"
                  >
                    Complete Setup
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </Button>
                </CardFooter>
              </>
            )}
          </Card>
        )}
      </div>
    </PageShell>
  );
}
