import { test, expect } from "./fixtures";
import { resetTestDatabase } from "../helpers/database";
import { savedWorkflow } from "../helpers/workflow";
import { generateOpportunity } from "../../src/modules/opportunities/service";
import {
  previewAiContext,
  startAiRun,
  retryAiRun,
  saveAiSettings,
} from "../../src/server/ai/service";
import { saveRecord } from "../../src/modules/records/service";
import { AiError, type Provider } from "../../src/server/ai/contracts";
import type { Page } from "@playwright/test";
let f: Awaited<ReturnType<typeof savedWorkflow>> & { opportunityId: string };
test.beforeEach(async () => {
  await resetTestDatabase();
  const context = await savedWorkflow();
  const opportunity = await generateOpportunity(context.headers, {
    needId: context.needId,
    companyId: context.companyId,
    partnershipType: "in_kind",
  });
  f = { ...context, opportunityId: opportunity.id };
});
async function login(page: Page, admin = false) {
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(admin ? "admin@example.test" : "editor@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
}
const detailUrl = () =>
  process.env.AI_TEST_PAGE
    ? `${process.env.AI_TEST_PAGE}?id=${f.opportunityId}`
    : `/opportunities/${f.opportunityId}`;
const settingsUrl = () =>
  process.env.AI_TEST_PAGE
    ? `${process.env.AI_TEST_PAGE}?id=${f.opportunityId}`
    : "/settings";
const panel = (page: Page) =>
  page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "AI draft assistance",
      exact: true,
    }),
  });
const settings = (page: Page) =>
  page.locator("section").filter({
    has: page.getByRole("heading", { name: "AI assistance", exact: true }),
  });
test("reviews minimized editable context with AI disabled and no key at 390px", async ({
  page,
}) => {
  await saveRecord(f.headers, "evidence", {
    id: f.sourceId,
    claim: "John Smith reports CNC capacity",
    sourceType: "observation",
    attribution: "Fictional supplied conversation",
    excerpt: "John Smith and 王伟 discuss fictional CNC capacity.",
    observedDate: new Date().toISOString().slice(0, 10),
  });
  await login(page);
  await page.goto(detailUrl());
  const p = panel(page);
  await p.getByLabel("Optional contact role to consider").fill("grant officer");
  await p
    .getByRole("button", { name: "Review AI context", exact: true })
    .click();
  const packet = p.getByLabel("Outbound JSON packet", { exact: true });
  await expect(packet).toBeVisible();
  expect(await packet.inputValue()).not.toMatch(
    /Anna|Example|example.test|personId|John Smith|王伟/,
  );
  expect(await packet.inputValue()).toContain("grant officer");
  await expect(
    p.getByRole("complementary", { name: "Local AI reference legend" }),
  ).toContainText("P1: Anna Example");
  await p
    .getByText("Review local need and source text", { exact: true })
    .click();
  await expect(
    p.getByRole("complementary", { name: "Local AI reference legend" }),
  ).toContainText("John Smith and 王伟");
  const approved = p.getByRole("checkbox", {
    name: "I reviewed this edited packet and approve sending it to OpenAI.",
    exact: true,
  });
  await approved.focus();
  await page.keyboard.press("Space");
  await expect(approved).toBeChecked();
  await expect(
    p.getByRole("button", { name: "Generate separate AI draft", exact: true }),
  ).toBeDisabled();
  const edited = JSON.parse(await packet.inputValue());
  edited.userInstructions =
    "Shorten the message after checking supplied sources.";
  await packet.fill(JSON.stringify(edited, null, 2));
  await expect(approved).not.toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await p.screenshot({ path: "/private/tmp/pi-t07-context-390.png" });
});
test("shows a fake refused run, requires a fresh retry preview and displays a locally resolved fake draft", async ({
  page,
}) => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "fictional-provider-test-only";
  try {
    await saveAiSettings(f.adminHeaders, {
      enabled: true,
      model: "fictional-configured-model",
    });
    const preview = await previewAiContext(f.headers, f.opportunityId);
    const request = {
      opportunityId: f.opportunityId,
      packet: preview.packet,
      previewRevision: preview.previewRevision,
      idempotencyKey: crypto.randomUUID(),
    };
    const failed = await startAiRun(f.headers, request, {
      provider: async () => {
        throw new AiError("REFUSED");
      },
    });
    await login(page);
    await page.goto(detailUrl());
    const p = panel(page);
    await expect(
      p.getByRole("heading", { name: "AI request: failed", exact: true }),
    ).toBeVisible();
    await expect(
      p.getByText(/REFUSED. No manual brief or assessment changed/),
    ).toBeVisible();
    await p
      .getByRole("button", {
        name: "Review context for one retry",
        exact: true,
      })
      .click();
    await expect(
      p.getByLabel("Outbound JSON packet", { exact: true }),
    ).toBeVisible();
    await expect(p.getByRole("checkbox")).not.toBeChecked();
    await expect(
      p.getByRole("button", { name: "Send one explicit retry", exact: true }),
    ).toBeDisabled();
    const next = await previewAiContext(f.headers, f.opportunityId);
    const provider: Provider = async (packet) => ({
      whyFit: [
        {
          text: "Supplied CNC capability suggests a fit, pending review.",
          evidenceRefs: [packet.evidence[0].ref],
        },
      ],
      ask: "Machine ten fictional fixtures from supplied drawings.",
      valueExchange: "Workshop collaboration.",
      contact: {
        personRef: packet.routes[0].people.at(-1),
        role: "Partnership manager",
      },
      routeRef: packet.routes[0].ref,
      nextAction: "Verify willingness with [person].",
      approach: "Request a short technical discussion.",
      outreachText: "Could we discuss a defined machining batch?",
      missingInformation: ["Capacity remains unknown."],
      cautions: ["All inferences need human review."],
    });
    expect(
      (
        await retryAiRun(
          f.headers,
          failed.id,
          {
            opportunityId: f.opportunityId,
            packet: {
              ...next.packet,
              userInstructions: "Newly reviewed short proposal",
            },
            previewRevision: next.previewRevision,
            idempotencyKey: crypto.randomUUID(),
          },
          { provider },
        )
      ).status,
    ).toBe("completed");
    await p
      .getByRole("button", { name: "Refresh AI runs", exact: true })
      .click();
    await expect(
      p.getByRole("heading", { name: "AI request: completed", exact: true }),
    ).toBeVisible();
    await expect(p.getByText(/Proposed contact: Anna Example/)).toBeVisible();
    await expect(
      p.getByText(
        /Proposed recorded route: Riverbend Community Workshop → Anna Example → Cedar Manufacturing/,
      ),
    ).toBeVisible();
    await expect(p.getByText("Attempt 2 of 2", { exact: true })).toBeVisible();
    await expect(
      p.getByRole("button", {
        name: "Review context for one retry",
        exact: true,
      }),
    ).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.reload();
    await expect(
      p.getByRole("heading", { name: "AI request: completed", exact: true }),
    ).toBeVisible();
    await p.screenshot({
      path: "/private/tmp/pi-t07-result-390.png",
      style: "nextjs-portal { visibility: hidden; }",
    });
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});
test("admin persists model settings while editors cannot configure credentials", async ({
  page,
}) => {
  await login(page, true);
  await page.goto(settingsUrl());
  const s = settings(page);
  await expect(s.getByText(/Server credential missing/)).toBeVisible();
  await s
    .getByLabel("Provider model", { exact: true })
    .fill("configured-model-test");
  await s
    .getByRole("button", { name: "Save AI settings", exact: true })
    .click();
  await expect(s.getByRole("status")).toHaveText("AI settings saved.");
  await s
    .getByRole("checkbox", { name: "Enable OpenAI assistance", exact: true })
    .check();
  await s
    .getByRole("button", { name: "Save AI settings", exact: true })
    .click();
  await expect(s.getByRole("status")).toContainText(
    "server-side OPENAI_API_KEY",
  );
  await page.reload();
  await expect(s.getByLabel("Provider model", { exact: true })).toHaveValue(
    "configured-model-test",
  );
  await expect(
    s.getByRole("checkbox", { name: "Enable OpenAI assistance", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page);
  await page.goto(settingsUrl());
  await expect(s.getByLabel("Provider model", { exact: true })).toBeDisabled();
  await expect(
    s.getByText("Only administrators can change AI settings.", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await s.screenshot({ path: "/private/tmp/pi-t07-settings-390.png" });
});

test("reuses an accepted action key after lost transport and rotates it for a fresh edited preview", async ({
  page,
}) => {
  await login(page);
  await page.route("**/api/ai/preview?*", async (route) => {
    const response = await route.fetch();
    const value = await response.json();
    // Test-only UI configuration; no request reaches the live provider.
    value.settings.enabled = true;
    value.settings.credentialConfigured = true;
    await route.fulfill({ response, json: value });
  });
  const keys: string[] = [];
  await page.route("**/api/ai/runs", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    keys.push(route.request().postDataJSON().idempotencyKey);
    if (keys.length === 1) return route.abort("failed");
    await route.fulfill({
      json: { id: "fictional-ui-replay", status: "completed" },
    });
  });
  await page.goto(detailUrl());
  const p = panel(page);
  const approved = p.getByRole("checkbox", {
    name: "I reviewed this edited packet and approve sending it to OpenAI.",
    exact: true,
  });
  const send = p.getByRole("button", {
    name: "Generate separate AI draft",
    exact: true,
  });
  await p
    .getByRole("button", { name: "Review AI context", exact: true })
    .click();
  await approved.check();
  await send.click();
  await expect(p.getByRole("alert")).toBeVisible();
  await approved.check();
  await send.click();
  await expect(
    p.getByLabel("Outbound JSON packet", { exact: true }),
  ).toHaveCount(0);
  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
  await p
    .getByRole("button", { name: "Review AI context", exact: true })
    .click();
  const packet = p.getByLabel("Outbound JSON packet", { exact: true });
  const changed = JSON.parse(await packet.inputValue());
  changed.userInstructions = "An explicitly revised packet.";
  await packet.fill(JSON.stringify(changed));
  await approved.check();
  await send.click();
  await expect(packet).toHaveCount(0);
  expect(keys).toHaveLength(3);
  expect(keys[2]).not.toBe(keys[0]);
});

test("late initial settings load cannot replace an edited and saved model", async ({
  page,
}) => {
  // Delay the first StrictMode mount's response even if transport cancellation is ignored.
  await page.addInitScript(() => {
    const original = window.fetch.bind(window);
    let first = true;
    const state = window as unknown as {
      releaseInitialSettings?: () => void;
      initialSettingsReleased?: boolean;
    };
    window.fetch = async (input, init) => {
      if (
        String(input) === "/api/ai/settings" &&
        (!init?.method || init.method === "GET") &&
        first
      ) {
        first = false;
        const response = await original(input, { ...init, signal: undefined });
        await new Promise<void>((resolve) => {
          state.releaseInitialSettings = () => {
            state.initialSettingsReleased = true;
            resolve();
          };
        });
        return response;
      }
      return original(input, init);
    };
  });
  await login(page, true);
  await page.goto(settingsUrl());
  const s = settings(page);
  await expect(s.getByLabel("Provider model", { exact: true })).toBeVisible();
  await s
    .getByLabel("Provider model", { exact: true })
    .fill("saved-after-delayed-initial-load");
  await s
    .getByRole("button", { name: "Save AI settings", exact: true })
    .click();
  await expect(s.getByRole("status")).toHaveText("AI settings saved.");
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { releaseInitialSettings?: unknown })
        .releaseInitialSettings === "function",
  );
  await page.evaluate(() =>
    (
      window as unknown as { releaseInitialSettings: () => void }
    ).releaseInitialSettings(),
  );
  await expect(s.getByLabel("Provider model", { exact: true })).toHaveValue(
    "saved-after-delayed-initial-load",
  );
  await page.reload();
  await expect(s.getByLabel("Provider model", { exact: true })).toHaveValue(
    "saved-after-delayed-initial-load",
  );
});
