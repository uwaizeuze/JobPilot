import { expect, type Page, test } from "@playwright/test";
import { SignJWT } from "jose";

async function authenticateTestSession(page: Page) {
  const secret = new TextEncoder().encode(
    process.env.AUTH_SECRET ||
      "jobpilot-development-auth-secret-do-not-use-in-production-32chars"
  );
  const testToken = await new SignJWT({
    userId: "test-user-tailor-e2e-id",
    email: "tester-tailor@example.com",
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

test("candidate can access tailored resume editor and view draft chrome", async ({
  page,
}) => {
  await authenticateTestSession(page);
  await page.goto("/resumes/preview");

  // Verify page title
  await expect(page.getByRole("heading", { name: "Tailored Resume Editor" })).toBeVisible({
    timeout: 20_000,
  });

  // Await loading completion
  await expect(page.getByText("Loading tailored resume...")).not.toBeVisible({
    timeout: 20_000,
  });

  // Verify empty state fallback when no draft has been tailored
  await expect(
    page.getByText(/No tailored resume draft generated yet/i)
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Browse Jobs" })).toBeVisible();
});

test("candidate can access cover letter editor with tone variations", async ({
  page,
}) => {
  await authenticateTestSession(page);
  await page.goto("/cover-letters/preview");

  // Verify page title
  await expect(page.getByRole("heading", { name: "Cover Letter Editor" })).toBeVisible();

  // Verify tone selector buttons
  await expect(page.getByRole("button", { name: "professional" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("button", { name: "enthusiastic" })).toBeVisible();
  await expect(page.getByRole("button", { name: "concise" })).toBeVisible();
});
