"use client";

import { CheckCircle2, Download, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { CompletenessResult } from "@/lib/profile-completeness";

interface SkillItem {
  name: string;
  category?: string;
  yearsOfExperience?: number;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
}

interface EmploymentItem {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  responsibilities: string[];
  achievements: string[];
}

interface EducationItem {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
}

interface ProfileFormData {
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  preferredLocations: string[];
  remotePreference: "remote" | "hybrid" | "onsite" | "flexible";
  headline: string;
  summary: string;
  totalExperienceYears: number;
  currentEmployer: string;
  employmentHistory: EmploymentItem[];
  technicalSkills: SkillItem[];
  education: EducationItem[];
  workAuthorization: string[];
  preferredSeniority: string[];
  urls: {
    portfolio: string;
    github: string;
    linkedin: string;
  };
  compensation: {
    expectedSalary?: number;
    currentSalary?: number;
    currency: string;
  };
  noticePeriodDays: number;
}

const defaultProfile: ProfileFormData = {
  fullName: "",
  email: "",
  phone: "",
  currentLocation: "",
  preferredLocations: ["Remote", "New York, NY"],
  remotePreference: "remote",
  headline: "Full-Stack Software Engineer",
  summary: "Experienced developer specializing in TypeScript, Next.js, and cloud systems.",
  totalExperienceYears: 5,
  currentEmployer: "",
  employmentHistory: [
    {
      company: "Acme Corp",
      title: "Senior Software Engineer",
      startDate: "2022-01",
      current: true,
      responsibilities: [
        "Architected Next.js micro-frontends serving 500k monthly active users.",
        "Built distributed background task queues with Redis and BullMQ.",
      ],
      achievements: [
        "Reduced page load time by 42% through edge caching and code splitting.",
      ],
    },
  ],
  technicalSkills: [
    { name: "TypeScript", proficiency: "expert", yearsOfExperience: 5 },
    { name: "React / Next.js", proficiency: "expert", yearsOfExperience: 5 },
    { name: "Node.js", proficiency: "advanced", yearsOfExperience: 4 },
  ],
  education: [
    {
      institution: "State University",
      degree: "B.S. in Computer Science",
      startYear: 2016,
      endYear: 2020,
    },
  ],
  workAuthorization: ["US Citizen / Authorized to work"],
  preferredSeniority: ["Senior", "Staff"],
  urls: {
    portfolio: "https://example.com",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
  },
  compensation: {
    expectedSalary: 160000,
    currency: "USD",
  },
  noticePeriodDays: 30,
};

export function ProfileEditor() {
  const [profile, setProfile] = useState<ProfileFormData>(defaultProfile);
  const [completeness, setCompleteness] = useState<CompletenessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setProfile((prev) => ({
              ...prev,
              ...data.profile,
              urls: { ...prev.urls, ...(data.profile.urls || {}) },
              compensation: { ...prev.compensation, ...(data.profile.compensation || {}) },
            }));
          }
          if (data.completeness) {
            setCompleteness(data.completeness);
          }
        }
      } catch {
        // Fall back to default profile state
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile");
      }

      setCompleteness(data.completeness);
      setMessage({ text: "Profile updated and verified in database!", type: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setMessage({ text: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete all profile data? This action is permanent.")) {
      return;
    }

    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (res.ok) {
        setMessage({ text: "Profile data wiped successfully.", type: "success" });
        setProfile(defaultProfile);
        setCompleteness(null);
      }
    } catch {
      setMessage({ text: "Delete failed.", type: "error" });
    }
  }

  function addSkill() {
    setProfile((prev) => ({
      ...prev,
      technicalSkills: [
        ...prev.technicalSkills,
        { name: "", proficiency: "intermediate", yearsOfExperience: 1 },
      ],
    }));
  }

  function removeSkill(index: number) {
    setProfile((prev) => ({
      ...prev,
      technicalSkills: prev.technicalSkills.filter((_, i) => i !== index),
    }));
  }

  function updateSkill(index: number, key: keyof SkillItem, value: unknown) {
    setProfile((prev) => {
      const updated = [...prev.technicalSkills];
      updated[index] = { ...updated[index], [key]: value };
      return { ...prev, technicalSkills: updated };
    });
  }

  if (loading) {
    return <div className="py-8 text-sm text-muted-foreground">Loading profile...</div>;
  }

  const score = completeness?.score ?? 85;

  return (
    <div className="space-y-6">
      {/* Completeness Indicator Banner */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Profile Completeness</CardTitle>
              <CardDescription>
                Calculated deterministically from your verified profile data.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">{score}%</span>
              <Badge variant={score >= 80 ? "default" : "secondary"}>
                {score >= 80 ? "Ready for Matching" : "Action Needed"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${score}%` }}
            />
          </div>
          {completeness?.suggestions && completeness.suggestions.length > 0 ? (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Recommendation: </span>
              {completeness.suggestions[0]}
            </div>
          ) : null}
          {completeness?.completedSections ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {completeness.completedSections.map((sec) => (
                <span
                  key={sec}
                  className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
                >
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  {sec}
                </span>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {message ? (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === "success"
              ? "border border-success/40 bg-success/10 text-success"
              : "border border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Contact & Personal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal & Contact</CardTitle>
            <CardDescription>
              Basic information used for job applications and resume headers.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={profile.fullName}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, fullName: e.target.value }))
                }
                placeholder="Ada Lovelace"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="ada@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentLocation">Current Location</Label>
              <Input
                id="currentLocation"
                value={profile.currentLocation}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    currentLocation: e.target.value,
                  }))
                }
                placeholder="San Francisco, CA"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="headline">Professional Headline</Label>
              <Input
                id="headline"
                value={profile.headline}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, headline: e.target.value }))
                }
                placeholder="Senior Full-Stack Engineer | Distributed Systems"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="summary">Executive Summary</Label>
              <textarea
                id="summary"
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={profile.summary}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, summary: e.target.value }))
                }
                placeholder="Summary of experience, technical background, and major achievements..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Technical Skills */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Technical Skills</CardTitle>
                <CardDescription>
                  Verified skills matched deterministically against job requirements.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSkill}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Skill
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.technicalSkills.map((skill, index) => (
              <div key={index} className="flex items-center gap-3">
                <Input
                  className="flex-1"
                  placeholder="Skill name (e.g. TypeScript, Docker)"
                  value={skill.name}
                  onChange={(e) => updateSkill(index, "name", e.target.value)}
                />
                <select
                  className="rounded-md border border-input bg-transparent px-2.5 py-1.5 text-xs text-foreground"
                  value={skill.proficiency}
                  onChange={(e) =>
                    updateSkill(index, "proficiency", e.target.value)
                  }
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
                <Input
                  type="number"
                  className="w-20"
                  placeholder="Yrs"
                  value={skill.yearsOfExperience ?? ""}
                  onChange={(e) =>
                    updateSkill(
                      index,
                      "yearsOfExperience",
                      Number(e.target.value)
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSkill(index)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Work Preferences & Compensation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Preferences & Compensation</CardTitle>
            <CardDescription>
              Used for relevance filtering and eligibility evaluation.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="remotePreference">Work Mode Preference</Label>
              <select
                id="remotePreference"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm"
                value={profile.remotePreference}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    remotePreference: e.target.value as ProfileFormData["remotePreference"],
                  }))
                }
              >
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedSalary">Expected Annual Salary (USD)</Label>
              <Input
                id="expectedSalary"
                type="number"
                value={profile.compensation.expectedSalary ?? ""}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    compensation: {
                      ...prev.compensation,
                      expectedSalary: Number(e.target.value),
                    },
                  }))
                }
                placeholder="160000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalExp">Total Experience (Years)</Label>
              <Input
                id="totalExp"
                type="number"
                value={profile.totalExperienceYears}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    totalExperienceYears: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="noticePeriod">Notice Period (Days)</Label>
              <Input
                id="noticePeriod"
                type="number"
                value={profile.noticePeriodDays}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    noticePeriodDays: Number(e.target.value),
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portfolio & Profiles</CardTitle>
            <CardDescription>Links verified in applications and cover letters.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="portfolio">Portfolio URL</Label>
              <Input
                id="portfolio"
                value={profile.urls.portfolio}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    urls: { ...prev.urls, portfolio: e.target.value },
                  }))
                }
                placeholder="https://mysite.dev"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github">GitHub</Label>
              <Input
                id="github"
                value={profile.urls.github}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    urls: { ...prev.urls, github: e.target.value },
                  }))
                }
                placeholder="https://github.com/user"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                value={profile.urls.linkedin}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    urls: { ...prev.urls, linkedin: e.target.value },
                  }))
                }
                placeholder="https://linkedin.com/in/user"
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving Changes..." : "Save Verified Profile"}
          </Button>

          <div className="flex items-center gap-3">
            <a
              href="/api/profile/export"
              download
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
            >
              <Download className="h-3.5 w-3.5" />
              Export All Data (JSON)
            </a>

            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Delete Profile Data
            </Button>
          </div>
        </div>
      </form>
      <Separator />
    </div>
  );
}
