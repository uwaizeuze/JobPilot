"use client";

import { CheckCircle2, FileText, Loader2, ShieldCheck, UploadCloud, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExtractedProfileData } from "@/lib/resume-extractor";

interface ResumeUploaderProps {
  onSuccess?: () => void;
}

export function ResumeUploader({ onSuccess }: ResumeUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Staging / Verification Barrier State
  const [stagingData, setStagingData] = useState<{
    fileName: string;
    fileType: "pdf" | "docx";
    rawText: string;
    profile: ExtractedProfileData;
  } | null>(null);

  async function handleFileSelect(selectedFile: File) {
    setError(null);
    setSuccess(null);

    // Client-side validation
    const validExtensions = [".pdf", ".docx"];
    const ext = selectedFile.name.slice(selectedFile.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setError("Only PDF (.pdf) and Microsoft Word (.docx) files are supported.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File exceeds 5MB size limit.");
      return;
    }

    await uploadAndParse(selectedFile);
  }

  async function uploadAndParse(fileToUpload: File) {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to parse resume.");
      }

      // Enter Candidate Verification Barrier
      setStagingData({
        fileName: data.fileName,
        fileType: data.fileType,
        rawText: data.rawText,
        profile: data.extractedProfile,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error parsing document.";
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirmProfile() {
    if (!stagingData) return;

    setConfirming(true);
    setError(null);

    try {
      const res = await fetch("/api/resume/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: stagingData.fileName,
          fileType: stagingData.fileType,
          rawText: stagingData.rawText,
          profile: stagingData.profile,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm profile.");
      }

      setSuccess("Resume confirmed and committed to your verified master profile!");
      setStagingData(null);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Confirmation failed.";
      setError(msg);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-6">
      {!stagingData ? (
        <Card className="border-dashed border-2 border-border/80 bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
              <UploadCloud className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold">Upload Master Resume</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Drop your PDF or DOCX resume here. We will parse your experience and
              present it for your review before saving.
            </p>

            <label className="mt-6 cursor-pointer">
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <span className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Parsing Document...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Select PDF / DOCX
                  </>
                )}
              </span>
            </label>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Maximum 5MB • Never shared publicly • Grounded fact preservation
            </div>
          </CardContent>
        </Card>
      ) : (
        /* CANDIDATE VERIFICATION BARRIER */
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-warning text-warning">
                    Review Barrier Active
                  </Badge>
                  <CardTitle className="text-lg">
                    Review & Confirm Extracted Resume
                  </CardTitle>
                </div>
                <CardDescription className="mt-1">
                  File: <span className="font-medium text-foreground">{stagingData.fileName}</span>.
                  Verify all qualifications below. Nothing is committed to your master profile until you confirm.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setStagingData(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reviewName">Candidate Name</Label>
                <Input
                  id="reviewName"
                  value={stagingData.profile.fullName}
                  onChange={(e) =>
                    setStagingData((prev) =>
                      prev
                        ? {
                            ...prev,
                            profile: {
                              ...prev.profile,
                              fullName: e.target.value,
                            },
                          }
                        : null
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reviewEmail">Email</Label>
                <Input
                  id="reviewEmail"
                  value={stagingData.profile.email}
                  onChange={(e) =>
                    setStagingData((prev) =>
                      prev
                        ? {
                            ...prev,
                            profile: { ...prev.profile, email: e.target.value },
                          }
                        : null
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reviewHeadline">Extracted Headline</Label>
                <Input
                  id="reviewHeadline"
                  value={stagingData.profile.headline}
                  onChange={(e) =>
                    setStagingData((prev) =>
                      prev
                        ? {
                            ...prev,
                            profile: {
                              ...prev.profile,
                              headline: e.target.value,
                            },
                          }
                        : null
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reviewExp">Total Experience (Years)</Label>
                <Input
                  id="reviewExp"
                  type="number"
                  value={stagingData.profile.totalExperienceYears}
                  onChange={(e) =>
                    setStagingData((prev) =>
                      prev
                        ? {
                            ...prev,
                            profile: {
                              ...prev.profile,
                              totalExperienceYears: Number(e.target.value),
                            },
                          }
                        : null
                    )
                  }
                />
              </div>
            </div>

            {/* Extracted Skills */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Extracted Technical Skills ({stagingData.profile.technicalSkills.length})
              </Label>
              <div className="flex flex-wrap gap-2">
                {stagingData.profile.technicalSkills.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Extracted Experience Count */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Employment History ({stagingData.profile.employmentHistory.length} roles found)
              </Label>
              <div className="space-y-3">
                {stagingData.profile.employmentHistory.map((job, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border p-3 text-xs"
                  >
                    <div className="font-semibold text-foreground">
                      {job.title} — {job.company}
                    </div>
                    <div className="text-muted-foreground">
                      {job.startDate} {job.endDate ? `- ${job.endDate}` : "(Current)"}
                    </div>
                    {job.responsibilities && job.responsibilities.length > 0 ? (
                      <ul className="mt-2 list-disc pl-4 text-muted-foreground">
                        {job.responsibilities.slice(0, 3).map((resp, rIdx) => (
                          <li key={rIdx}>{resp}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Confirmation Barrier Action */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setStagingData(null);
                }}
                disabled={confirming}
              >
                Discard & Re-upload
              </Button>

              <Button
                onClick={handleConfirmProfile}
                disabled={confirming}
                className="gap-2 bg-success text-success-foreground hover:bg-success/90"
              >
                {confirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Committing Profile...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Confirm & Save to Verified Master Profile
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-md border border-success/40 bg-success/10 p-3 text-sm text-success">
          {success}
        </div>
      ) : null}
    </div>
  );
}
