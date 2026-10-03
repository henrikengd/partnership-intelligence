import { test, expect, screenshotPath } from "./fixtures";
import { resetTestDatabase } from "../helpers/database";
import { savedWorkflow } from "../helpers/workflow";
import { generateOpportunity } from "../../src/modules/opportunities/service";
import { transitionOpportunity } from "../../src/modules/outreach/lifecycle";
import { db, person } from "../../src/server/db";
const privacyPath = process.env.PRIVACY_TEST_PATH ?? "/settings";
let f: Awaited<ReturnType<typeof savedWorkflow>>;
let opId: string;
test.beforeEach(async () => {
  await resetTestDatabase();
  f = await savedWorkflow();
  opId = (
    await generateOpportunity(f.headers, {
      companyId: f.companyId,
      needId: f.needId,
      partnershipType: "in_kind",
    })
  ).id;
  await transitionOpportunity(f.headers, opId, {
    requestId: crypto.randomUUID(),
    action: "agreement",
    fromState: "suggested",
    confirmed: true,
    occurredDate: "2020-03-04",
    source: "Anna Example fictional confirmation",
    newPartnership: {
      title: "Anna Example contribution",
      type: "in_kind",
      state: "current",
      startDate: "2020-04-01",
    },
  });
});
test("reviews deletion, cancels safely, preserves outcome detail and regenerates the same proposal", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto(privacyPath);
  await expect(
    page.getByRole("heading", { name: "Private data controls" }),
  ).toBeVisible();
  await page.getByLabel("Person to delete").selectOption(f.personId);
  await page.getByRole("button", { name: "Preview deletion impact" }).click();
  await expect(
    page.getByRole("heading", { name: "Deletion preview: Anna Example" }),
  ).toBeVisible();
  await page.screenshot({
    path: screenshotPath("pi-t08-privacy-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: screenshotPath("pi-t08-privacy-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Cancel deletion" }).click();
  await expect(page.getByRole("status")).toContainText("No records changed");
  expect(await db.select().from(person)).toHaveLength(1);
  await page.getByRole("button", { name: "Preview deletion impact" }).click();
  await page.getByRole("checkbox", { name: /I reviewed this impact/ }).check();
  await page.getByRole("button", { name: "Confirm person deletion" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Person and related private material removed",
  );
  expect(await db.select().from(person)).toHaveLength(0);
  await page.goto(`/pipeline/${opId}`);
  await expect(
    page.getByRole("heading", { name: "Assessment material removed" }),
  ).toBeVisible();
  await expect(page.locator("body")).toContainText("2020-03-04");
  await expect(page.locator("body")).not.toContainText("Anna Example");
  await page.screenshot({
    path: screenshotPath("pi-t08-outcome-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto(`/opportunities/${opId}`);
  await expect(
    page.getByRole("heading", { name: "Assessment material removed" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Regenerate from recorded inputs" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Assessment material removed" }),
  ).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/opportunities/${opId}`));
  await expect(page.locator("body")).not.toContainText("Anna Example");
});
