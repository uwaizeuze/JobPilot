import { NextResponse } from "next/server";

import { generateJobUploadTemplateCSV } from "@/lib/parsers/job-spreadsheet-parser";

export async function GET() {
  const csvContent = generateJobUploadTemplateCSV();

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="jobpilot-bulk-upload-template.csv"',
      "Cache-Control": "no-cache",
    },
  });
}
