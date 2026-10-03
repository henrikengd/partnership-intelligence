import { test as base, expect } from "@playwright/test";
import { pool } from "../../src/server/db";
export const test = base.extend<object, { databaseCleanup: void }>({
  databaseCleanup: [
    async ({ browser }, use) => {
      void browser;
      await use();
      await pool.end();
    },
    { scope: "worker", auto: true },
  ],
});
export { expect };

// Keep fictional browser captures in Playwright's ignored, per-test output.
export function screenshotPath(name: string): string {
  return test.info().outputPath(name);
}
