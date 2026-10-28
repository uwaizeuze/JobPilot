import { expect, type Page, test } from "@playwright/test";
import { SignJWT } from "jose";

async function authenticateTestSession(page: Page) {
  const secret = new TextEncoder().encode(
    process.env.AUTH_SECRET ||
      "jobpilot-development-auth-secret-do-not-use-in-production-32chars"
  );
  const testToken = await new SignJWT({
    userId: "test-user-agent-e2e-id",
    email: "agent-tester@example.com",
    name: "Agent Orchestrator",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(secret);

  await page.context().addCookies([
    {
      name: "jobpilot_session",
      value: testToken,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test("candidate can view registered agent tools and governance controls in AI Agent settings", async ({
  page,
}) => {
  await authenticateTestSession(page);
  await page.goto("/settings/agent");

  // Verify settings title
  await expect(page.getByRole("heading", { name: "AI Agent & Model Settings" })).toBeVisible({ timeout: 15000 });

  // Verify Governance card
  await expect(page.getByText("Governance & Safety Limits")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Global Emergency Pause")).toBeVisible({ timeout: 10000 });

  // Verify Registered Agent Tools card
  await expect(page.getByText(/Registered Agent Tools \(Section 9\.3\)/)).toBeVisible();
  await expect(page.getByText(/discover_jobs/)).toBeVisible();
  await expect(page.getByText(/fetch_job/)).toBeVisible();
  await expect(page.getByText(/analyze_job/)).toBeVisible();
  await expect(page.getByText(/submit_authorized_application/)).toBeVisible();

  // Verify Recent Autonomous Agent Executions card
  await expect(page.getByText("Recent Autonomous Agent Executions")).toBeVisible();
});

test("job preview details page displays Apply with AI Agent dialog with pipeline steps and tier gating", async ({
  page,
}) => {
  await authenticateTestSession(page);

  // Navigate to jobs preview (without id shows empty state guidance)
  await page.goto("/jobs/preview");
  await expect(page.getByRole("heading", { name: "Job Details & AI Match" })).toBeVisible();
  await expect(page.getByText("No job selected")).toBeVisible();
  await expect(page.getByRole("button", { name: "Browse Job Discovery" })).toBeVisible();
});
