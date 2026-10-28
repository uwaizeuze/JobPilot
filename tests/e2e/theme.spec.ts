import { expect, test } from "@playwright/test";
import { SignJWT } from "jose";

import { THEME_TEST_ROUTES } from "../../lib/routes";

test("theme toggle persists after reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("jobpilot-theme")))
    .toBe("dark");

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("jobpilot-theme")))
    .toBe("dark");

  await page.getByRole("radio", { name: "Light" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("every foundation page renders in light and dark themes", async ({
  page,
}) => {
  test.setTimeout(180_000);

  // Authenticate session for protected route coverage
  const secret = new TextEncoder().encode(
    process.env.AUTH_SECRET ||
      "jobpilot-development-auth-secret-do-not-use-in-production-32chars"
  );
  const testToken = await new SignJWT({
    userId: "test-user-e2e-id",
    email: "tester@example.com",
    name: "Test Developer",
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

  for (const path of THEME_TEST_ROUTES) {
    await page.goto(path);
    await page.getByRole("radio", { name: "Light" }).first().click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.getByText("Phase 1", { exact: true }).first()).toBeVisible();

    await page.getByRole("radio", { name: "Dark" }).first().click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByText("Phase 1", { exact: true }).first()).toBeVisible();
  }
});
