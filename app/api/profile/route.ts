import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { calculateProfileCompleteness } from "@/lib/profile-completeness";
import { AuditLog } from "@/models/audit-log";
import { ProfessionalProfile } from "@/models/profile";

const EmploymentSchema = z.object({
  company: z.string().min(1, "Company is required"),
  title: z.string().min(1, "Job title is required"),
  location: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  current: z.boolean().default(false),
  responsibilities: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
});

const SkillSchema = z.object({
  name: z.string().min(1, "Skill name is required"),
  category: z.string().optional(),
  yearsOfExperience: z.number().min(0).optional(),
  proficiency: z
    .enum(["beginner", "intermediate", "advanced", "expert"])
    .default("intermediate"),
});

const EducationSchema = z.object({
  institution: z.string().min(1, "Institution is required"),
  degree: z.string().min(1, "Degree is required"),
  fieldOfStudy: z.string().optional(),
  startYear: z.number().optional(),
  endYear: z.number().optional(),
  gpa: z.string().optional(),
});

const CertificationSchema = z.object({
  name: z.string().min(1, "Certification name is required"),
  issuer: z.string().min(1, "Issuer is required"),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  credentialUrl: z.string().optional(),
});

const ProjectSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  description: z.string().min(1, "Description is required"),
  technologies: z.array(z.string()).default([]),
  url: z.string().optional(),
  repoUrl: z.string().optional(),
});

const ProfileUpdateSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional().default(""),
  currentLocation: z.string().optional().default(""),
  preferredLocations: z.array(z.string()).default([]),
  remotePreference: z
    .enum(["remote", "hybrid", "onsite", "flexible"])
    .default("remote"),
  headline: z.string().optional().default(""),
  summary: z.string().optional().default(""),
  totalExperienceYears: z.number().min(0).default(0),
  currentEmployer: z.string().optional().default(""),
  employmentHistory: z.array(EmploymentSchema).default([]),
  technicalSkills: z.array(SkillSchema).default([]),
  education: z.array(EducationSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  urls: z
    .object({
      portfolio: z.string().optional().default(""),
      github: z.string().optional().default(""),
      linkedin: z.string().optional().default(""),
      other: z.string().optional().default(""),
    })
    .default({
      portfolio: "",
      github: "",
      linkedin: "",
      other: "",
    }),
  compensation: z
    .object({
      expectedSalary: z.number().optional(),
      currentSalary: z.number().optional(),
      currency: z.string().default("USD"),
    })
    .default({ currency: "USD" }),
  noticePeriodDays: z.number().optional().default(0),
  availabilityDate: z.string().optional().default(""),
  workAuthorization: z.array(z.string()).default([]),
  preferredIndustries: z.array(z.string()).default([]),
  employmentTypes: z.array(z.string()).default([]),
  preferredSeniority: z.array(z.string()).default([]),
});

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    let profile = await ProfessionalProfile.findOne({ userId: session.userId });

    if (!profile) {
      profile = await ProfessionalProfile.create({
        userId: session.userId,
        fullName: session.name || "Developer",
        email: session.email,
        phone: "",
        currentLocation: "",
        preferredLocations: [],
        remotePreference: "remote",
        headline: "",
        summary: "",
        totalExperienceYears: 0,
        employmentHistory: [],
        technicalSkills: [],
        education: [],
        certifications: [],
        projects: [],
        workAuthorization: [],
        preferredIndustries: [],
        employmentTypes: ["full-time"],
        preferredSeniority: [],
        completenessScore: 0,
      });
    }

    const completeness = calculateProfileCompleteness(profile.toObject());

    return NextResponse.json({
      profile,
      completeness,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal profile error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ProfileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const completeness = calculateProfileCompleteness(parsed.data);

    await connectToDatabase();

    const updatedProfile = await ProfessionalProfile.findOneAndUpdate(
      { userId: session.userId },
      {
        ...parsed.data,
        completenessScore: completeness.score,
        userId: session.userId,
      },
      { new: true, upsert: true, runValidators: true }
    );

    await AuditLog.create({
      userId: session.userId,
      action: "PROFILE_UPDATE",
      resource: "ProfessionalProfile",
      details: { completenessScore: completeness.score },
      timestamp: new Date(),
    });

    return NextResponse.json({
      profile: updatedProfile,
      completeness,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal profile error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    await ProfessionalProfile.findOneAndDelete({ userId: session.userId });

    await AuditLog.create({
      userId: session.userId,
      action: "PROFILE_DELETE",
      resource: "ProfessionalProfile",
      details: { deletedAt: new Date() },
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Professional profile has been deleted",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal profile error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
