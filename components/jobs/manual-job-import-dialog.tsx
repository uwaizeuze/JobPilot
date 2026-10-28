"use client";

import { CheckCircle2, Loader2, Plus, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ManualJobImportDialogProps {
  onSuccess?: () => void;
}

export function ManualJobImportDialog({ onSuccess }: ManualJobImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; isDuplicate: boolean } | null>(null);

  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "Remote",
    workMode: "remote" as "remote" | "hybrid" | "onsite",
    employmentType: "full-time" as "full-time" | "part-time" | "contract" | "internship",
    originalUrl: "",
    description: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/jobs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to import job listing.");
      }

      setResult({ message: data.message, isDuplicate: data.isDuplicate });
      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        if (!data.isDuplicate) {
          setIsOpen(false);
          setResult(null);
          setForm({
            title: "",
            company: "",
            location: "Remote",
            workMode: "remote",
            employmentType: "full-time",
            originalUrl: "",
            description: "",
          });
        }
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error importing listing.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Import Job Listing
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-2xl border-border bg-card shadow-xl">
        <CardHeader className="flex flex-row items-start justify-between border-b border-border pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Import Job Listing
            </CardTitle>
            <CardDescription className="mt-1">
              Paste details from LinkedIn, Indeed, company careers, or direct emails.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsOpen(false);
              setError(null);
              setResult(null);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="importTitle">Job Title</Label>
                <Input
                  id="importTitle"
                  placeholder="Senior Full-Stack Engineer"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="importCompany">Company</Label>
                <Input
                  id="importCompany"
                  placeholder="Stripe, Figma, Acme..."
                  value={form.company}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, company: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="importLocation">Location</Label>
                <Input
                  id="importLocation"
                  placeholder="Remote, San Francisco, CA..."
                  value={form.location}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, location: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="importWorkMode">Work Mode</Label>
                <select
                  id="importWorkMode"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm"
                  value={form.workMode}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      workMode: e.target.value as typeof form.workMode,
                    }))
                  }
                >
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="importUrl">Job Listing URL (Optional)</Label>
                <Input
                  id="importUrl"
                  type="url"
                  placeholder="https://company.com/jobs/123 or https://linkedin.com/jobs/view/..."
                  value={form.originalUrl}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, originalUrl: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="importDesc">Job Description (Untrusted Content)</Label>
                <textarea
                  id="importDesc"
                  rows={6}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Paste the full job description text here..."
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            {error ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {result ? (
              <div
                className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                  result.isDuplicate
                    ? "border border-warning/40 bg-warning/10 text-warning-foreground"
                    : "border border-success/40 bg-success/10 text-success"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                {result.message}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Save & Add to Tracker"
                )}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
