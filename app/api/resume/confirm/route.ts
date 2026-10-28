import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { calculateProfileCompleteness } from "@/lib/profile-completeness";
import { AuditLog } from "@/models/audit-log";
import { ProfessionalProfile } from "@/models/profile";
import { Resume } from "@/models/resume";

const ConfirmSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.enum(["pdf", "docx"]),
  rawText: z.string().min(1),
  profile: z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional().default(""),
    currentLocation: z.string().optional().default(""),
    headline: z.string().optional().default(""),
    summary: z.string().optional().default(""),
    totalExperienceYears: z.number().min(0).default(0),
    technicalSkills: z
      .array(
        z.object({
          name: z.string().min(1),
          category: z.string().optional(),
          proficiency: z
            .enum(["beginner", "intermediate", "advanced", "expert"])
            .default("intermediate"),
        })
      )
      .default([]),
    employmentHistory: z
      .array(
        z.object({
          company: z.string().min(1),
          title: z.string().min(1),
          startDate: z.string().min(1),
          endDate: z.string().optional(),
          current: z.boolean().default(false),
          responsibilities: z.array(z.string()).default([]),
          achievements: z.array(z.string()).default([]),
        })
      )
      .default([]),
    education: z
      .array(
        z.object({
          institution: z.string().min(1),
          degree: z.string().min(1),
          startYear: z.number().optional(),
          endYear: z.number().optional(),
        })
      )
      .default([]),
    urls: z
      .object({
        portfolio: z.string().optional().default(""),
        github: z.string().optional().default(""),
        linkedin: z.string().optional().default(""),
      })
      .default({
        portfolio: "",
        github: "",
        linkedin: "",
      }),
  }),
});

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ConfirmSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed on reviewed profile data",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { fileName, fileType, rawText, profile } = parsed.data;

    await connectToDatabase();

    const completeness = calculateProfileCompleteness(profile);

    // Save/Update Verified Master Profile
    const updatedProfile = await ProfessionalProfile.findOneAndUpdate(
      { userId: session.userId },
      {
        ...profile,
        completenessScore: completeness.score,
        userId: session.userId,
      },
      { new: true, upsert: true, runValidators: true }
    );

    // Unset any previous master resume flag for this user
    await Resume.updateMany({ userId: session.userId }, { isMaster: false });

    // Store new master resume document
    const newResume = await Resume.create({
      userId: session.userId,
      originalFileName: fileName,
      fileType,
      rawText,
      parsedData: profile,
      isMaster: true,
    });

    await AuditLog.create({
      userId: session.userId,
      action: "RESUME_VERIFIED_AND_CONFIRMED",
      resource: "ProfessionalProfile",
      details: {
        resumeId: newResume._id,
        fileName,
        completenessScore: completeness.score,
      },
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Verified master profile updated successfully from confirmed resume.",
      profile: updatedProfile,
      completeness,
      resume: {
        id: newResume._id.toString(),
        fileName: newResume.originalFileName,
        fileType: newResume.fileType,
        isMaster: newResume.isMaster,
        createdAt: newResume.createdAt,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error confirming verified profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
