// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";
import { applicationPreparationService } from "@/services/application-preparation.service";
import { ProfessionalProfile } from "@/models/profile";
import { Job } from "@/models/job";
import { Application } from "@/models/application";
import { ApplicationEvent, type IApplicationEvent } from "@/models/application-event";
import { ResumeVersion } from "@/models/resume";
import { CoverLetter } from "@/models/cover-letter";
import { duplicateDetectionService } from "@/services/duplicate-detection.service";

vi.mock("@/lib/db", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

const asProfileQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof ProfessionalProfile.findOne>;
const asJobQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof Job.findById>;
const asAppQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof Application.findOne>;
const asAppFindByIdQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof Application.findById>;
const asResumeQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof ResumeVersion.findOne>;
const asResumeFindByIdQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof ResumeVersion.findById>;
const asCoverQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof CoverLetter.findOne>;
const asCoverFindByIdQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof CoverLetter.findById>;

describe("Phase 7: Application Preparation Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockProfile = {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+1 555-0100",
    workAuthorization: ["US Citizen"],
    technicalSkills: [{ name: "TypeScript" }, { name: "React" }],
    employmentHistory: [{ company: "Acme", title: "Engineer" }],
  };

  const mockJob = {
    _id: "job-prepare-1",
    title: "Senior Full Stack Engineer",
    company: "Vercel",
    location: "Remote",
    requiredSkills: ["TypeScript", "React"],
  };

  it("assembles a verified application checklist and transitions to READY_FOR_REVIEW", async () => {
    vi.spyOn(ProfessionalProfile, "findOne").mockReturnValue(
      asProfileQuery(Promise.resolve(mockProfile))
    );
    vi.spyOn(Job, "findById").mockReturnValue(
      asJobQuery(Promise.resolve(mockJob))
    );
    vi.spyOn(duplicateDetectionService, "checkDuplicate").mockResolvedValue({
      isDuplicate: false,
    });

    const mockResumeVersion = {
      _id: "res-ver-1",
      versionNumber: 1,
      unsupportedClaimsDetected: [],
    };
    vi.spyOn(ResumeVersion, "findOne").mockReturnValue(
      asResumeQuery({
        sort: vi.fn().mockResolvedValue(mockResumeVersion),
      })
    );
    vi.spyOn(ResumeVersion, "findById").mockReturnValue(
      asResumeFindByIdQuery(Promise.resolve(mockResumeVersion))
    );

    const mockCoverLetter = {
      _id: "cov-let-1",
      tone: "professional",
      content: "Dear Hiring Team at Vercel, I am excited to apply...",
    };
    vi.spyOn(CoverLetter, "findOne").mockReturnValue(
      asCoverQuery({
        sort: vi.fn().mockResolvedValue(mockCoverLetter),
      })
    );
    vi.spyOn(CoverLetter, "findById").mockReturnValue(
      asCoverFindByIdQuery(Promise.resolve(mockCoverLetter))
    );

    const mockAppDoc = {
      _id: "app-prep-1",
      userId: "user-1",
      jobId: "job-prepare-1",
      status: "PREPARING",
      submissionMethod: "manual",
      save: vi.fn().mockResolvedValue(true),
    };
    vi.spyOn(Application, "findOne").mockReturnValue(
      asAppQuery(Promise.resolve(mockAppDoc))
    );
    (vi.spyOn(ApplicationEvent, "create") as ReturnType<typeof vi.fn>).mockResolvedValue(
      {} as unknown as IApplicationEvent
    );

    const result = await applicationPreparationService.prepareApplication(
      "user-1",
      "job-prepare-1"
    );

    expect(result.isReadyForReview).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(mockAppDoc.status).toBe("READY_FOR_REVIEW");

    // Verify checklist items
    const contactItem = result.checklist.find((c) => c.label === "Full Name");
    expect(contactItem?.status).toBe("verified");
    expect(contactItem?.value).toBe("Ada Lovelace");

    const emailItem = result.checklist.find((c) => c.label === "Email Address");
    expect(emailItem?.status).toBe("verified");

    const authItem = result.checklist.find((c) => c.label === "Work Authorization");
    expect(authItem?.status).toBe("verified");
    expect(authItem?.value).toBe("US Citizen");
  });

  it("identifies blockers when candidate profile is missing mandatory contact information", async () => {
    const incompleteProfile = {
      fullName: "", // Missing name
      email: "",    // Missing email
      workAuthorization: [],
    };

    vi.spyOn(ProfessionalProfile, "findOne").mockReturnValue(
      asProfileQuery(Promise.resolve(incompleteProfile))
    );
    vi.spyOn(Job, "findById").mockReturnValue(
      asJobQuery(Promise.resolve(mockJob))
    );
    vi.spyOn(duplicateDetectionService, "checkDuplicate").mockResolvedValue({
      isDuplicate: false,
    });
    vi.spyOn(ResumeVersion, "findOne").mockReturnValue(
      asResumeQuery({
        sort: vi.fn().mockResolvedValue({ _id: "res-1", versionNumber: 1 }),
      })
    );
    vi.spyOn(ResumeVersion, "findById").mockReturnValue(
      asResumeFindByIdQuery(Promise.resolve({ _id: "res-1", versionNumber: 1 }))
    );
    const mockCoverLetter = {
      _id: "cov-1",
      tone: "professional",
      content: "Cover letter draft",
    };
    vi.spyOn(CoverLetter, "findOne").mockReturnValue(
      asCoverQuery({
        sort: vi.fn().mockResolvedValue(mockCoverLetter),
      })
    );
    vi.spyOn(CoverLetter, "findById").mockReturnValue(
      asCoverFindByIdQuery(Promise.resolve(mockCoverLetter))
    );

    const mockAppDoc = {
      _id: "app-prep-2",
      userId: "user-1",
      jobId: "job-prepare-1",
      status: "PREPARING",
      save: vi.fn().mockResolvedValue(true),
    };
    vi.spyOn(Application, "findOne").mockReturnValue(
      asAppQuery(Promise.resolve(mockAppDoc))
    );
    (vi.spyOn(ApplicationEvent, "create") as ReturnType<typeof vi.fn>).mockResolvedValue(
      {} as unknown as IApplicationEvent
    );

    const result = await applicationPreparationService.prepareApplication(
      "user-1",
      "job-prepare-1"
    );

    expect(result.isReadyForReview).toBe(false);
    expect(result.blockers).toContain("Full name and verified email are mandatory.");
    expect(mockAppDoc.status).not.toBe("READY_FOR_REVIEW");
  });

  it("stops and flags when exact duplicate application exists", async () => {
    vi.spyOn(ProfessionalProfile, "findOne").mockReturnValue(
      asProfileQuery(Promise.resolve(mockProfile))
    );
    vi.spyOn(Job, "findById").mockReturnValue(
      asJobQuery(Promise.resolve(mockJob))
    );

    vi.spyOn(duplicateDetectionService, "checkDuplicate").mockResolvedValue({
      isDuplicate: true,
      duplicateReason: "You already applied to this role on 2026-10-15.",
      existingApplicationId: "app-dup-99",
      existingStatus: "APPLIED",
    });

    const mockExisting = {
      _id: "app-dup-99",
      status: "APPLIED",
    };
    vi.spyOn(Application, "findById").mockReturnValue(
      asAppFindByIdQuery(Promise.resolve(mockExisting))
    );

    const result = await applicationPreparationService.prepareApplication(
      "user-1",
      "job-prepare-1"
    );

    expect(result.isReadyForReview).toBe(false);
    expect(result.duplicateCheck.isDuplicate).toBe(true);
    expect(result.blockers[0]).toContain("You already applied to this role");
    expect(result.application._id).toBe("app-dup-99");
  });
});
