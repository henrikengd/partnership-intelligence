/** Operator-invoked fictional local release checks. This is not an E2E database-reset fixture. */
import { chromium, expect } from "@playwright/test";
import { chmodSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const action = process.argv[2];
const url = process.env.RELEASE_BASE_URL;
if (
  process.env.RELEASE_CHECK_CONFIRM !== "fictional-release-only" ||
  !url ||
  !/^http:\/\/localhost:(3110|3111|3115)$/.test(url)
)
  throw new Error(
    "Use only the explicitly confirmed isolated fictional release URL.",
  );
const password = process.env.RELEASE_ADMIN_PASSWORD;
if (!password)
  throw new Error(
    "Provide a private fictional release password through environment variables.",
  );
const browser = await chromium.launch();
const context = await browser.newContext({ baseURL: url });
const page = await context.newPage();
page.setDefaultTimeout(15000);
async function login(email = "release-admin@example.test") {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
}
async function nextStep(step: string) {
  await page
    .getByRole("button", { name: "Save progress and continue", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: step, exact: true }),
  ).toBeVisible();
}
async function fresh() {
  assert.equal(url, "http://localhost:3110");
  assert(process.env.BOOTSTRAP_SECRET);
  await page.goto("/setup");
  await page.getByLabel("Your name").fill("Release administrator");
  await page
    .getByLabel("Email", { exact: true })
    .fill("release-admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page
    .getByLabel("Installation setup secret")
    .fill(process.env.BOOTSTRAP_SECRET!);
  await page
    .getByRole("button", { name: "Create administrator", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await login();
  await page.goto("/onboarding");
  await page.getByLabel("Organization name").fill("Riverbend setup check");
  await page
    .getByLabel("Mission", { exact: true })
    .fill("Community skills workshops");
  await page.getByLabel("Time zone").fill("Europe/Oslo");
  await page
    .getByRole("button", { name: "Save organization", exact: true })
    .click();
  await expect(
    page.getByText("Organization profile saved.", { exact: true }),
  ).toBeVisible();
  await nextStep("Step 2: Needs");
  await page
    .getByLabel("Need title", { exact: true })
    .fill("Workshop fixtures");
  await page
    .getByLabel("Need description")
    .fill("Machine ten fixtures from supplied drawings");
  await page.getByLabel("Need category").fill("manufacturing");
  await page.getByLabel("Urgency", { exact: true }).selectOption("2");
  await page.getByLabel("Preferred partnership type").fill("in_kind");
  await page.getByRole("button", { name: "Save need", exact: true }).click();
  await expect(page.getByText("Need saved.", { exact: true })).toBeVisible();
  await nextStep("Step 3: People & companies");
  await page.getByLabel("Company name").fill("Cedar Example Manufacturing");
  await page.getByLabel("Company website").fill("https://cedar.example.test");
  await page.getByRole("button", { name: "Save company", exact: true }).click();
  await expect(page.getByText("Company saved.", { exact: true })).toBeVisible();
  await nextStep("Step 4: Relationships & evidence");
  await page
    .getByLabel("Evidence claim")
    .fill("Cedar reports CNC machining capacity");
  await page
    .getByLabel("Source URL", { exact: true })
    .fill("https://cedar.example.test/capabilities");
  await page
    .getByLabel("Supplied excerpt or observation")
    .fill("Our fictional workshop operates CNC mills");
  await page
    .getByLabel("Observation date", { exact: true })
    .fill(new Date().toISOString().slice(0, 10));
  await page
    .getByRole("button", { name: "Save evidence", exact: true })
    .click();
  await expect(
    page.getByText("Evidence saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Capability company")
    .selectOption({ label: "Cedar Example Manufacturing" });
  await page.getByLabel("Capability category").fill("manufacturing");
  await page
    .getByLabel("Capability description")
    .fill("Machining workshop fixtures");
  await page
    .getByLabel("Capability evidence")
    .selectOption({ label: "Cedar reports CNC machining capacity (supplied)" });
  await page
    .getByRole("button", { name: "Save capability", exact: true })
    .click();
  await expect(
    page.getByText("Capability saved.", { exact: true }),
  ).toBeVisible();
  await nextStep("Step 5: Partnerships");
  await page.getByRole("button", { name: "Skip this optional step" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Step 6: Previous outreach",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Skip this optional step" }).click();
  await expect(
    page.getByRole("heading", { name: "Step 7: Graph review", exact: true }),
  ).toBeVisible();
  await nextStep("Step 8: Readiness");
  await page
    .getByRole("button", { name: /Generate brief: Workshop fixtures/ })
    .click();
  await expect(page).toHaveURL(/opportunities\//);
  await expect(
    page.getByRole("heading", {
      name: "Cedar Example Manufacturing",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("body")).toContainText("supplied");
  await expect(page.locator("body")).toContainText(
    "No permitted introduction is established",
  );
  await finishFresh();
}
async function finishFresh() {
  await page
    .getByText("Edit partnership brief and owner", { exact: true })
    .click();
  await page
    .getByLabel("Team owner", { exact: true })
    .selectOption({ label: "Release administrator" });
  await page
    .getByLabel("What to ask for", { exact: true })
    .fill("Machine ten fictional fixtures from supplied CAD drawings.");
  await page
    .getByRole("button", { name: "Save brief and owner", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Brief and owner saved");
  const opPath = new URL(page.url()).pathname;
  await page.goto(opPath.replace("opportunities", "pipeline"));
  await page
    .getByLabel("Recorded target role", { exact: true })
    .fill("Manufacturing manager");
  await page
    .getByLabel("Recorded action description")
    .fill("Fictional initial capacity inquiry planned through the release UI.");
  await page
    .getByLabel("Next follow-up date", { exact: true })
    .fill("2020-02-01");
  await page
    .getByRole("button", { name: "Record planned action", exact: true })
    .click();
  await expect(page.locator("body")).toContainText("Planned, not completed");
  await page.goto("/onboarding");
  await nextStep("Step 9: Dashboard");
  await page
    .getByRole("button", { name: "Finish onboarding", exact: true })
    .click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByRole("heading", { name: "Riverbend setup check", exact: true }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await context.storageState({
    path: "/private/tmp/pi-release-browser-state.json",
  });
  chmodSync("/private/tmp/pi-release-browser-state.json", 0o600);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "/private/tmp/pi-t10-fresh-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/private/tmp/pi-t10-fresh-mobile.png",
    fullPage: true,
  });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  console.log(
    JSON.stringify({
      event: "fresh_browser_workflow_verified",
      bootstrap: "actual_UI",
      onboarding: "completed",
      firstOpportunity: "supplied_sources_cold_path",
      action: "planned_only",
    }),
  );
}
async function restored() {
  await login();
  await expect(
    page.getByRole("heading", { name: "Riverbend setup check", exact: true }),
  ).toBeVisible();
  await page.goto("/graph");
  await expect(page.locator("body")).toContainText("Anna Release Example");
  await expect(page.locator("body")).toContainText(
    "Cedar Example Manufacturing",
  );
  await page.goto("/opportunities");
  await page
    .getByRole("link", {
      name: /Cedar Example Manufacturing · Workshop fixtures/,
    })
    .click();
  await expect(page.locator(".priority")).toContainText("46.25");
  await expect(page.locator(".priority")).toContainText("55%");
  await expect(page.locator("body")).toContainText(
    "Release-edited collaboration value exchange",
  );
  await expect(page.locator("body")).toContainText("Anna Release Example");
  await page
    .getByText("Read immutable assessment versions", { exact: true })
    .click();
  await expect(page.locator("body")).toContainText("Version 1");
  await expect(page.locator("body")).toContainText("AI request: completed");
  await expect(page.locator("body")).toContainText(
    "Machine ten fictional fixtures",
  );
  const path = new URL(page.url()).pathname;
  await page.goto(path.replace("opportunities", "pipeline"));
  await expect(
    page.getByRole("heading", {
      name: "Cedar Example Manufacturing: actions and outcome",
      exact: true,
    }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).toContainText("Completed action");
  await expect(page.locator("body")).toContainText("2020-01-15");
  await expect(page.locator("body")).toContainText("2020-03-01");
  await expect(page.locator("body")).toContainText("agreed");
  await page.screenshot({
    path: "/private/tmp/pi-t10-restored-desktop.png",
    fullPage: true,
  });
  await page.goto("/companies");
  await page
    .getByRole("button", {
      name: "Edit Anna Release Example reports current Cedar employment",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Supplied excerpt or observation")).toHaveValue(
    /private-release-evidence-marker/,
  );
  console.log(
    JSON.stringify({
      event: "restored_browser_behavior_verified",
      auth: true,
      graph: true,
      priority: 46.25,
      coverage: 55,
      manualBrief: true,
      activities: true,
      outcome: true,
      privateHistory: true,
      aiHistory: "fake_only",
    }),
  );
}
async function recovery() {
  assert.equal(url, "http://localhost:3110");
  assert(process.env.RECOVERY_PASSWORD);
  const old = await browser.newContext({
    baseURL: url,
    storageState: "/private/tmp/pi-release-browser-state.json",
  });
  assert.equal((await old.request.get("/api/organization")).status(), 401);
  await old.close();
  const invalid = await context.request.post("/api/auth/sign-in/email", {
    headers: { origin: url! },
    data: { email: "release-admin@example.test", password },
  });
  assert.equal(invalid.status(), 401);
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill("release-admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.RECOVERY_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  console.log(
    JSON.stringify({
      event: "operator_recovery_verified",
      oldSessionRevoked: true,
      oldPasswordRejected: true,
      newPasswordAccepted: true,
    }),
  );
}
async function demo() {
  await login("demo-admin@riverbend.example.test");
  await expect(page.locator("body")).toContainText("Fictional demo");
  await expect(
    page.getByRole("heading", {
      name: "Riverbend Community Workshop",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/opportunities");
  await expect(
    page.getByRole("heading", {
      name: "Partnership opportunities",
      exact: true,
    }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await context.storageState({
    path: "/private/tmp/pi-release-demo-browser-state.json",
  });
  chmodSync("/private/tmp/pi-release-demo-browser-state.json", 0o600);
  await page.screenshot({
    path: "/private/tmp/pi-t10-demo-desktop.png",
    fullPage: true,
  });
  console.log(
    JSON.stringify({
      event: "isolated_demo_browser_verified",
      noAiKey: true,
      banner: true,
    }),
  );
}
try {
  await expect
    .poll(
      async () => {
        try {
          return (await context.request.get("/login")).status();
        } catch {
          return 0;
        }
      },
      { timeout: 30000 },
    )
    .toBe(200);
  if (action === "fresh") await fresh();
  else if (action === "finish-fresh") {
    await login();
    await page.goto("/opportunities");
    await page
      .getByRole("link", {
        name: /Cedar Example Manufacturing · Workshop fixtures/,
      })
      .click();
    await finishFresh();
  } else if (action === "restored") await restored();
  else if (action === "capture") {
    await login();
    await expect(
      page.getByRole("heading", { name: "Riverbend setup check", exact: true }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: "/private/tmp/pi-t10-fresh-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "/private/tmp/pi-t10-fresh-mobile.png",
      fullPage: true,
    });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    console.log(
      JSON.stringify({ event: "settled_release_screenshots_captured" }),
    );
  } else if (action === "recovery") await recovery();
  else if (action === "demo-old-session") {
    const old = await browser.newContext({
      baseURL: url,
      storageState: "/private/tmp/pi-release-demo-browser-state.json",
    });
    assert.equal((await old.request.get("/api/organization")).status(), 401);
    await old.close();
    console.log(JSON.stringify({ event: "demo_old_session_invalidated" }));
  } else if (action === "demo") await demo();
  else throw new Error("Use fresh, restored or demo.");
} catch (error) {
  writeFileSync("/private/tmp/pi-t10-browser-error.txt", String(error), {
    mode: 0o600,
  });
  await page
    .screenshot({
      path: "/private/tmp/pi-t10-browser-failure.png",
      fullPage: true,
    })
    .catch(() => {});
  console.error(
    JSON.stringify({ event: "release_browser_check_failed", action }),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
