import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { AuditLog } from "@/models/audit-log";
import { jobDiscoveryService } from "@/services/job-discovery.service";

const ImportJobSchema = z.object({
  title: z.string().min(2, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  description: z.string().min(20, "Job description must be at least 20 characters long"),
  location: z.string().optional().default("Remote"),
  workMode: z.enum(["remote", "hybrid", "onsite"]).default("remote"),
  employmentType: z
    .enum(["full-time", "part-time", "contract", "internship"])
    .default("full-time"),
  originalUrl: z.string().url().optional().or(z.literal("")),
  sourcePlatform: z.string().optional().default("Manual Import"),
  salaryRange: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      currency: z.string().default("USD"),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ImportJobSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed on imported job data",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { job, isDuplicate } = await jobDiscoveryService.importJob(
      session.userId,
      parsed.data
    );

    await AuditLog.create({
      userId: session.userId,
      action: isDuplicate ? "JOB_IMPORT_DUPLICATE_LINKED" : "JOB_IMPORT_CREATED",
      resource: "Job",
      details: {
        jobId: job._id,
        company: job.company,
        title: job.title,
        duplicateGroupId: job.duplicateGroupId,
      },
      timestamp: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        job,
        isDuplicate,
        message: isDuplicate
          ? "Job already exists in your workspace. Verified posting refreshed."
          : "Job posting imported successfully.",
      },
      { status: isDuplicate ? 200 : 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error importing job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
