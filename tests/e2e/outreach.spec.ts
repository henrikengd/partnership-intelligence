import { test, expect, screenshotPath } from "./fixtures";
import { resetTestDatabase } from "../helpers/database";
import { savedWorkflow } from "../helpers/workflow";
import { generateOpportunity } from "../../src/modules/opportunities/service";
let f: Awaited<ReturnType<typeof savedWorkflow>>;
let opId: string;
test.beforeEach(async () => {
  await resetTestDatabase();
  f = await savedWorkflow();
  opId = (
    await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    })
  ).id;
});
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("editor@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
}
test("assigns ownership, records action, resolves and reschedules follow-up, archives/reopens and records confirmed outcome", async ({
  page,
}) => {
  await login(page);
  await page.goto(`/pipeline/${opId}`);
  await page
    .getByLabel("Team owner", { exact: true })
    .selectOption(f.editor.id);
  await page
    .getByRole("button", { name: "Save brief and owner", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Brief and owner saved");
  await page
    .getByLabel("Recorded target role", { exact: true })
    .fill("Operations lead");
  await page
    .getByLabel("Recorded action description")
    .fill("Fictional introduction request recorded manually");
  await page
    .getByLabel("Next follow-up date", { exact: true })
    .fill("2020-01-02");
  await page
    .getByRole("button", { name: "Record planned action", exact: true })
    .click();
  const history = page
    .locator("article")
    .filter({ hasText: "Fictional introduction request recorded manually" });
  await expect(history).toContainText("Planned, not completed");
  await history.getByLabel("Actual completion date").fill("2020-01-01");
  await history
    .getByRole("button", { name: "Mark action completed", exact: true })
    .click();
  await expect(history).toContainText("Completed action");
  await expect(history).toContainText("Occurred 2020-01-01");
  await expect(history).toContainText("Overdue follow-up");
  const resolved = history.getByRole("checkbox", {
    name: "Follow-up resolved separately from activity completion",
  });
  await resolved.check();
  await history
    .getByRole("button", { name: "Save follow-up", exact: true })
    .click();
  await expect(history).toContainText("Follow-up resolved");
  await expect(
    history.getByRole("button", { name: "Save follow-up", exact: true }),
  ).toBeEnabled();
  await history
    .getByLabel("Follow-up date for this activity")
    .fill("2020-01-03");
  await expect(resolved).not.toBeChecked();
  await history
    .getByRole("button", { name: "Save follow-up", exact: true })
    .click();
  await expect(history).toContainText("Overdue follow-up · 2020-01-03");
  await expect(resolved).not.toBeChecked();
  await page.getByLabel("Next lifecycle state").selectOption("archived");
  await page
    .getByLabel("Transition or reopening reason")
    .fill("Fictional capacity pause");
  await page
    .getByRole("button", { name: "Record state change", exact: true })
    .click();
  await expect(page.getByText("Current state:")).toContainText("archived");
  await expect(history).toContainText("Completed action");
  await page
    .getByLabel("Transition or reopening reason")
    .fill("Fictional capacity restored");
  await page
    .getByRole("button", { name: "Explicitly reopen opportunity", exact: true })
    .click();
  await expect(page.getByText("Current state:")).toContainText("suggested");
  await expect(
    page.getByText("archived → suggested", { exact: true }),
  ).toBeVisible();
  await page
    .getByText("Record a confirmed partnership agreement", { exact: true })
    .click();
  await page
    .getByLabel("New partnership title")
    .fill("Fictional CNC contribution");
  await page.getByLabel("New partnership start").fill("2090-01-01");
  await page
    .getByLabel("New partnership contribution")
    .fill("Ten fictional machined fixtures");
  await page.getByLabel("Actual agreement date").fill("2020-01-01");
  await page
    .getByLabel("Agreement source or attribution")
    .fill("Fictional signed confirmation supplied by coordinator");
  await page
    .getByRole("checkbox", {
      name: "The agreement actually happened; this is not a draft",
    })
    .check();
  await page
    .getByRole("button", { name: "Record confirmed agreement", exact: true })
    .click();
  await expect(page.getByText("Current state:")).toContainText("agreed");
  await page.screenshot({
    path: screenshotPath("pi-t06-actions-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: screenshotPath("pi-t06-actions-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Company history", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Fictional CNC contribution · current" }),
  ).toBeVisible();
  await expect(
    page.getByText("suggested → agreed · 2020-01-01", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", {
      name: "Open original opportunity history",
      exact: true,
    })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Lifecycle and outcomes", exact: true }),
  ).toBeVisible();
  await page.goto("/pipeline");
  await expect(
    page.getByRole("heading", { name: "agreed", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: screenshotPath("pi-t06-pipeline-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: screenshotPath("pi-t06-pipeline-desktop.png"),
    fullPage: true,
  });
});
test("rejects direct anonymous private endpoints and unreviewed pursuit without recording history", async ({
  page,
  request,
}) => {
  for (const path of [
    `/api/opportunities/${opId}/lifecycle`,
    `/api/activities/${opId}/follow-up`,
  ]) {
    const response = await request.post(path, {
      headers: { Origin: process.env.BETTER_AUTH_URL! },
      data: path.includes("lifecycle")
        ? {
            requestId: crypto.randomUUID(),
            action: "transition",
            fromState: "suggested",
            toState: "shortlisted",
          }
        : { followUpDate: null, resolved: false },
    });
    expect(response.status()).toBe(401);
  }
  await login(page);
  await page.goto(`/pipeline/${opId}`);
  await page.getByLabel("Next lifecycle state").selectOption("pursuing");
  await page
    .getByRole("button", { name: "Record state change", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("Current state:")).toContainText("suggested");
  await expect(
    page.getByText("No lifecycle changes recorded.", { exact: true }),
  ).toBeVisible();
});
