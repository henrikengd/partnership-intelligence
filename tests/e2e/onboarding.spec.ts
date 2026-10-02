import { test, expect } from "./fixtures";
import { resetTestDatabase } from "../helpers/database";
import { editorContext } from "../helpers/workflow";
test.beforeEach(async () => {
  await resetTestDatabase();
  await editorContext();
});
test("resumes onboarding, skips optional personal network, maps CSV and generates without a path", async ({
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
  await page.goto("/onboarding");
  await page
    .getByRole("button", { name: "Save progress and continue" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Step 2: Needs", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Need title", { exact: true })
    .fill("Translation handouts");
  await page
    .getByLabel("Need description")
    .fill("Translate two fictional community workshop handouts.");
  await page.getByLabel("Need category").fill("translation");
  await page.getByRole("button", { name: "Save need", exact: true }).click();
  await expect(page.getByText("Need saved.", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Save progress and continue" })
    .click();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Step 3: People & companies",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Skip this optional step" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Step 4: Relationships & evidence",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/imports");
  await page.getByLabel("Import kind").selectOption("companies");
  await page.getByLabel("CSV file").setInputFiles({
    name: "fictional-companies.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "External ID,Company,Site\nc-language,Language Example,language.example.test\nc-invalid,,invalid.example.test\n",
    ),
  });
  await page.getByRole("button", { name: "Read columns", exact: true }).click();
  await page
    .getByLabel("Map source_id", { exact: true })
    .selectOption("External ID");
  await page.getByLabel("Map name", { exact: true }).selectOption("Company");
  await page.getByLabel("Map domain", { exact: true }).selectOption("Site");
  await page.getByRole("button", { name: "Validate and preview" }).click();
  await expect(
    page.getByRole("heading", { name: "CSV row 3", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/name: is required/)).toBeVisible();
  await page.getByLabel("Resolution for row 2").selectOption("create");
  await page.getByLabel("Resolution for row 3").selectOption("exclude");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: "/private/tmp/pi-t03-import-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/private/tmp/pi-t03-import-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Commit selected rows" }).click();
  await expect(page.getByRole("status")).toContainText(
    "1 created · 0 updated · 1 excluded",
  );
  await page.goto("/companies");
  const today = new Date().toISOString().slice(0, 10);
  await page
    .getByLabel("Evidence claim")
    .fill("Language Example supplies translation services");
  await page
    .getByLabel("Source URL", { exact: true })
    .fill("https://language.example.test/services");
  await page
    .getByLabel("Supplied excerpt or observation")
    .fill("Translation services for community groups.");
  await page.getByLabel("Observation date", { exact: true }).fill(today);
  await page
    .getByRole("button", { name: "Save evidence", exact: true })
    .click();
  await expect(
    page.getByText("Evidence saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Capability company")
    .selectOption({ label: "Language Example" });
  await page.getByLabel("Capability category").fill("translation");
  await page.getByLabel("Capability description").fill("Translation services");
  await page.getByLabel("Capability evidence").selectOption({
    label: "Language Example supplies translation services (supplied)",
  });
  await page
    .getByRole("button", { name: "Save capability", exact: true })
    .click();
  await expect(
    page.getByText("Capability saved.", { exact: true }),
  ).toBeVisible();
  await page.goto("/onboarding");
  await expect(
    page.getByRole("heading", {
      name: "Step 4: Relationships & evidence",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save progress and continue" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Step 5: Partnerships", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Skip this optional step" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Step 6: Previous outreach",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Skip this optional step" }).click();
  await expect(
    page.getByText(
      "No personal relationship path recorded. Company evidence can still support a brief.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save progress and continue" })
    .click();
  await expect(page.getByText(/No people recorded/)).toBeVisible();
  await page.screenshot({
    path: "/private/tmp/pi-t03-onboarding-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: "/private/tmp/pi-t03-onboarding-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: /Generate brief: Translation handouts/ })
    .click();
  await expect(page).toHaveURL(/opportunities\//);
  await expect(
    page.getByRole("heading", { name: "Language Example", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Verify the relevant contact role and choose a permitted cold approach/,
    ),
  ).toBeVisible();
  await page.goto("/partnerships");
  await page
    .getByLabel("Partner company", { exact: true })
    .selectOption({ label: "Language Example" });
  await page
    .getByLabel("Partnership title", { exact: true })
    .fill("Fictional translation support");
  await page
    .getByRole("button", { name: "Save partnership", exact: true })
    .click();
  await expect(
    page.getByText("Partnership saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Edit Fictional translation support",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Partnership state", { exact: true })
    .selectOption("ended");
  await page.getByLabel("Partnership end", { exact: true }).fill("2025-12-31");
  await page
    .getByRole("button", { name: "Update partnership", exact: true })
    .click();
  await expect(
    page.getByText("Partnership saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Previously contacted company")
    .selectOption({ label: "Language Example" });
  await page
    .getByLabel("Previous contact role", { exact: true })
    .fill("Community partnership lead");
  await page
    .getByLabel("Previous outreach date", { exact: true })
    .fill("2025-01-01");
  await page
    .getByLabel("Previous outreach description")
    .fill("Fictional inquiry about translating handouts.");
  await page
    .getByLabel("Previous outreach source", { exact: true })
    .fill("Fictional archived email");
  await page
    .getByRole("button", { name: "Save previous outreach", exact: true })
    .click();
  await expect(
    page.getByText("Previous outreach saved.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Companies", exact: true }).click();
  await page
    .getByRole("link", { name: "Language Example", exact: true })
    .click();
  await expect(
    page.getByText("Fictional translation support", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Source: Fictional archived email", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/No permitted current internal route/),
  ).toBeVisible();
  const anonymous = await page.context().browser()!.newContext({ baseURL });
  expect((await anonymous.request.get("/api/onboarding")).status()).toBe(401);
  expect(
    (
      await anonymous.request.post("/api/imports", {
        headers: { Origin: baseURL! },
      })
    ).status(),
  ).toBe(401);
  expect(
    (await anonymous.request.get("/api/records/partnerships")).status(),
  ).toBe(401);
  await anonymous.close();
});
