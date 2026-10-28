import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { parseDocumentText, validateFileBuffer } from "@/lib/document-parser";
import { calculateProfileCompleteness } from "@/lib/profile-completeness";
import { extractProfileFromText } from "@/lib/resume-extractor";

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No file provided. Please attach a PDF or DOCX resume." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate size and magic bytes
    const validation = validateFileBuffer(buffer, file.type);
    if (!validation.valid || !validation.fileType) {
      return NextResponse.json(
        { error: validation.error || "Invalid document format." },
        { status: 400 }
      );
    }

    // Extract raw text
    const parsed = await parseDocumentText(buffer, validation.fileType);
    if (!parsed.text || parsed.text.length < 50) {
      return NextResponse.json(
        {
          error:
            "Could not extract sufficient readable text from this document. Please ensure it is not a scanned image or password-protected.",
        },
        { status: 422 }
      );
    }

    // Grounded extraction
    const extractedProfile = extractProfileFromText(parsed.text);

    // Fall back to authenticated session details if not found in resume
    if (!extractedProfile.email && session.email) {
      extractedProfile.email = session.email;
    }
    if (extractedProfile.fullName === "Candidate" && session.name) {
      extractedProfile.fullName = session.name;
    }

    const completeness = calculateProfileCompleteness(extractedProfile);

    // RETURN TO USER FOR REVIEW. DO NOT COMMIT TO MASTER PROFILE YET.
    return NextResponse.json({
      success: true,
      fileName: file instanceof File ? file.name : "uploaded-resume",
      fileType: validation.fileType,
      wordCount: parsed.wordCount,
      numPages: parsed.numPages,
      rawText: parsed.text,
      extractedProfile,
      completeness,
      needsReview: true,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error processing resume document.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
