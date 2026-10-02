import { test, expect } from "./fixtures";
import { resetTestDatabase } from "../helpers/database";
import { editorContext } from "../helpers/workflow";
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
  await page.getByLabel("Need category").selectOption("manufacturing");
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
  await page.getByLabel("Capability category").selectOption("manufacturing");
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
  await expect(
    page.getByText(/Introduction willingness: unknown/),
  ).toBeVisible();
  await expect(
    page.getByText(/No named manager or decision authority is established/),
  ).toBeVisible();
  await expect(page.getByText(/AI is disabled/)).toBeVisible();
  const id = page.url().split("/").pop()!;
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
    .getByLabel("Target person")
    .selectOption({ label: "Anna Example" });
  await page
    .getByLabel("Action description")
    .fill("Ask Anna whether she is willing to introduce our workshop team.");
  await page.getByLabel("Follow-up date", { exact: true }).fill("2026-01-01");
  await page.getByRole("button", { name: "Plan action", exact: true }).click();
  await expect(
    page.getByText("Planned, not completed", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Completed action", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Mark completed", exact: true })
    .click();
  await expect(
    page.getByText("Completed action", { exact: true }),
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
    page.getByText("Completed action", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: "/private/tmp/pi-t02-opportunity-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/private/tmp/pi-t02-opportunity-mobile.png",
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
