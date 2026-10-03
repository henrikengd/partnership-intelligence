import "dotenv/config";
import { recoverInterruptedGenerationRuns } from "../src/modules/opportunities/recovery";
import { recoverInterruptedAiRuns } from "../src/server/ai/recovery";
import { pool } from "../src/server/db";
try {
  const interrupted = await recoverInterruptedGenerationRuns();
  const aiInterrupted = await recoverInterruptedAiRuns();
  console.log(
    `Startup recovery marked ${interrupted.length} abandoned generation runs interrupted.`,
  );
  console.log(
    `Startup recovery marked ${aiInterrupted.length} abandoned AI runs interrupted.`,
  );
} finally {
  await pool.end();
}
