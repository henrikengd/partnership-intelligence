import { beforeEach, afterAll, it, expect } from "vitest";
import { resetTestDatabase } from "../helpers/database";
import { editorContext } from "../helpers/workflow";
import { buildRiverbend } from "../../src/modules/demo/dataset";
import { getWorkspaceData } from "../../src/modules/records/service";
import { getOpportunityDetail } from "../../src/modules/opportunities/service";
import { getDueActions } from "../../src/modules/outreach/service";
import { companyPaths } from "../../src/modules/network/service";
import { pool } from "../../src/server/db";
import {
  assertDemoEnvironment,
  withDemoGuard,
} from "../../src/modules/demo/guard";
import { Pool } from "pg";
import { provisionDemoTestDatabase } from "../helpers/provision-demo";
import { spawn, spawnSync } from "node:child_process";
beforeEach(resetTestDatabase);
afterAll(() => pool.end());
it("builds exactly the specified fictional demo and preserves warm/cold/history/evidence/action distinctions", async () => {
  const f = await editorContext();
  const result = await buildRiverbend(f.adminHeaders);
  const data = await getWorkspaceData(f.adminHeaders);
  expect([
    data.people.length,
    data.companies.length,
    data.needs.length,
    data.partnerships.length,
    data.opportunities.length,
  ]).toEqual([12, 6, 4, 3, 8]);
  expect(data.needs.map((n) => n.category).sort()).toEqual([
    "cash",
    "expertise",
    "logistics",
    "manufacturing",
  ]);
  expect(data.people.every((p) => p.name.endsWith(" Example"))).toBe(true);
  expect(companyPaths(data, result.companies[0]).current).toHaveLength(2);
  const forge = companyPaths(data, result.companies[1]);
  expect(forge.current).toHaveLength(0);
  expect(forge.historical.length).toBeGreaterThan(0);
  expect(companyPaths(data, result.companies[4]).current[0].willingness).toBe(
    "no",
  );
  const cold = await getOpportunityDetail(
    f.adminHeaders,
    result.opportunities[5],
  );
  expect(cold.reviews[0].approachMode).toBe("cold");
  expect(cold.record.state).toBe("pursuing");
  const conflict = await getOpportunityDetail(
    f.adminHeaders,
    result.opportunities[1],
  );
  expect(conflict.latest.factors.evidence.value).toBe(0);
  expect(conflict.brief.claims.some((c) => c.status === "disputed")).toBe(true);
  expect(
    (await getOpportunityDetail(f.adminHeaders, result.opportunities[4])).latest
      .factors.fit.value,
  ).toBeNull();
  expect(
    data.opportunities.find((o) => o.id === result.opportunities[3])
      ?.previousOpportunityId,
  ).toBe(result.opportunities[7]);
  expect(
    data.opportunities.find((o) => o.id === result.opportunities[6])?.state,
  ).toBe("agreed");
  expect(
    (await getDueActions(f.adminHeaders)).actions.some((a) => a.overdue),
  ).toBe(true);
});
it("refuses live environments before a connection is opened", () => {
  expect(() =>
    assertDemoEnvironment({ ...process.env, APPLICATION_MODE: "live" }),
  ).toThrow(/Live installations/);
  expect(() =>
    assertDemoEnvironment({
      ...process.env,
      APPLICATION_MODE: "demo",
      DEMO_DATABASE_URL: process.env.DATABASE_URL,
    }),
  ).toThrow(/dedicated pi_demo/);
});
it("actual CLI resets only its provisioned demo, rejects existing/live/private/unmarked installs, and leaves rejected data unchanged", async () => {
  const url = await provisionDemoTestDatabase();
  const env = {
    ...process.env,
    APPLICATION_MODE: "demo",
    DATABASE_URL: url,
    DEMO_DATABASE_URL: url,
    DEMO_ADMIN_PASSWORD: "Fictional-demo-password-123",
    OPENAI_API_KEY: "",
  };
  const run = (action: string, ...args: string[]) =>
    spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/demo.ts", action, ...args],
      { env, encoding: "utf8", timeout: 20000 },
    );
  const inspect = async (fn: (p: Pool) => Promise<void>) => {
    const p = new Pool({ connectionString: url, max: 1 });
    try {
      await fn(p);
    } finally {
      await p.end();
    }
  };
  expect([0, 1]).toContain(run("seed").status);
  expect(run("reset", "--confirm-demo-reset").status).toBe(0);
  const connected = new Pool({ connectionString: url, max: 1 });
  await connected.query("SELECT 1");
  expect(run("reset", "--confirm-demo-reset").status).toBe(1);
  await connected.end();
  await inspect(async (p) => {
    await p.query("UPDATE demo_installation SET state='seeding'");
    await p.query("DELETE FROM person WHERE name='Omar Example'");
  });
  expect(run("reset", "--confirm-demo-reset").status).toBe(0);
  // Clear only this explicitly provisioned fictional database to test two initial seeds.
  await inspect(async (p) => {
    await p.query(
      "TRUNCATE auth_account,auth_session,invitation,auth_verification,auth_rate_limit,organization,auth_user,demo_installation CASCADE",
    );
  });
  const concurrent = () =>
    new Promise<number | null>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ["--import", "tsx", "scripts/demo.ts", "seed"],
        { env, stdio: "ignore" },
      );
      child.on("error", reject);
      child.on("exit", resolve);
    });
  expect((await Promise.all([concurrent(), concurrent()])).sort()).toEqual([
    0, 1,
  ]);
  expect(run("seed").status).toBe(1);
  expect(run("reset").status).toBe(1);
  const live = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/demo.ts", "reset", "--confirm-demo-reset"],
    { env: { ...env, APPLICATION_MODE: "live" }, encoding: "utf8" },
  );
  expect(live.status).toBe(1);
  await inspect(async (p) => {
    expect(
      (await p.query("SELECT count(*)::int AS n FROM person")).rows[0].n,
    ).toBe(12);
    await p.query(
      "UPDATE organization SET name='Fictional private installation'",
    );
  });
  const privateResult = run("reset", "--confirm-demo-reset");
  expect(privateResult.status).toBe(1);
  expect(privateResult.stderr).toContain("Reset refused");
  await inspect(async (p) => {
    expect(
      (await p.query("SELECT count(*)::int AS n FROM person")).rows[0].n,
    ).toBe(12);
    await p.query(
      "UPDATE organization SET name='Riverbend Community Workshop'",
    );
    await p.query(
      "UPDATE demo_installation SET dataset_version='unrecognized-private-marker'",
    );
  });
  expect(run("reset", "--confirm-demo-reset").status).toBe(1);
  await inspect(async (p) => {
    expect(
      (await p.query("SELECT count(*)::int AS n FROM opportunity")).rows[0].n,
    ).toBe(8);
    await p.query(
      "UPDATE demo_installation SET dataset_version='riverbend-v1'",
    );
  });
  expect(run("reset", "--confirm-demo-reset").status).toBe(0);
  await inspect(async (p) => {
    expect(
      (await p.query("SELECT count(*)::int AS n FROM partnership")).rows[0].n,
    ).toBe(3);
    expect(
      (await p.query("SELECT count(*)::int AS n FROM ai_run")).rows[0].n,
    ).toBe(0);
  });
}, 60000);

it("rejects an in-process environment switch when the existing write pool points at the private test installation", async () => {
  const f = await editorContext();
  const before = await getWorkspaceData(f.adminHeaders);
  const original = { ...process.env };
  let mutated = false;
  try {
    const url = process.env.DEMO_TEST_DATABASE_URL!;
    process.env.APPLICATION_MODE = "demo";
    process.env.DATABASE_URL = url;
    process.env.DEMO_DATABASE_URL = url;
    process.env.OPENAI_API_KEY = "";
    await expect(
      withDemoGuard("reset", true, async () => {
        mutated = true;
      }),
    ).rejects.toThrow(/write pool/);
  } finally {
    process.env = original;
  }
  expect(mutated).toBe(false);
  expect((await getWorkspaceData(f.adminHeaders)).organization.id).toBe(
    before.organization.id,
  );
});
