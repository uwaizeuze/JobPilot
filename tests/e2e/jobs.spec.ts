import { expect, type Page, test } from "@playwright/test";
import { SignJWT } from "jose";

async function authenticateTestSession(page: Page) {
  const secret = new TextEncoder().encode(
    process.env.AUTH_SECRET ||
      "jobpilot-development-auth-secret-do-not-use-in-production-32chars"
  );
  const testToken = await new SignJWT({
    userId: "test-user-jobs-e2e-id",
    email: "tester-jobs@example.com",
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

test("authenticated candidate can access job discovery page and open import dialog", async ({
  page,
}) => {
  await authenticateTestSession(page);
  await page.goto("/jobs");

  // Verify page title and description
  await expect(page.getByRole("heading", { name: "Job Discovery" })).toBeVisible();
  await expect(page.getByPlaceholder("Search by title, company, or skills...")).toBeVisible();

  // Verify filter buttons
  await expect(page.getByRole("button", { name: "remote", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "hybrid", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "onsite", exact: true })).toBeVisible();

  // Verify action buttons
  await expect(page.getByRole("button", { name: "Import Job Listing" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Discover ATS Boards" })).toBeVisible();

  // Open Manual Import Dialog
  await page.getByRole("button", { name: "Import Job Listing" }).click();
  await expect(page.getByLabel("Job Title")).toBeVisible();
  await expect(page.getByLabel("Company")).toBeVisible();
  await expect(page.getByLabel("Job Description")).toBeVisible();

  // Close Dialog
  await page.getByRole("button", { name: "Cancel" }).click();
});

test("authenticated candidate can access integrations and see honest capability flags", async ({
  page,
}) => {
  await authenticateTestSession(page);
  await page.goto("/settings/integrations");

  // Verify page title
  await expect(page.getByRole("heading", { name: "Integrations & Job Sources" })).toBeVisible();

  // Verify compliance architecture banner
  await expect(
    page.getByText("Honest Platform Architecture & Policy Compliance")
  ).toBeVisible();

  // Verify provider catalog items appear
  await expect(page.getByText("Greenhouse Public Job Board")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Lever Public Job Board")).toBeVisible();
  await expect(page.getByText("LinkedIn", { exact: true })).toBeVisible();
  await expect(page.getByText("Indeed", { exact: true })).toBeVisible();
  await expect(page.getByText("Naukri", { exact: true })).toBeVisible();

  // Verify honest manual badges for scraping-restricted platforms
  const manualBadges = page.getByText("Manual Candidate Import Only");
  await expect(manualBadges.first()).toBeVisible();
});
