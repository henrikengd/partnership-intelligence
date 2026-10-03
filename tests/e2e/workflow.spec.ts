import { test, expect, screenshotPath } from "./fixtures";
import { generateOpportunity } from "../../src/modules/opportunities/service";
import { resetTestDatabase } from "../helpers/database";
import { editorContext, savedWorkflow } from "../helpers/workflow";
test.beforeEach(async () => {
  await resetTestDatabase();
  await editorContext();
});
test("invited editor enters a machining opportunity and records a completed introduction action", async ({
  page,
  baseURL,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("editor@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.getByRole("link", { name: "Needs", exact: true }).click();
  await page.getByLabel("Need title", { exact: true }).fill("CNC machining");
  await page
    .getByLabel("Need description")
    .fill("Machine ten workshop fixtures from supplied drawings.");
  await page.getByLabel("Need category").fill("manufacturing");
  await page.getByLabel("Urgency", { exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Save need", exact: true }).click();
  await expect(page.getByText("Need saved.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Companies", exact: true }).click();
  await page.getByLabel("Company name").fill("Cedar Manufacturing");
  await page
    .getByLabel("Company description")
    .fill("Fictional machining workshop.");
  await page.getByLabel("Company website").fill("https://cedar.example.test");
  await page.getByRole("button", { name: "Save company", exact: true }).click();
  await expect(page.getByText("Company saved.", { exact: true })).toBeVisible();
  const today = new Date().toISOString().slice(0, 10);
  await page
    .getByLabel("Evidence claim")
    .fill("Cedar lists CNC machining equipment");
  await page
    .getByLabel("Source URL", { exact: true })
    .fill("https://cedar.example.test/capabilities");
  await page
    .getByLabel("Supplied excerpt or observation")
    .fill("Our fictional workshop operates CNC mills.");
  await page.getByLabel("Observation date", { exact: true }).fill(today);
  await page
    .getByRole("button", { name: "Save evidence", exact: true })
    .click();
  await expect(
    page.getByText("Evidence saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Capability company")
    .selectOption({ label: "Cedar Manufacturing" });
  await page.getByLabel("Capability category").fill("manufacturing");
  await page
    .getByLabel("Capability description")
    .fill("CNC machining for workshop fixtures");
  await page
    .getByLabel("Capability evidence")
    .selectOption({ label: "Cedar lists CNC machining equipment (supplied)" });
  await page
    .getByRole("button", { name: "Save capability", exact: true })
    .click();
  await expect(
    page.getByText("Capability saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Evidence claim")
    .fill("Anna reports current employment at Cedar");
  await page
    .getByLabel("Source type", { exact: true })
    .selectOption("observation");
  await page
    .getByLabel("Observation source", { exact: true })
    .fill("Anna Example, fictional observation");
  await page
    .getByLabel("Supplied excerpt or observation")
    .fill("I currently work as an engineer at Cedar.");
  await page.getByLabel("Observation date", { exact: true }).fill(today);
  await page
    .getByRole("button", { name: "Save evidence", exact: true })
    .click();
  await expect(
    page.getByText("Anna reports current employment at Cedar", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Network", exact: true }).click();
  await page.getByLabel("Person name").fill("Anna Example");
  await page.getByLabel("Alumni", { exact: true }).check();
  await page.getByLabel("Advisor", { exact: true }).check();
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(page.getByText("Person saved.", { exact: true })).toBeVisible();
  await page
    .getByLabel("Relationship person")
    .selectOption({ label: "Anna Example" });
  await page
    .getByLabel("Relationship company")
    .selectOption({ label: "Cedar Manufacturing" });
  await page.getByLabel("Recorded job or contact title").fill("Engineer");
  await page.getByLabel("Relationship start").fill("2024-01-01");
  await page.getByLabel("Relationship evidence").selectOption({
    label: "Anna reports current employment at Cedar (supplied)",
  });
  await page
    .getByRole("button", { name: "Save relationship", exact: true })
    .click();
  await expect(
    page.getByText("Relationship saved.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Opportunities", exact: true }).click();
  await page
    .getByLabel("Relevant need")
    .selectOption({ label: "CNC machining" });
  await page
    .getByLabel("Candidate company")
    .selectOption({ label: "Cedar Manufacturing" });
  await page
    .getByRole("button", { name: "Generate deterministic brief" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Cedar Manufacturing", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Supplied claim, unreviewed", { exact: true }),
  ).toBeVisible();
  await page
    .getByText("Inspect assessment route snapshot", { exact: true })
    .click();
  await expect(
    page.getByText(/Introduction willingness: unknown/),
  ).toBeVisible();
  await expect(
    page.getByText(/No named manager or decision authority is established/),
  ).toBeVisible();
  await expect(page.getByText(/AI is disabled/)).toBeVisible();
  const id = page.url().split("/").pop()!;
  await page
    .getByText("Edit partnership brief and owner", { exact: true })
    .click();
  await page
    .getByLabel("Team owner")
    .selectOption({ label: "Fictional coordinator" });
  await page
    .getByLabel("What to ask for", { exact: true })
    .fill("Machine ten defined workshop fixtures from supplied drawings.");
  await page
    .getByRole("button", { name: "Save brief and owner", exact: true })
    .click();
  await expect(page.getByText(/Brief and owner saved/)).toBeVisible();
  await page
    .getByLabel("Recorded target person")
    .selectOption({ label: "Anna Example" });
  await page
    .getByLabel("Recorded action description")
    .fill("Ask Anna whether she is willing to introduce our workshop team.");
  await page
    .getByLabel("Next follow-up date", { exact: true })
    .fill("2026-01-01");
  await page
    .getByRole("button", { name: "Record planned action", exact: true })
    .click();
  await expect(
    page.getByText("Planned, not completed · introduction", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Completed action · introduction", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Mark action completed", exact: true })
    .click();
  await expect(
    page.getByText("Completed action · introduction", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Regenerate from recorded inputs",
      exact: true,
    })
    .click();
  await page.reload();
  await expect(page.getByLabel("What to ask for", { exact: true })).toHaveValue(
    "Machine ten defined workshop fixtures from supplied drawings.",
  );
  await expect(
    page.getByText("Completed action · introduction", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: screenshotPath("pi-t02-opportunity-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: screenshotPath("pi-t02-opportunity-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page.getByText("Overdue · 2026-01-01", { exact: true }),
  ).toBeVisible();
  const response = await page.request.get(`/api/opportunities/${id}`);
  expect(response.status()).toBe(200);
  const anonymous = await page.context().browser()!.newContext({ baseURL });
  expect(
    (await anonymous.request.get(`/api/opportunities/${id}`)).status(),
  ).toBe(401);
  expect((await anonymous.request.get("/api/records/needs")).status()).toBe(
    401,
  );
  expect(
    (
      await anonymous.request.post("/api/activities", {
        headers: { Origin: baseURL! },
        data: {},
      })
    ).status(),
  ).toBe(401);
  await anonymous.close();
});

test("readiness refresh updates brief and factor fields before an unrelated edit can overwrite them", async ({
  page,
  baseURL,
}) => {
  await resetTestDatabase();
  const f = await savedWorkflow();
  const opportunity = await generateOpportunity(f.headers, {
    needId: f.needId,
    companyId: f.companyId,
    partnershipType: "in_kind",
  });
  await page.context().addCookies(
    f.headers
      .get("cookie")!
      .split("; ")
      .map((cookie) => {
        const split = cookie.indexOf("=");
        return {
          name: cookie.slice(0, split),
          value: cookie.slice(split + 1),
          url: baseURL!,
        };
      }),
  );
  await page.goto(`/opportunities/${opportunity.id}`);
  await page
    .getByText("Edit partnership brief and owner", { exact: true })
    .click();
  await page
    .getByText("Inspect all score factors, evidence and editing controls", {
      exact: true,
    })
    .click();
  await page
    .getByText("Review factor values and save a new assessment", {
      exact: true,
    })
    .click();
  await expect(page.locator("#fit-value")).toHaveValue("2");
  await page.getByText("Review readiness and target", { exact: true }).click();
  await page.locator("#ready-fit-value").selectOption("4");
  await page
    .locator("#ready-fit-rationale")
    .fill("Reviewed drawings and capability support this precise batch.");
  await page.locator("#ready-fit-evidence").selectOption(f.sourceId);
  const ask = "Machine ten numbered fixtures from drawings before December.";
  await page.locator("#ready-ask").fill(ask);
  await page.locator("#ready-role").fill("Manufacturing manager");
  await page
    .locator("#ready-action")
    .fill("Request a scoped technical meeting about ten fixtures.");
  for (const name of [
    "fitReviewed",
    "askReviewed",
    "targetReviewed",
    "nextActionReviewed",
  ])
    await page.locator(`input[name=${name}]`).check();
  await page
    .getByRole("button", { name: "Save readiness review", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Reviewed action plan", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#brief-ask")).toHaveValue(ask);
  await expect(page.locator("#fit-value")).toHaveValue("4");
  await page.locator("#urgency-value").selectOption("3");
  await page.locator("#urgency-origin").selectOption("organization");
  await page.locator("#urgency-source").fill("Workshop calendar review");
  await page
    .locator("#urgency-rationale")
    .fill("The team has a near-term fixture assembly date.");
  await page
    .getByRole("button", { name: "Save reviewed assessment", exact: true })
    .click();
  await expect(
    page.getByText("Assessment version saved.", { exact: true }),
  ).toBeVisible();
  const reviewed = await (
    await page.request.get(`/api/opportunities/${opportunity.id}`)
  ).json();
  expect(reviewed.latest.factors.fit.value).toBe(4);
  await page.locator("#op-owner").selectOption(f.editor.id);
  await page
    .getByRole("button", { name: "Save brief and owner", exact: true })
    .click();
  await expect(
    page.getByText(
      "Brief and owner saved. Your edits are preserved during regeneration.",
      { exact: true },
    ),
  ).toBeVisible();
  const saved = await (
    await page.request.get(`/api/opportunities/${opportunity.id}`)
  ).json();
  expect(saved.record.manualBrief.ask).toBe(ask);
  expect(saved.record.ownerId).toBe(f.editor.id);
});
