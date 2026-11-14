import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import {
  parseJobSpreadsheet,
  type SpreadsheetParseResult,
} from "@/lib/parsers/job-spreadsheet-parser";
import { AuditLog } from "@/models/audit-log";
import { jobDiscoveryService } from "@/services/job-discovery.service";

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let parseResult: SpreadsheetParseResult;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file || typeof file === "string") {
        return NextResponse.json(
          { error: "No spreadsheet file uploaded." },
          { status: 400 }
        );
      }

      const blob = file as Blob;
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileName = (file as File).name || "upload.csv";

      const previewOnly = formData.get("preview") === "true";
      parseResult = await parseJobSpreadsheet(buffer, fileName);

      if (previewOnly) {
        return NextResponse.json({
          success: true,
          mode: "preview",
          summary: parseResult.summary,
          rows: parseResult.rows,
        });
      }
    } else {
      const body = await req.json();

      if (body.csvText) {
        parseResult = await parseJobSpreadsheet(body.csvText, body.fileName);
      } else if (body.jobs && Array.isArray(body.jobs)) {
        // Direct commit of pre-validated jobs
        parseResult = {
          rows: body.jobs.map((j: unknown, idx: number) => ({
            rowNumber: idx + 1,
            job: j,
            isValid: true,
            errors: [],
            raw: {},
          })),
          summary: {
            total: body.jobs.length,
            valid: body.jobs.length,
            invalid: 0,
          },
        };
      } else {
        return NextResponse.json(
          { error: "Invalid request payload. Expected file or CSV text." },
          { status: 400 }
        );
      }

      if (body.preview) {
        return NextResponse.json({
          success: true,
          mode: "preview",
          summary: parseResult.summary,
          rows: parseResult.rows,
        });
      }
    }

    const validRows = parseResult.rows.filter((r) => r.isValid && r.job);

    if (validRows.length === 0) {
      return NextResponse.json(
        {
          error: "No valid job rows found in the uploaded file.",
          summary: parseResult.summary,
          errors: parseResult.rows.flatMap((r) =>
            r.errors.map((e) => `Row ${r.rowNumber}: ${e}`)
          ),
        },
        { status: 400 }
      );
    }

    let importedCount = 0;
    let duplicateCount = 0;
    const itemErrors: Array<{ rowNumber: number; error: string }> = [];

    for (const item of validRows) {
      if (!item.job) continue;
      try {
        const { isDuplicate } = await jobDiscoveryService.importJob(
          session.userId,
          item.job
        );
        if (isDuplicate) {
          duplicateCount++;
        } else {
          importedCount++;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Database error";
        itemErrors.push({ rowNumber: item.rowNumber, error: msg });
      }
    }

    await AuditLog.create({
      userId: session.userId,
      action: "JOB_BULK_SPREADSHEET_IMPORT",
      resource: "Job",
      details: {
        totalRows: parseResult.rows.length,
        validRows: validRows.length,
        importedCount,
        duplicateCount,
        errorCount: itemErrors.length,
      },
      timestamp: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        summary: {
          total: parseResult.rows.length,
          valid: validRows.length,
          imported: importedCount,
          duplicates: duplicateCount,
          failed: itemErrors.length,
        },
        errors: itemErrors,
        message: `Successfully processed ${validRows.length} jobs (${importedCount} new, ${duplicateCount} updated duplicates).`,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error during bulk import";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
