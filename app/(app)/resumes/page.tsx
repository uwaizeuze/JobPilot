"use client";

import { useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { ResumeLibrary } from "@/components/resume/resume-library";
import { ResumeUploader } from "@/components/resume/resume-uploader";
import { Separator } from "@/components/ui/separator";

export default function ResumeLibraryPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <PageShell
      title="Resume intelligence & library"
      description="Upload your original PDF or DOCX resume, review extracted qualifications, and maintain your verified master profile."
    >
      <section className="space-y-4">
        <ResumeUploader onSuccess={() => setRefreshKey((k) => k + 1)} />
      </section>

      <Separator />

      <section className="space-y-4">
        <ResumeLibrary refreshTrigger={refreshKey} />
      </section>
    </PageShell>
  );
}
