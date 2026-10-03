import { test, expect } from "./fixtures";
test("setup, private organization, invite, editor, and revoked direct access", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto("/setup");
  await page.getByLabel("Your name").fill("Riverbend administrator");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-password-123");
  await page
    .getByLabel("Installation setup secret")
    .fill(process.env.BOOTSTRAP_SECRET!);
  await page.getByRole("button", { name: "Create administrator" }).click();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Organization name").fill("Riverbend test workshop");
  await page.getByRole("button", { name: "Save organization" }).click();
  await expect(page.getByText("Organization profile saved.")).toBeVisible();
  await page.getByLabel("Invite email").fill("editor@example.test");
  await page.getByRole("button", { name: "Create invitation" }).click();
  const link = await page.getByTestId("invite-link").innerText();
  const editorContext = await browser.newContext({ baseURL });
  const editor = await editorContext.newPage();
  await editor.goto(link);
  await editor.getByLabel("Your name").fill("Fictional editor");
  await editor.getByLabel("Email", { exact: true }).fill("editor@example.test");
  await editor
    .getByLabel("Password", { exact: true })
    .fill("Fictional-password-123");
  await editor.getByRole("button", { name: "Accept invitation" }).click();
  await editor.getByRole("link", { name: "Sign in", exact: true }).click();
  await editor.getByLabel("Email", { exact: true }).fill("editor@example.test");
  await editor
    .getByLabel("Password", { exact: true })
    .fill("Fictional-password-123");
  await editor.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    editor.getByRole("heading", {
      name: "Riverbend test workshop",
      exact: true,
    }),
  ).toBeVisible();
  expect((await editorContext.request.get("/api/admin/users")).status()).toBe(
    403,
  );
  expect(
    (
      await editorContext.request.put("/api/organization", {
        data: { name: "Unauthorized" },
        headers: { Origin: baseURL! },
      })
    ).status(),
  ).toBe(403);
  await page.reload();
  const account = page
    .locator(".account")
    .filter({ hasText: "editor@example.test" });
  await account.getByRole("button", { name: "Revoke access" }).click();
  await expect(account.getByText(/Revoked/)).toBeVisible();
  expect((await editorContext.request.get("/api/organization")).status()).toBe(
    401,
  );
  expect(
    (
      await editorContext.request.post("/api/auth/change-password", {
        data: {
          currentPassword: "Fictional-password-123",
          newPassword: "Another-password-123",
        },
        headers: { Origin: baseURL! },
      })
    ).status(),
  ).toBe(401);
  expect(
    (await editorContext.request.get("/api/auth/get-session")).status(),
  ).toBe(401);
  await editor.goto("/dashboard");
  await expect(editor).toHaveURL(/login/);
  const publicContext = await browser.newContext({ baseURL });
  expect(
    (
      await publicContext.request.post("/api/auth/sign-up/email", {
        data: {
          name: "Bypass",
          email: "bypass@example.test",
          password: "Fictional-password-123",
        },
        headers: { Origin: baseURL! },
      })
    ).status(),
  ).toBe(403);
  expect((await publicContext.request.get("/api/organization")).status()).toBe(
    401,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await editorContext.close();
  await publicContext.close();
});
