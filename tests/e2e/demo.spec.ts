import { test, expect, screenshotPath } from "./fixtures";
import { resetTestDatabase } from "../helpers/database";
import { editorContext } from "../helpers/workflow";
import { buildRiverbend } from "../../src/modules/demo/dataset";
test("fictional main workflow exposes core actions, keyboard disclosures, useful record errors and all main pages at 390px", async ({
  page,
}) => {
  await resetTestDatabase();
  const f = await editorContext();
  const demo = await buildRiverbend(f.adminHeaders);
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [href, label, heading] of [
    ["/dashboard", "Overview", "Riverbend Community Workshop"],
    ["/needs", "Needs", "Organizational needs"],
    ["/network", "Network", "People and relationships"],
    ["/companies", "Companies", "Companies and evidence"],
    ["/graph", "Graph", "Relationship graph"],
    ["/opportunities", "Opportunities", "Partnership opportunities"],
    ["/pipeline", "Pipeline", "Outreach pipeline"],
    ["/partnerships", "Partnerships", "Partnerships and previous outreach"],
    ["/onboarding", "Onboarding", "Organization onboarding"],
    ["/settings", "Settings", "Settings"],
  ]) {
    await page.goto(href);
    await expect(
      page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name: label, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    for (const box of await page.locator('input[type="checkbox"]').all())
      if (await box.isVisible())
        expect((await box.boundingBox())!.width).toBeLessThan(26);
  }
  await page.goto(`/opportunities/${demo.opportunities[0]}`);
  const plan = page.getByRole("region", { name: "Saved reviewed action plan" });
  await expect(plan.getByLabel("Reviewed introduction route")).toContainText(
    "Anna Example",
  );
  const summary = plan.getByText(
    "Inspect reviewed route, evidence and willingness",
    { exact: true },
  );
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(plan.locator("ol.text-path")).toBeVisible();
  expect(
    await summary.evaluate((e) => getComputedStyle(e).outlineStyle),
  ).not.toBe("none");
  await page.keyboard.press("Enter");
  await page.screenshot({
    path: screenshotPath("pi-t09-opportunity-390.png"),
    fullPage: true,
  });
  await page.goto("/graph");
  await expect(
    page.getByRole("button", { name: "Zoom In", exact: true }),
  ).toBeVisible();
  const text = page.getByText("Read all graph records as text", {
    exact: true,
  });
  await text.focus();
  await expect(text).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(text.locator("..")).toHaveAttribute("open", "");
  await expect(
    page.getByRole("heading", { name: "Recorded connections", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: screenshotPath("pi-t09-graph-390.png"),
    fullPage: true,
  });
  await page.goto(`/opportunities/${demo.opportunities[3]}`);
  const pipelineLink = page.getByRole("link", {
    name: "Open outreach pipeline",
    exact: true,
  });
  await pipelineLink.focus();
  await expect(pipelineLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    new RegExp(`/pipeline/${demo.opportunities[3]}$`),
  );
  await page
    .getByLabel("Recorded target role")
    .fill("Community grants coordinator");
  await page
    .getByLabel("Recorded action description")
    .fill("Fictional keyboard follow-up plan, not sent.");
  const recordAction = page.getByRole("button", {
    name: "Record planned action",
    exact: true,
  });
  await recordAction.focus();
  await expect(recordAction).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Fictional keyboard follow-up plan, not sent.", {
      exact: true,
    }),
  ).toBeVisible();
  const onboarding = page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Onboarding", exact: true });
  await onboarding.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/onboarding$/);
  await expect(
    page.getByRole("heading", {
      name: "Step 1: Organization",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/network");
  await page
    .getByLabel("Person name", { exact: true })
    .fill("Fictional invalid record");
  await page.getByLabel("Person email", { exact: true }).fill("bad-email");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(page.getByLabel("Person email", { exact: true })).toBeFocused();
  // Force a server-side validation failure which native date controls cannot identify.
  await page.route("**/api/records/people", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "VALIDATION",
          fields: [{ field: "name", message: "Enter a person name." }],
        },
      }),
    }),
  );
  await page
    .getByLabel("Person email", { exact: true })
    .fill("fictional@example.test");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Enter a person name." }),
  ).toBeFocused();
  await expect(page.getByLabel("Person name", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.screenshot({
    path: screenshotPath("pi-t09-network-errors-390.png"),
    fullPage: true,
  });
});
