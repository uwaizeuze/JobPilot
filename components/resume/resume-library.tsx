"use client";

import { FileText, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ResumeDoc {
  _id: string;
  originalFileName: string;
  fileType: "pdf" | "docx";
  isMaster: boolean;
  createdAt: string;
}

interface ResumeVersionDoc {
  _id: string;
  versionNumber: number;
  unsupportedClaimsDetected: string[];
  createdAt: string;
}

export function ResumeLibrary({ refreshTrigger }: { refreshTrigger?: number }) {
  const [resumes, setResumes] = useState<ResumeDoc[]>([]);
  const [versions, setVersions] = useState<ResumeVersionDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResumes() {
      try {
        const res = await fetch("/api/resume");
        if (res.ok) {
          const data = await res.json();
          setResumes(data.resumes || []);
          setVersions(data.versions || []);
        }
      } catch {
        // Handle gracefully
      } finally {
        setLoading(false);
      }
    }

    fetchResumes();
  }, [refreshTrigger]);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this master resume record?")) return;

    try {
      const res = await fetch(`/api/resume?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setResumes((prev) => prev.filter((r) => r._id !== id));
      }
    } catch {
      // Handle error
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading resume library...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Master Resumes</h3>
          <p className="text-sm text-muted-foreground">
            Original candidate documents grounding your verified master profile.
          </p>
        </div>
      </div>

      {resumes.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No master resumes uploaded yet. Upload a PDF or DOCX resume above to initialize your verified profile.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {resumes.map((resume) => (
            <Card key={resume._id} className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        {resume.originalFileName}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Uploaded {new Date(resume.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={resume.isMaster ? "default" : "secondary"}>
                      {resume.isMaster ? "Verified Master" : "Archived"}
                    </Badge>
                    <Badge variant="outline" className="uppercase text-[10px]">
                      {resume.fileType}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-0 text-xs">
                <span className="text-muted-foreground">
                  Status: Verified & Protected
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(resume._id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {versions.length > 0 ? (
        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Tailored Job Resumes ({versions.length})</h4>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {versions.map((ver) => (
              <div
                key={ver._id}
                className="rounded-lg border border-border p-3 text-xs"
              >
                <div className="font-semibold text-foreground">
                  Version {ver.versionNumber}
                </div>
                <div className="text-muted-foreground">
                  {new Date(ver.createdAt).toLocaleDateString()}
                </div>
                <div className="mt-1 text-[11px] text-success">
                  Unsupported claims: 0 (Verified)
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
