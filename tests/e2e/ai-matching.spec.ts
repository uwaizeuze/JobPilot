import { expect, type Page, test } from "@playwright/test";
import { SignJWT } from "jose";

async function authenticateTestSession(page: Page) {
  const secret = new TextEncoder().encode(
    process.env.AUTH_SECRET ||
      "jobpilot-development-auth-secret-do-not-use-in-production-32chars"
  );
  const testToken = await new SignJWT({
    userId: "test-user-ai-e2e-id",
    email: "tester-ai@example.com",
    name: "Ada Lovelace",
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

test("candidate can access AI agent settings and view BYOK configuration", async ({
  page,
}) => {
  await authenticateTestSession(page);
  await page.goto("/settings/agent");

  // Verify page title
  await expect(page.getByRole("heading", { name: "AI Agent & Model Settings" })).toBeVisible();

  // Verify security policy banner
  await expect(page.getByText("Zero-Trust Key Storage & Client Isolation")).toBeVisible();

  // Verify key input and token budget controls after data loads
  await expect(page.getByLabel(/OpenAI API Key/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Monthly Token Budget")).toBeVisible();
  await expect(page.getByLabel("Max Applications / Day")).toBeVisible();

  // Verify candidate consent policies
  await expect(page.getByRole("button", { name: "Require Approval" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Governance Policies" })).toBeVisible();
});

test("job preview details page renders AI match triggers and empty fallback", async ({
  page,
}) => {
  await authenticateTestSession(page);
  await page.goto("/jobs/preview");

  // Verify page title
  await expect(page.getByRole("heading", { name: "Job Details & AI Match" })).toBeVisible();

  // Verify fallback when no job is selected
  await expect(page.getByText("No job selected")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Browse Job Discovery" })).toBeVisible();
});
