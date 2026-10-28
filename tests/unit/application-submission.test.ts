import { beforeEach, describe, expect, it, vi } from "vitest";
import { Application } from "@/models/application";
import { ApplicationEvent, type IApplicationEvent } from "@/models/application-event";
import { AuditLog, type IAuditLog } from "@/models/audit-log";
import { Job } from "@/models/job";
import { type INotification } from "@/models/notification";
import { ProfessionalProfile } from "@/models/profile";
import { ApplicationSubmissionService } from "@/services/application-submission.service";
import { notificationService } from "@/services/notification.service";

vi.mock("@/lib/db", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

const asAppQuery = (val: unknown) => val as unknown as ReturnType<typeof Application.findOne>;
const asJobQuery = (val: unknown) => val as unknown as ReturnType<typeof Job.findById>;
const asProfileQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof ProfessionalProfile.findOne>;

describe("ApplicationSubmissionService", () => {
  let service: ApplicationSubmissionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ApplicationSubmissionService();
  });

  it("generates structured idempotency key userId:jobIdentity:resumeVersion", () => {
    const key = service.generateIdempotencyKey("user-1", "job-100", "resume-v2");
    expect(key).toBe("user-1:job-100:resume-v2");
  });

  it("returns existing confirmation code when an application has already been submitted (idempotent)", async () => {
    const mockApp = {
      _id: "app-1",
      userId: "user-1",
      jobId: "job-1",
      status: "APPLIED",
      confirmationReference: "APP-CONF-12345",
      appliedDate: new Date("2026-03-01"),
      save: vi.fn(),
    };

    const mockJob = {
      _id: "job-1",
      title: "Staff Engineer",
      company: "Acme Corp",
      sourcePlatform: "Greenhouse",
      originalUrl: "https://boards.greenhouse.io/acme/jobs/1",
      applicationMethod: "auto",
    };

    const mockProfile = {
      userId: "user-1",
      fullName: "Jane Doe",
      email: "jane@example.com",
    };

    vi.spyOn(Application, "findOne").mockReturnValue(asAppQuery(Promise.resolve(mockApp)));
    vi.spyOn(Job, "findById").mockReturnValue(asJobQuery(Promise.resolve(mockJob)));
    vi.spyOn(ProfessionalProfile, "findOne").mockReturnValue(
      asProfileQuery(Promise.resolve(mockProfile))
    );

    const result = await service.submitApplication("user-1", "app-1");

    expect(result.success).toBe(true);
    expect(result.status).toBe("APPLIED");
    expect(result.confirmationReference).toBe("APP-CONF-12345");
    expect(mockApp.save).not.toHaveBeenCalled();
  });

  it("prohibits automated submission for MANUAL tier providers (e.g. LinkedIn, Indeed)", async () => {
    const mockApp = {
      _id: "app-manual",
      userId: "user-1",
      jobId: "job-li",
      status: "READY_FOR_REVIEW",
      save: vi.fn(),
    };

    const mockJob = {
      _id: "job-li",
      title: "Senior Backend Developer",
      company: "LinkedIn Recruiter",
      sourcePlatform: "LinkedIn",
      originalUrl: "https://www.linkedin.com/jobs/view/123",
      applicationMethod: "manual",
    };

    const mockProfile = {
      userId: "user-1",
      fullName: "Jane Doe",
      email: "jane@example.com",
    };

    vi.spyOn(Application, "findOne").mockReturnValue(asAppQuery(Promise.resolve(mockApp)));
    vi.spyOn(Job, "findById").mockReturnValue(asJobQuery(Promise.resolve(mockJob)));
    vi.spyOn(ProfessionalProfile, "findOne").mockReturnValue(
      asProfileQuery(Promise.resolve(mockProfile))
    );
    (vi.spyOn(ApplicationEvent, "create") as ReturnType<typeof vi.fn>).mockResolvedValue(
      {} as unknown as IApplicationEvent
    );

    const result = await service.submitApplication("user-1", "app-manual");

    expect(result.success).toBe(false);
    expect(result.tier).toBe("MANUAL");
    expect(result.message).toContain("Automated submission is not permitted or supported for LinkedIn");
    expect(result.externalUrl).toBe("https://www.linkedin.com/jobs/view/123");
  });

  it("halts before submission barrier for PREFILL_ASSISTED tier", async () => {
    const mockApp = {
      _id: "app-prefill",
      userId: "user-1",
      jobId: "job-gh",
      status: "READY_FOR_REVIEW",
      save: vi.fn(),
    };

    const mockJob = {
      _id: "job-gh",
      title: "Fullstack Engineer",
      company: "Stripe",
      sourcePlatform: "Greenhouse Public Job Board",
      originalUrl: "https://boards.greenhouse.io/stripe/jobs/456",
      applicationMethod: "prefill",
    };

    const mockProfile = {
      userId: "user-1",
      fullName: "Jane Doe",
      email: "jane@example.com",
      phone: "+1 555 123 4567",
      currentLocation: "San Francisco, CA",
      linkedinUrl: "https://linkedin.com/in/janedoe",
      githubUrl: "https://github.com/janedoe",
    };

    vi.spyOn(Application, "findOne").mockReturnValue(asAppQuery(Promise.resolve(mockApp)));
    vi.spyOn(Job, "findById").mockReturnValue(asJobQuery(Promise.resolve(mockJob)));
    vi.spyOn(ProfessionalProfile, "findOne").mockReturnValue(
      asProfileQuery(Promise.resolve(mockProfile))
    );
    (vi.spyOn(ApplicationEvent, "create") as ReturnType<typeof vi.fn>).mockResolvedValue(
      {} as unknown as IApplicationEvent
    );

    const result = await service.submitApplication("user-1", "app-prefill");

    expect(result.success).toBe(true);
    expect(result.tier).toBe("PREFILL_ASSISTED");
    expect(result.prefillResult?.stoppedBeforeSubmit).toBe(true);
    expect(result.prefillResult?.fieldCount).toBeGreaterThan(0);
  });

  it("executes authorized submission for AUTO_SUBMIT tier and schedules follow-up reminder", async () => {
    const mockApp = {
      _id: "app-auto",
      userId: "user-1",
      jobId: "job-auto",
      status: "READY_FOR_REVIEW",
      save: vi.fn(),
    };

    const mockJob = {
      _id: "job-auto",
      title: "Site Reliability Engineer",
      company: "CloudTech",
      sourcePlatform: "Partner Career API",
      originalUrl: "https://cloudtech.com/apply",
      applicationMethod: "auto",
    };

    const mockProfile = {
      userId: "user-1",
      fullName: "Jane Doe",
      email: "jane@example.com",
    };

    vi.spyOn(Application, "findOne").mockReturnValue(asAppQuery(Promise.resolve(mockApp)));
    vi.spyOn(Job, "findById").mockReturnValue(asJobQuery(Promise.resolve(mockJob)));
    vi.spyOn(ProfessionalProfile, "findOne").mockReturnValue(
      asProfileQuery(Promise.resolve(mockProfile))
    );
    (vi.spyOn(ApplicationEvent, "create") as ReturnType<typeof vi.fn>).mockResolvedValue(
      {} as unknown as IApplicationEvent
    );
    (vi.spyOn(AuditLog, "create") as ReturnType<typeof vi.fn>).mockResolvedValue(
      {} as unknown as IAuditLog
    );
    vi.spyOn(notificationService, "sendNotification").mockResolvedValue({
      notification: {} as unknown as INotification,
      isDuplicate: false,
      emailSent: false,
    });

    const result = await service.submitApplication("user-1", "app-auto", { overrideTier: "AUTO_SUBMIT" });

    expect(result.success).toBe(true);
    expect(result.tier).toBe("AUTO_SUBMIT");
    expect(result.status).toBe("APPLIED");
    expect(result.confirmationReference).toBeDefined();
    expect(result.appliedDate).toBeDefined();
    expect(mockApp.save).toHaveBeenCalled();
    expect(ApplicationEvent.create).toHaveBeenCalled();
    expect(AuditLog.create).toHaveBeenCalled();
  });
});
