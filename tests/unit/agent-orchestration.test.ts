import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentTask, type IAgentTask } from "@/models/agent-task";
import { Application, type IApplication } from "@/models/application";
import { ApplicationEvent } from "@/models/application-event";
import { AuditLog } from "@/models/audit-log";
import { UserPreference } from "@/models/preference";
import { AgentOrchestrationService } from "@/services/agent-orchestration.service";
import { toolRegistry } from "@/services/tool-registry";

vi.mock("@/lib/db", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

const asPrefQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof UserPreference.findOne>;
const asTaskQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof AgentTask.findOne>;
const asTaskFindByIdQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof AgentTask.findById>;
const asAppQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof Application.findOne>;

describe("AgentOrchestrationService", () => {
  let service: AgentOrchestrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AgentOrchestrationService();

    // Default mock AgentTask
    (vi.spyOn(AgentTask, "create") as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: "task-100",
      userId: "user-1",
      taskType: "job_application_pipeline",
      status: "running",
    } as unknown as IAgentTask);

    vi.spyOn(AgentTask, "findById").mockReturnValue(
      asTaskFindByIdQuery(
        Promise.resolve({
          _id: "task-100",
          status: "running",
        })
      )
    );

    (vi.spyOn(AgentTask, "updateOne") as ReturnType<typeof vi.fn>).mockResolvedValue({
      acknowledged: true,
      matchedCount: 1,
      modifiedCount: 1,
      upsertedCount: 0,
      upsertedId: null,
    });

    (vi.spyOn(ApplicationEvent, "create") as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (vi.spyOn(AuditLog, "create") as ReturnType<typeof vi.fn>).mockResolvedValue({});
  });

  it("aborts execution during preflight if globalPause is enabled", async () => {
    vi.spyOn(UserPreference, "findOne").mockReturnValue(
      asPrefQuery(
        Promise.resolve({
          userId: "user-1",
          globalPause: true,
          monthlyTokenBudget: 200000,
          tokensUsedThisMonth: 0,
          maxApplicationsPerDay: 10,
        })
      )
    );

    const result = await service.runJobApplicationPipeline("user-1", "job-1");

    expect(result.status).toBe("failed");
    expect(result.currentStep).toBe("preflight");
    expect(result.message).toContain("Global agent pause is enabled");
    expect(AgentTask.updateOne).toHaveBeenCalledWith(
      { _id: "task-100" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "failed" }),
      })
    );
  });

  it("aborts execution during preflight if daily application limit is reached", async () => {
    vi.spyOn(UserPreference, "findOne").mockReturnValue(
      asPrefQuery(
        Promise.resolve({
          userId: "user-1",
          globalPause: false,
          monthlyTokenBudget: 200000,
          tokensUsedThisMonth: 0,
          maxApplicationsPerDay: 5,
        })
      )
    );

    vi.spyOn(Application, "countDocuments").mockResolvedValue(5);

    const result = await service.runJobApplicationPipeline("user-1", "job-1");

    expect(result.status).toBe("failed");
    expect(result.currentStep).toBe("preflight");
    expect(result.message).toContain("Daily limit of 5 applications has been reached");
  });

  it("marks application FAILED if job posting is closed or expired", async () => {
    vi.spyOn(UserPreference, "findOne").mockReturnValue(
      asPrefQuery(
        Promise.resolve({
          userId: "user-1",
          globalPause: false,
          monthlyTokenBudget: 200000,
          tokensUsedThisMonth: 0,
          maxApplicationsPerDay: 10,
        })
      )
    );

    vi.spyOn(Application, "countDocuments").mockResolvedValue(0);

    vi.spyOn(toolRegistry, "executeTool").mockImplementation(async (name) => {
      if (name === "fetch_job") {
        return {
          jobId: "job-closed",
          title: "Closed Role",
          company: "Legacy Corp",
          location: "Remote",
          workMode: "remote",
          sourcePlatform: "Greenhouse",
          originalUrl: "https://boards.greenhouse.io/closed/1",
          description: "Closed posting",
          jobStatus: "closed",
        };
      }
      if (name === "verify_job_open") {
        return { jobId: "job-closed", isOpen: false, jobStatus: "closed" };
      }
      throw new Error(`Unexpected tool call: ${name}`);
    });

    vi.spyOn(Application, "findOne").mockReturnValue(asAppQuery(Promise.resolve(null)));
    (vi.spyOn(Application, "create") as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: "app-failed",
      status: "FAILED",
    } as unknown as IApplication);

    const result = await service.runJobApplicationPipeline("user-1", "job-closed");

    expect(result.status).toBe("failed");
    expect(result.currentStep).toBe("verify_job_open");
    expect(result.message).toContain("no longer accepting applications");
  });

  it("marks application NOT_QUALIFIED when match score is below minimum threshold", async () => {
    vi.spyOn(UserPreference, "findOne").mockReturnValue(
      asPrefQuery(
        Promise.resolve({
          userId: "user-1",
          globalPause: false,
          monthlyTokenBudget: 200000,
          tokensUsedThisMonth: 0,
          maxApplicationsPerDay: 10,
        })
      )
    );

    vi.spyOn(Application, "countDocuments").mockResolvedValue(0);

    vi.spyOn(toolRegistry, "executeTool").mockImplementation(async (name) => {
      if (name === "fetch_job") {
        return {
          jobId: "job-low",
          title: "Staff C++ Engineer",
          company: "Embedded Tech",
          location: "Onsite",
          workMode: "onsite",
          sourcePlatform: "Greenhouse",
          originalUrl: "https://boards.greenhouse.io/low/1",
          description: "C++ embedded",
          jobStatus: "open",
        };
      }
      if (name === "verify_job_open") {
        return { jobId: "job-low", isOpen: true, jobStatus: "open" };
      }
      if (name === "check_duplicate") {
        return { isDuplicate: false };
      }
      if (name === "analyze_job") {
        return {
          jobId: "job-low",
          analysisId: "analysis-1",
          requiredSkills: ["C++", "Kernel"],
          seniorityLevel: "staff",
          mandatoryConditions: [],
        };
      }
      if (name === "calculate_match") {
        return {
          jobId: "job-low",
          overallScore: 42, // Below 60%
          eligible: true,
          matchingSkills: [],
          missingSkills: ["C++", "Kernel"],
          recommendedAction: "Significant skill gap",
        };
      }
      throw new Error(`Unexpected tool call: ${name}`);
    });

    vi.spyOn(Application, "findOne").mockReturnValue(asAppQuery(Promise.resolve(null)));
    (vi.spyOn(Application, "create") as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: "app-nq",
      status: "NOT_QUALIFIED",
    } as unknown as IApplication);

    const result = await service.runJobApplicationPipeline("user-1", "job-low", {
      minimumMatchThreshold: 60,
    });

    expect(result.status).toBe("failed");
    expect(result.currentStep).toBe("calculate_match");
    expect(result.matchScore).toBe(42);
    expect(result.message).toContain("below required threshold of 60%");
  });

  it("halts execution immediately when user cancels an active agent task", async () => {
    vi.spyOn(AgentTask, "findOne").mockReturnValue(
      asTaskQuery(
        Promise.resolve({
          _id: "task-cancel",
          userId: "user-1",
          status: "running",
          payload: { jobId: "job-to-cancel" },
          save: vi.fn(),
        })
      )
    );

    vi.spyOn(Application, "findOne").mockReturnValue(
      asAppQuery(
        Promise.resolve({
          _id: "app-to-cancel",
          status: "PREPARING",
          save: vi.fn(),
        })
      )
    );

    const cancelled = await service.cancelAgentTask("user-1", "task-cancel");
    expect(cancelled).toBe(true);
  });
});
