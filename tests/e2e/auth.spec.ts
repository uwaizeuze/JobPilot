import { expect, test } from "@playwright/test";

test("unauthenticated visitors are redirected from protected routes to login", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?from=%2Fdashboard/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("login page renders form inputs and handles submission error", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

  // Attempt sign in with fake credentials
  await page.getByLabel("Email").fill("nonexistent@example.com");
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();

  // Expect error notification to appear
  await expect(
    page.getByText(/Invalid|MONGODB_URI|failed|error/i)
  ).toBeVisible({ timeout: 30_000 });
});

test("register page renders all required registration fields", async ({
  page,
}) => {
  await page.goto("/register");
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create account" })
  ).toBeVisible();
});
