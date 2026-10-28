import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "@/services/tool-registry";

describe("ToolRegistry", () => {
  it("registers all 20 tools specified in Section 9.3", () => {
    const registry = ToolRegistry.getInstance();
    const tools = registry.getAllTools();

    expect(tools.length).toBe(20);

    const requiredTools = [
      "discover_jobs",
      "fetch_job",
      "analyze_job",
      "calculate_match",
      "check_duplicate",
      "verify_job_open",
      "generate_resume",
      "generate_cover_letter",
      "prepare_application",
      "validate_application",
      "request_approval",
      "prefill_form",
      "submit_authorized_application",
      "record_result",
      "update_application_status",
      "notify_user",
      "generate_interview_prep",
      "start_mock_interview",
      "evaluate_answer",
      "summarize_interview_session",
    ];

    for (const toolName of requiredTools) {
      const tool = registry.getTool(toolName);
      expect(tool).toBeDefined();
      expect(tool?.name).toBe(toolName);
      expect(typeof tool?.description).toBe("string");
      expect(tool?.inputSchema).toBeDefined();
      expect(tool?.outputSchema).toBeDefined();
    }
  });

  it("strictly enforces server-side verified userId context", async () => {
    const registry = ToolRegistry.getInstance();

    await expect(
      registry.executeTool(
        "fetch_job",
        { userId: "" },
        { jobId: "job-1" }
      )
    ).rejects.toThrow(/requires a verified server-side userId/);
  });

  it("rejects invalid input schema arguments with Zod validation error", async () => {
    const registry = ToolRegistry.getInstance();

    await expect(
      registry.executeTool(
        "fetch_job",
        { userId: "user-123" },
        { jobId: "" } // schema requires min(1)
      )
    ).rejects.toThrow(/Invalid input for tool 'fetch_job'/);
  });

  it("aborts tool execution when timeout is exceeded", async () => {
    const registry = ToolRegistry.getInstance();

    // Register a temporary slow tool
    registry.register({
      name: "slow_test_tool",
      description: "Times out for testing",
      inputSchema: z.object({ delayMs: z.number() }),
      outputSchema: z.object({ done: z.boolean() }),
      timeoutMs: 50, // 50ms timeout
      execute: async (_ctx, input) => {
        await new Promise((resolve) => setTimeout(resolve, input.delayMs));
        return { done: true };
      },
    });

    await expect(
      registry.executeTool(
        "slow_test_tool",
        { userId: "user-123" },
        { delayMs: 200 }
      )
    ).rejects.toThrow(/timed out after 50ms/);
  });
});
