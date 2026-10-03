import { test, expect, screenshotPath } from "./fixtures";
import { resetTestDatabase } from "../helpers/database";
import { savedNetwork } from "../helpers/network";
import { saveRecord } from "../../src/modules/records/service";
import { generateOpportunity } from "../../src/modules/opportunities/service";
let f: Awaited<ReturnType<typeof savedNetwork>>;
let opportunityId: string;
test.beforeEach(async () => {
  await resetTestDatabase();
  f = await savedNetwork();
  const op = await generateOpportunity(f.headers, {
    companyId: f.companyId,
    needId: f.needId,
    partnershipType: "in_kind",
  });
  opportunityId = op.id;
  await saveRecord(f.headers, "relationships", {
    id: f.relationshipId,
    kind: "previously_worked_at",
    personId: f.personId,
    companyId: f.companyId,
    state: "ended",
    endDate: "2025-01-01",
    evidenceId: f.employmentSourceId,
  });
  await saveRecord(f.headers, "companies", {
    name: "Fictional Logistics Collective",
  });
});
test("focuses graph by company/opportunity, exposes source details by keyboard and explains cold approaches", async ({
  page,
  baseURL,
}) => {
  await page.goto(`/graph?company=${f.companyId}`);
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Email", { exact: true }).fill("editor@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto(`/graph?company=${f.companyId}`);
  await expect(
    page.getByRole("heading", { name: "Relationship graph", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Current route 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lead to verify 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Weakest personal connection:", { exact: false }).first(),
  ).toBeVisible();
  const textSummary = page
    .locator("summary")
    .filter({ hasText: "Read all graph records as text" });
  await textSummary.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Recorded connections", exact: true }),
  ).toBeVisible();
  const evidenceSummary = page
    .locator("summary")
    .filter({ hasText: "View connection evidence (reviewed)" })
    .first();
  await evidenceSummary.focus();
  await page.keyboard.press("Enter");
  await expect(
    evidenceSummary
      .locator("..")
      .getByText("Anna reports knowing Bea, who works at Cedar.", {
        exact: true,
      }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: screenshotPath("pi-t04-graph-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: screenshotPath("pi-t04-graph-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto(`/companies/${f.companyId}`);
  await expect(
    page.getByRole("heading", { name: "Cedar Manufacturing", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Current route 1", exact: true }),
  ).toBeVisible();
  await page.goto(`/graph?opportunity=${opportunityId}`);
  await expect(
    page.getByRole("link", { name: "Return to opportunity", exact: true }),
  ).toHaveAttribute("href", `/opportunities/${opportunityId}`);
  await page
    .getByLabel("Focus on company")
    .selectOption({ label: "Fictional Logistics Collective" });
  await page
    .getByRole("button", { name: "Apply company filter", exact: true })
    .click();
  await expect(
    page
      .getByText(/No permitted current internal route is recorded/)
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Current route 1", exact: true }),
  ).toHaveCount(0);
  await page.goto("/graph?company=bad-id");
  await expect(page.getByText(/This page could not be found/)).toBeVisible();
  const anonymous = await page.context().browser()!.newContext({ baseURL });
  const p = await anonymous.newPage();
  await p.goto(`/companies/${f.companyId}`);
  await expect(p).toHaveURL(/login/);
  await anonymous.close();
});
