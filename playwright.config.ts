import "dotenv/config";
import { defineConfig } from "@playwright/test";
const port = process.env.E2E_PORT ?? "3101";
process.env.BETTER_AUTH_URL = `http://localhost:${port}`;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  globalSetup: "./tests/e2e/setup.ts",
  use: {
    baseURL: `http://localhost:${port}`,
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `http://localhost:${port}/login`,
    reuseExistingServer: false,
    timeout: 120000,
    env: { BETTER_AUTH_URL: `http://localhost:${port}` },
  },
});
