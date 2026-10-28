// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";
import { duplicateDetectionService } from "@/services/duplicate-detection.service";
import { Application, type IApplication } from "@/models/application";
import { Job, type IJob } from "@/models/job";

vi.mock("@/lib/db", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

const asJob = (val: unknown) => val as unknown as IJob;
const asApp = (val: unknown) => val as unknown as IApplication;
const asFindOneQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof Application.findOne>;
const asFindQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof Job.find>;
const asAppFindQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof Application.find>;

describe("Phase 7: Duplicate Application Detection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("detects exact duplicate application when already tracked for the same jobId", async () => {
    const mockTargetJob = {
      _id: "job-101",
      title: "Senior Full Stack Engineer",
      company: "Stripe",
      location: "Remote",
    };

    const mockExistingApp = {
      _id: "app-201",
      userId: "user-1",
      jobId: mockTargetJob,
      status: "APPLIED",
      appliedDate: new Date("2026-10-01"),
      createdAt: new Date("2026-10-01"),
    };

    vi.spyOn(Job, "findById").mockResolvedValue(asJob(mockTargetJob));
    vi.spyOn(Application, "findOne").mockReturnValue(
      asFindOneQuery({
        populate: vi.fn().mockResolvedValue(asApp(mockExistingApp)),
      })
    );

    const result = await duplicateDetectionService.checkDuplicate("user-1", "job-101");

    expect(result.isDuplicate).toBe(true);
    expect(result.existingApplicationId).toBe("app-201");
    expect(result.existingStatus).toBe("APPLIED");
    expect(result.duplicateReason).toContain("You already have an active application tracked for this exact listing");
  });

  it("detects cross-posting duplicate by identical originalUrl across different job entries", async () => {
    const mockTargetJob = {
      _id: "job-102",
      title: "Staff Engineer",
      company: "Airbnb",
      originalUrl: "https://careers.airbnb.com/positions/staff-eng-123",
    };

    const mockExistingApp = {
      _id: "app-202",
      userId: "user-1",
      jobId: {
        _id: "job-old-99",
        title: "Staff Engineer",
        company: "Airbnb",
        originalUrl: "https://careers.airbnb.com/positions/staff-eng-123",
      },
      status: "INTERVIEW",
      createdAt: new Date(),
    };

    vi.spyOn(Job, "findById").mockResolvedValue(asJob(mockTargetJob));

    // Exact check returns null, second findOne for originalUrl matches
    vi.spyOn(Application, "findOne")
      .mockReturnValueOnce(
        asFindOneQuery({ populate: vi.fn().mockResolvedValue(null) })
      )
      .mockReturnValueOnce(
        asFindOneQuery({ populate: vi.fn().mockResolvedValue(asApp(mockExistingApp)) })
      );

    vi.spyOn(Job, "find").mockReturnValue(
      asFindQuery({
        select: vi.fn().mockResolvedValue([{ _id: "job-old-99" }]),
      })
    );

    const result = await duplicateDetectionService.checkDuplicate("user-1", "job-102");

    expect(result.isDuplicate).toBe(true);
    expect(result.existingApplicationId).toBe("app-202");
    expect(result.existingStatus).toBe("INTERVIEW");
    expect(result.duplicateReason).toContain("exact listing URL under another posting entry");
  });

  it("detects duplicate by duplicateGroupId (same company, title, location)", async () => {
    const mockTargetJob = {
      _id: "job-103",
      title: "Backend Go Developer",
      company: "Docker",
      duplicateGroupId: "docker:backendgodeveloper:remote",
    };

    const mockExistingApp = {
      _id: "app-203",
      userId: "user-1",
      jobId: {
        _id: "job-group-match",
        title: "Backend Go Developer",
        company: "Docker",
      },
      status: "READY_FOR_REVIEW",
      createdAt: new Date(),
    };

    vi.spyOn(Job, "findById").mockResolvedValue(asJob(mockTargetJob));

    // 1. Exact match returns null
    vi.spyOn(Application, "findOne")
      .mockReturnValueOnce(
        asFindOneQuery({ populate: vi.fn().mockResolvedValue(null) })
      )
      // 2. duplicateGroupId match
      .mockReturnValueOnce(
        asFindOneQuery({ populate: vi.fn().mockResolvedValue(asApp(mockExistingApp)) })
      );

    vi.spyOn(Job, "find").mockReturnValue(
      asFindQuery({
        select: vi.fn().mockResolvedValue([{ _id: "job-group-match" }]),
      })
    );

    const result = await duplicateDetectionService.checkDuplicate("user-1", "job-103");

    expect(result.isDuplicate).toBe(true);
    expect(result.existingApplicationId).toBe("app-203");
    expect(result.duplicateReason).toContain("Duplicate role detected");
  });

  it("detects recent reapplication within 90 days for same company and title", async () => {
    const mockTargetJob = {
      _id: "job-104",
      title: "Senior Product Designer",
      company: "Figma",
      location: "San Francisco, CA",
    };

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 20); // 20 days ago

    const mockRecentApp = {
      _id: "app-204",
      userId: "user-1",
      jobId: {
        title: "Senior Product Designer",
        company: "Figma",
      },
      status: "REJECTED",
      appliedDate: recentDate,
      createdAt: recentDate,
    };

    vi.spyOn(Job, "findById").mockResolvedValue(asJob(mockTargetJob));

    // Exact check returns null
    vi.spyOn(Application, "findOne").mockReturnValue(
      asFindOneQuery({
        populate: vi.fn().mockResolvedValue(null),
      })
    );

    // Rolling window check returns recent application
    vi.spyOn(Application, "find").mockReturnValue(
      asAppFindQuery({
        populate: vi.fn().mockResolvedValue([mockRecentApp]),
      })
    );

    const result = await duplicateDetectionService.checkDuplicate("user-1", "job-104");

    expect(result.isDuplicate).toBe(true);
    expect(result.isRecentReapplication).toBe(true);
    expect(result.duplicateReason).toContain("Recent application detected");
    expect(result.duplicateReason).toContain("within 90 days");
  });

  it("returns isDuplicate: false when no existing application or recent cooldown matches", async () => {
    const mockTargetJob = {
      _id: "job-105",
      title: "Site Reliability Engineer",
      company: "Datadog",
      location: "Remote",
    };

    vi.spyOn(Job, "findById").mockResolvedValue(asJob(mockTargetJob));
    vi.spyOn(Application, "findOne").mockReturnValue(
      asFindOneQuery({
        populate: vi.fn().mockResolvedValue(null),
      })
    );
    vi.spyOn(Application, "find").mockReturnValue(
      asAppFindQuery({
        populate: vi.fn().mockResolvedValue([]),
      })
    );

    const result = await duplicateDetectionService.checkDuplicate("user-1", "job-105");

    expect(result.isDuplicate).toBe(false);
    expect(result.existingApplicationId).toBeUndefined();
  });
});
