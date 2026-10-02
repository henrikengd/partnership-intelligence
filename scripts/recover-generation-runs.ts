import "dotenv/config";
import { recoverInterruptedGenerationRuns } from "../src/modules/opportunities/recovery";
import { pool } from "../src/server/db";
try {
  const interrupted = await recoverInterruptedGenerationRuns();
  console.log(
    `Startup recovery marked ${interrupted.length} abandoned generation runs interrupted.`,
  );
} finally {
  await pool.end();
}
