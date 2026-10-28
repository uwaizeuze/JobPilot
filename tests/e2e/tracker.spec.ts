import { expect, type Page, test } from "@playwright/test";
import { SignJWT } from "jose";

async function authenticateTestSession(page: Page) {
  const secret = new TextEncoder().encode(
    process.env.AUTH_SECRET ||
      "jobpilot-development-auth-secret-do-not-use-in-production-32chars"
  );
  const testToken = await new SignJWT({
    userId: "test-user-tracker-e2e-id",
    email: "tester-tracker@example.com",
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

test("candidate can access application tracker with Kanban and Table views", async ({
  page,
}) => {
  await authenticateTestSession(page);
  await page.goto("/tracker");

  // Verify page title and header
  await expect(page.getByRole("heading", { name: "Application Tracker" })).toBeVisible({
    timeout: 20_000,
  });

  // Verify metric summary cards scoped to main content region
  const main = page.getByRole("main");
  await expect(main.getByText("Total Tracked")).toBeVisible();
  await expect(main.locator("div").filter({ hasText: /^Preparing$/ })).toBeVisible();
  await expect(main.locator("div").filter({ hasText: /^Applied$/ })).toBeVisible();
  await expect(main.getByText("Interviews")).toBeVisible();
  await expect(main.getByText("Offers")).toBeVisible();

  // Verify search input and status selector
  await expect(
    page.getByPlaceholder(/Search by company or job title/i)
  ).toBeVisible();

  // Verify view toggles
  const kanbanBtn = page.getByRole("button", { name: /Kanban/i });
  const tableBtn = page.getByRole("button", { name: /Table/i });
  await expect(kanbanBtn).toBeVisible();
  await expect(tableBtn).toBeVisible();

  // Verify toggle to Table view
  await tableBtn.click();
  // Either table or empty card renders
  await expect(
    page.getByText(/No applications tracked yet/i).or(page.getByRole("table"))
  ).toBeVisible();

  // Switch back to Kanban
  await kanbanBtn.click();
  await expect(
    page.getByText(/No applications tracked yet/i).or(page.getByText(/Saved & Discovered/i))
  ).toBeVisible();
});
