import { expect, test } from "@playwright/test";
import { SignJWT } from "jose";

const TEST_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ||
    "jobpilot-development-auth-secret-do-not-use-in-production-32chars"
);

async function createTestSessionToken(userId = "e2e-privacy-user-123") {
  return new SignJWT({
    userId,
    email: "candidate.privacy@example.com",
    name: "Sam Privacy",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(TEST_SECRET);
}

async function authenticateTestSession(page: import("@playwright/test").Page) {
  const token = await createTestSessionToken();
  await page.context().addCookies([
    {
      name: "jobpilot_session",
      value: token,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test("candidate can access comprehensive dashboard with metric cards and conversion funnel", async ({
  page,
}) => {
  await authenticateTestSession(page);
  await page.goto("/dashboard");

  // Verify dashboard title
  await expect(page.getByRole("heading", { name: "Candidate Dashboard" })).toBeVisible({ timeout: 15000 });

  // Verify Quick Action buttons
  await expect(page.getByRole("link", { name: "Discover Jobs" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pipeline Tracker" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Practice Mock Interview" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Background Job Monitor" })).toBeVisible();

  const main = page.getByRole("main");

  // Verify Metric counters
  await expect(main.getByText("Jobs Discovered", { exact: true })).toBeVisible();
  await expect(main.getByText("High-Match (80%+)")).toBeVisible();
  await expect(main.getByText("Submitted")).toBeVisible();
  await expect(main.getByText("Awaiting Review")).toBeVisible();
  await expect(main.getByText("Interviews", { exact: true })).toBeVisible();

  // Verify Pipeline Funnel card
  await expect(main.getByText("Application Pipeline Funnel")).toBeVisible();
  await expect(main.getByText("1. Jobs Discovered")).toBeVisible();
  await expect(main.getByText("3. Dispatched & Applied")).toBeVisible();

  // Verify Recent Pipeline Activity card
  await expect(main.getByText("Recent Pipeline Activity")).toBeVisible();
});

test("candidate can access Privacy, Security & Data Management and view data export and retention controls", async ({
  page,
}) => {
  await authenticateTestSession(page);
  await page.goto("/settings/privacy");

  // Verify page title
  await expect(page.getByRole("heading", { name: "Privacy, Security & Data Management" })).toBeVisible({ timeout: 15000 });

  // Verify Zero-Resume-Logging guarantee
  await expect(page.getByText(/Zero-Resume-Logging Guarantee/)).toBeVisible();

  // Verify Portable Data Export card
  await expect(page.getByText("Portable Data Export")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export All My Data (JSON)" })).toBeVisible();

  // Verify Data Retention Policy card
  await expect(page.getByText("Data Retention Policy")).toBeVisible();
  await expect(page.getByLabel("Historical Cleanup Window")).toBeVisible();

  // Verify Security Audit Trail card
  await expect(page.getByText("Security & Activity Audit Log")).toBeVisible();

  // Verify Account Erasure danger zone
  await expect(page.getByText("Danger Zone — Permanent Account Erasure")).toBeVisible();
  await expect(page.getByRole("button", { name: "Permanently Delete My Account & All Data" })).toBeVisible();
});
