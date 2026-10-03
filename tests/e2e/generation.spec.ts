import { test, expect } from "./fixtures";
import { resetTestDatabase } from "../helpers/database";
import { savedWorkflow } from "../helpers/workflow";
import { saveRecord } from "../../src/modules/records/service";
import { startGenerationRun } from "../../src/modules/opportunities/runs";
import { db, generationRun } from "../../src/server/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
let f: Awaited<ReturnType<typeof savedWorkflow>>;
test.beforeEach(async () => {
  await resetTestDatabase();
  f = await savedWorkflow();
  await saveRecord(f.headers, "companies", {
    name: "Fictional Logistics Collective",
  });
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
test("previews supported and explicit candidates, reviews a concrete cold approach and starts pursuing", async ({
  page,
  baseURL,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Opportunities", exact: true }).click();
  await page.getByLabel("Batch need").selectOption({ label: "CNC machining" });
  await page
    .getByRole("button", { name: "Preview known candidates", exact: true })
    .click();
  await expect(
    page.getByLabel("Select Cedar Manufacturing", { exact: true }),
  ).toBeChecked();
  await expect(
    page.getByLabel("Select Fictional Logistics Collective", { exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByText("Explicit selection only. No supported automatic match.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/Recorded manufacturing capability/),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Generate selected opportunities",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Run completed" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Open opportunity", exact: true })
    .first()
    .click();
  await page.getByText("Review readiness and target", { exact: true }).click();
  const start = page.getByRole("button", {
    name: "Start pursuing",
    exact: true,
  });
  await expect(start).toBeDisabled();
  await page
    .getByLabel("Reviewed fit rationale", { exact: true })
    .fill(
      "Cedar's supplied equipment claim supports a machining discussion; verify drawings and schedule.",
    );
  await page
    .getByLabel("Reviewed fit evidence", { exact: true })
    .selectOption([f.sourceId]);
  await page
    .getByLabel("Concrete reviewed ask", { exact: true })
    .fill(
      "Machine ten fixtures from reviewed CAD drawings before our defined workshop date.",
    );
  await page
    .getByLabel("Reviewed relevant contact role", { exact: true })
    .fill("Operations lead");
  await page
    .getByLabel("Concrete reviewed first action", { exact: true })
    .fill(
      "Verify the operations lead role and request a short technical scoping meeting.",
    );
  await page
    .getByLabel("Reviewed named company contact", { exact: true })
    .selectOption(f.personId);
  await page
    .getByLabel("Reviewed approach", { exact: true })
    .selectOption("cold");
  for (const name of [
    "I reviewed fit against its sources and the current need.",
    "I reviewed a concrete ask and its scope.",
    "I reviewed the target role/person and this permitted approach.",
    "I reviewed a concrete first action and existing discussions.",
  ])
    await page.getByRole("checkbox", { name, exact: true }).check();
  await page
    .getByRole("button", { name: "Save readiness review", exact: true })
    .click();
  await expect(
    page.getByText("Readiness review saved. You can now start pursuing.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(start).toBeEnabled();
  await page.reload();
  const actionPlan = page.getByRole("region", {
    name: "Saved reviewed action plan",
  });
  await expect(
    actionPlan.getByText("Anna Example · Operations lead", { exact: true }),
  ).toBeVisible();
  await expect(
    actionPlan.getByText(/Explicit cold approach. No warm introduction/),
  ).toBeVisible();
  await expect(
    actionPlan.getByText(
      "Machine ten fixtures from reviewed CAD drawings before our defined workshop date.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByText("Review readiness and target", { exact: true }).click();
  await start.click();
  await expect(page.getByText(/Need: CNC machining · pursuing/)).toBeVisible();
  await page
    .getByText("Read immutable assessment versions", { exact: true })
    .click();
  const version = page.locator("summary").filter({ hasText: "Version 1 ·" });
  await version.focus();
  await page.keyboard.press("Enter");
  await expect(
    version
      .locator("..")
      .getByText(/This immutable snapshot excludes later manual brief edits/),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "/private/tmp/pi-t05-opportunity-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/private/tmp/pi-t05-opportunity-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const anonymous = await page.context().browser()!.newContext({ baseURL });
  expect((await anonymous.request.get("/api/generation-runs")).status()).toBe(
    401,
  );
  expect(
    (
      await anonymous.request.post("/api/generation-runs", {
        headers: { Origin: baseURL! },
        data: {
          needId: f.needId,
          companyIds: [f.companyId],
          idempotencyKey: randomUUID(),
        },
      })
    ).status(),
  ).toBe(401);
  await anonymous.close();
});
test("shows interrupted work and explicitly retries the same run while preserving its active proposal", async ({
  page,
}) => {
  const run = await startGenerationRun(f.headers, {
    needId: f.needId,
    companyIds: [f.companyId],
    idempotencyKey: randomUUID(),
  });
  await db
    .update(generationRun)
    .set({
      status: "interrupted",
      errorCategory: "PROCESS_RESTART",
      finishedAt: new Date(),
      results: [],
    })
    .where(eq(generationRun.id, run.id));
  await login(page);
  await page.getByRole("link", { name: "Opportunities", exact: true }).click();
  await expect(page.getByText("interrupted", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Retry the same run", exact: true })
    .click();
  await expect(page.getByText("completed", { exact: true })).toBeVisible();
  await expect(page.getByText(/attempt 2/)).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Cedar Manufacturing · CNC machining",
      exact: true,
    }),
  ).toHaveCount(1);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "/private/tmp/pi-t05-candidates-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("reload shows the chosen alternative route and named terminal contact, then marks a changed plan historical", async ({
  page,
}) => {
  const bob = await saveRecord(f.headers, "people", {
    name: "Bob Example",
    roles: ["advisor"],
  });
  const source = await saveRecord(f.headers, "evidence", {
    claim: "Bob reports current employment at Cedar.",
    sourceType: "observation",
    attribution: "Bob, fictional observation",
    excerpt: "I work at Cedar.",
    observedDate: new Date().toISOString().slice(0, 10),
  });
  await saveRecord(f.headers, "relationships", {
    kind: "works_at",
    personId: bob.id,
    companyId: f.companyId,
    state: "current",
    evidenceId: source.id,
  });
  const run = await startGenerationRun(f.headers, {
    needId: f.needId,
    companyIds: [f.companyId],
    idempotencyKey: randomUUID(),
  });
  const id = run.results[0].opportunityId!;
  const { getOpportunityDetail, editOpportunity } =
    await import("../../src/modules/opportunities/service");
  const { companyPaths } = await import("../../src/modules/network/service");
  const { reviewOpportunity, startPursuing } =
    await import("../../src/modules/opportunities/review");
  const d = await getOpportunityDetail(f.headers, id);
  const path = companyPaths(d.data, f.companyId).current.find(
    (p) => p.id !== d.latest.brief.path?.id,
  )!;
  expect(path).toBeDefined();
  const targetId = path.nodes.at(-2)!.id;
  const targetName = d.data.people.find((p) => p.id === targetId)!.name;
  await reviewOpportunity(f.headers, id, {
    fitReviewed: true,
    askReviewed: true,
    targetReviewed: true,
    nextActionReviewed: true,
    fitValue: 2,
    fitRationale:
      "Supplied equipment supports the proposed machining discussion.",
    fitEvidenceIds: [f.sourceId],
    fitSource: "",
    ask: "Machine ten defined fixtures from supplied drawings.",
    contactRole: "Engineer; verify suitable manager access",
    targetPersonId: targetId,
    nextAction: "Ask the recorded advisor about this specific introduction.",
    approachMode: "introduction",
    pathId: path.id,
  });
  await startPursuing(f.headers, id);
  await login(page);
  await page.goto(`/opportunities/${id}`);
  await page.reload();
  const plan = page.getByRole("region", { name: "Saved reviewed action plan" });
  await expect(
    plan.getByText(`${targetName} · Engineer; verify suitable manager access`, {
      exact: true,
    }),
  ).toBeVisible();
  await plan
    .getByText("Inspect reviewed route, evidence and willingness", {
      exact: true,
    })
    .click();
  await expect(
    plan.locator("ol.text-path strong").filter({ hasText: targetName }),
  ).toBeVisible();
  await expect(plan.getByText(/This saved plan matches/)).toBeVisible();
  await plan
    .locator("summary")
    .filter({ hasText: "View connection evidence" })
    .last()
    .press("Enter");
  await expect(plan.getByText(/I (currently )?work/)).toBeVisible();
  await plan.screenshot({ path: "/private/tmp/pi-t05-reviewed-route.png" });
  await editOpportunity(f.headers, id, {
    ownerId: null,
    ask: "Machine twenty revised fixtures from updated drawings.",
    valueExchange: "Workshop collaboration",
    contactRole: "Operations lead",
    nextAction: "Review revised scope",
    approach: "Revised discussion",
  });
  await page.reload();
  await expect(
    plan.getByRole("heading", {
      name: "Previous reviewed action plan",
      exact: true,
    }),
  ).toBeVisible();
  await expect(plan.getByText(/This plan is historical/)).toBeVisible();
});
