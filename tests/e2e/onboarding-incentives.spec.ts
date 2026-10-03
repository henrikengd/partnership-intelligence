import { test, expect, screenshotPath } from "./fixtures";
import { resetTestDatabase } from "../helpers/database";
import { editorContext } from "../helpers/workflow";
import { saveRecord } from "../../src/modules/records/service";
import { saveIncentive } from "../../src/modules/opportunities/runs";
import { saveOnboarding } from "../../src/modules/onboarding/service";
test("cash incentive onboarding offers and generates a brief with no capability record", async ({
  page,
}) => {
  await resetTestDatabase();
  const f = await editorContext();
  const n = await saveRecord(f.headers, "needs", {
    title: "Fictional grant",
    description: "Fund defined workshop materials",
    category: "cash",
    partnershipType: "cash",
  });
  const c = await saveRecord(f.headers, "companies", {
    name: "Fictional Grant Foundation",
  });
  const e = await saveRecord(f.headers, "evidence", {
    claim: "Fictional current grant accepts workshop requests",
    sourceType: "observation",
    attribution: "Fictional grant notice",
    excerpt: "Fictional supplied grant criteria",
    observedDate: new Date().toISOString().slice(0, 10),
    reviewState: "supplied",
  });
  await saveIncentive(f.headers, {
    needId: n.id,
    companyId: c.id,
    evidenceId: e.id,
    description: "Grant supports defined community workshop material funding",
  });
  await saveOnboarding(f.headers, { step: 7 });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("editor@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/onboarding");
  await page.setViewportSize({ width: 390, height: 844 });
  const button = page.getByRole("button", {
    name: "Generate brief: Fictional grant → Fictional Grant Foundation",
    exact: true,
  });
  await expect(button).toBeVisible();
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/opportunities\/[a-f0-9-]+$/);
  await expect(
    page.getByRole("heading", {
      name: "Fictional Grant Foundation",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Fictional current grant accepts workshop requests", {
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: screenshotPath("pi-review-cash-onboarding-390.png"),
    fullPage: true,
  });
});
