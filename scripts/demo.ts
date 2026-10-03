import "dotenv/config";
import { seedDemo, pool } from "../src/modules/demo/service";
process.env.PGAPPNAME = "partnership-demo-operator";
try {
  const action = process.argv[2];
  if (action !== "seed" && action !== "reset")
    throw new Error("Use demo:seed or demo:reset -- --confirm-demo-reset.");
  const result = await seedDemo(
    action,
    process.argv.includes("--confirm-demo-reset"),
  );
  console.log(
    `Fictional demo ready: ${result.people} people, ${result.companies} companies, ${result.needs} needs, ${result.opportunities} opportunities. Sign in as demo-admin@riverbend.example.test using your configured DEMO_ADMIN_PASSWORD. AI is disabled.`,
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Demo operation failed.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
