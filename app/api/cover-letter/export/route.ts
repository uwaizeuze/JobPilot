import { NextResponse } from "next/server";

import {
  generateCoverLetterDocx,
  generateCoverLetterPdf,
} from "@/lib/document-exporter";
import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { CoverLetter } from "@/models/cover-letter";
import { Job } from "@/models/job";
import { ProfessionalProfile } from "@/models/profile";

export async function GET(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const format = searchParams.get("format") || "pdf";

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId query parameter is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const [coverLetter, profile, job] = await Promise.all([
      CoverLetter.findOne({ userId: session.userId, jobId }).lean(),
      ProfessionalProfile.findOne({ userId: session.userId }).lean(),
      Job.findById(jobId).lean(),
    ]);

    if (!coverLetter) {
      return NextResponse.json(
        { error: "Cover letter draft not found" },
        { status: 404 }
      );
    }

    const candidateName = profile?.fullName || "Candidate";
    const contactLine = [
      profile?.email,
      profile?.phone,
      profile?.currentLocation,
    ]
      .filter(Boolean)
      .join(" | ");

    const cleanFileName = `${(job?.company || "Company").replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_CoverLetter`;

    if (format === "docx") {
      const docxBuffer = await generateCoverLetterDocx(
        candidateName,
        contactLine,
        coverLetter.content
      );
      return new Response(new Uint8Array(docxBuffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${cleanFileName}.docx"`,
        },
      });
    }

    // Default to PDF
    const pdfBuffer = await generateCoverLetterPdf(
      candidateName,
      contactLine,
      coverLetter.content
    );
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${cleanFileName}.pdf"`,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error exporting cover letter";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
