import { expect, type Page, test } from "@playwright/test";
import { SignJWT } from "jose";

async function authenticateTestSession(page: Page) {
  const secret = new TextEncoder().encode(
    process.env.AUTH_SECRET ||
      "jobpilot-development-auth-secret-do-not-use-in-production-32chars"
  );
  const testToken = await new SignJWT({
    userId: "test-user-interview-coach-e2e",
    email: "interview-coach@example.com",
    name: "Interview Coach Tester",
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

test("candidate can access Interview Prep Packs page and view layout shells", async ({
  page,
}) => {
  await authenticateTestSession(page);
  await page.goto("/interviews/prep");

  // Verify page title and header description
  await expect(page.getByRole("heading", { name: "Interview Prep Packs" })).toBeVisible();
  await expect(page.getByText(/Tailored questions, grounded STAR outlines/)).toBeVisible();

  // Verify Prep Packs sidebar card
  await expect(page.getByText(/Your Prep Packs/)).toBeVisible();
});

test("candidate can access Mock Interview Room and configure session parameters", async ({
  page,
}) => {
  await authenticateTestSession(page);
  await page.goto("/interviews/mock");

  // Verify room header
  await expect(page.getByRole("heading", { name: "Mock Interview Room" })).toBeVisible();
  await expect(page.getByText("Configure Your Mock Interview")).toBeVisible();

  // Verify configuration options
  await expect(page.getByText("Target Role or Title")).toBeVisible();
  await expect(page.getByText("Interview Type")).toBeVisible();
  await expect(page.getByText("Seniority Level")).toBeVisible();
  await expect(page.getByText("Question Count")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter Mock Room" })).toBeVisible();
});

test("candidate can access Interview History and Analytics dashboard", async ({
  page,
}) => {
  await authenticateTestSession(page);
  await page.goto("/interviews/history");

  // Verify header and metrics
  await expect(page.getByRole("heading", { name: "Interview History & Analytics" })).toBeVisible();
  await expect(page.getByText("Total Sessions")).toBeVisible();
  await expect(page.getByText("Average Score")).toBeVisible();
  await expect(page.getByText("Weak Topics Flagged")).toBeVisible();
  await expect(page.getByText("Practice Drills", { exact: true })).toBeVisible();

  // Verify analysis cards
  await expect(page.getByText("Recent Score Trends")).toBeVisible();
  await expect(page.getByText("Rubric Competency Averages")).toBeVisible();
});

test("candidate can access Interview Calendar and open schedule modal", async ({
  page,
}) => {
  await authenticateTestSession(page);
  await page.goto("/interviews/calendar");

  // Verify calendar header
  await expect(page.getByRole("heading", { name: "Interview Calendar" })).toBeVisible();

  // Open schedule dialog
  const scheduleBtn = page.getByRole("button", { name: "Schedule Interview", exact: true });
  await expect(scheduleBtn).toBeVisible();
  await scheduleBtn.click();

  // Verify modal appears
  await expect(page.getByRole("heading", { name: "Schedule Interview Round" })).toBeVisible();
  await expect(page.getByText("Target Application")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();

  // Close modal
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Schedule Interview Round" })).not.toBeVisible();
});
