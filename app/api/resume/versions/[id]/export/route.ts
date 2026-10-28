import { NextResponse } from "next/server";

import {
  generateResumeDocx,
  generateResumePdf,
  type TailoredResumeContent,
} from "@/lib/document-exporter";
import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ResumeVersion } from "@/models/resume";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "pdf";

    await connectToDatabase();

    const version = await ResumeVersion.findOne({
      _id: id,
      userId: session.userId,
    }).lean();

    if (!version || !version.tailoredContent) {
      return NextResponse.json(
        { error: "Resume version not found" },
        { status: 404 }
      );
    }

    const content = version.tailoredContent as unknown as TailoredResumeContent;
    const cleanFileName = (content.fullName || "Resume").replace(/[^a-zA-Z0-9]/g, "_");

    if (format === "docx") {
      const docxBuffer = await generateResumeDocx(content);
      return new Response(new Uint8Array(docxBuffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${cleanFileName}_v${version.versionNumber}.docx"`,
        },
      });
    }

    // Default to PDF
    const pdfBuffer = await generateResumePdf(content);
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${cleanFileName}_v${version.versionNumber}.pdf"`,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error exporting resume document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
