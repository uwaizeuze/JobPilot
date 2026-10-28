import { expect, test } from "@playwright/test";
import { SignJWT } from "jose";

const TEST_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ||
    "jobpilot-development-auth-secret-do-not-use-in-production-32chars"
);

async function createTestSessionToken(userId = "e2e-worker-user-123") {
  return new SignJWT({
    userId,
    email: "candidate.worker@example.com",
    name: "Alex Queue",
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

test("candidate can access Background Job Monitor and inspect queue health and scheduled cron tasks", async ({
  page,
}) => {
  await authenticateTestSession(page);
  await page.goto("/settings/jobs");

  // Verify page title
  await expect(page.getByRole("heading", { name: "Background Job Monitor & Queues" })).toBeVisible({ timeout: 15000 });

  // Verify Worker Service status card
  await expect(page.getByText(/Worker Service:/)).toBeVisible();

  // Verify Queue Metric counters
  await expect(page.getByText("Waiting in Queue")).toBeVisible();
  await expect(page.getByText("Active Processing")).toBeVisible();
  await expect(page.getByText("Completed")).toBeVisible();
  await expect(page.getByText("Pending in Database")).toBeVisible();

  // Verify Scheduled Background Tasks card & tasks
  await expect(page.getByText("Scheduled Background Tasks")).toBeVisible();
  await expect(page.getByText("daily_discovery")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("notification_follow_up_scan")).toBeVisible();
  await expect(page.getByText("notification_interview_reminder_scan")).toBeVisible();

  // Verify Email Delivery Test card
  await expect(page.getByText("Email Delivery Test")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send Test Notification" })).toBeVisible();
});

test("candidate can access Notification Center, toggle read filters, and configure event delivery channels", async ({
  page,
}) => {
  await authenticateTestSession(page);
  await page.goto("/notifications");

  // Verify page title
  await expect(page.getByRole("heading", { name: "Notification Center" })).toBeVisible({ timeout: 15000 });

  // Verify inbox navigation buttons
  await expect(page.getByRole("button", { name: "Inbox" })).toBeVisible();
  const prefsButton = page.getByRole("button", { name: "Preferences & Channels" });
  await expect(prefsButton).toBeVisible();

  // Switch to Preferences & Channels tab
  await prefsButton.click();

  // Verify preferences cards
  await expect(page.getByText("Delivery Channels")).toBeVisible();
  await expect(page.getByText("Event Triggers")).toBeVisible();
  await expect(page.getByText("High-Match Alert Threshold")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Notification Preferences" })).toBeVisible();
});
