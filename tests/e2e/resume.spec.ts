import { expect, test } from "@playwright/test";
import { SignJWT } from "jose";

test("authenticated candidate can access resume library and upload dropzone", async ({
  page,
}) => {
  // Set test session cookie
  const secret = new TextEncoder().encode(
    process.env.AUTH_SECRET ||
      "jobpilot-development-auth-secret-do-not-use-in-production-32chars"
  );
  const testToken = await new SignJWT({
    userId: "test-user-e2e-id",
    email: "tester@example.com",
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

  await page.goto("/resumes");

  // Verify page title and header
  await expect(page.getByRole("heading", { name: "Resume intelligence & library" })).toBeVisible();

  // Verify dropzone and file format acceptance
  await expect(page.getByText("Upload Master Resume")).toBeVisible();
  await expect(page.getByText("Select PDF / DOCX")).toBeVisible();
  await expect(page.getByText(/Grounded fact preservation/i)).toBeVisible();

  // Verify master resumes section exists after library loads
  await expect(
    page.getByRole("heading", { name: "Master Resumes" })
  ).toBeVisible({ timeout: 20_000 });
});
