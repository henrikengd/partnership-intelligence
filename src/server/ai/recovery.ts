import { eq } from "drizzle-orm";
import { db, aiRun } from "../db";
/** Startup only, before accepting requests. Never recover from an ordinary request. */
export async function recoverInterruptedAiRuns() {
  return db
    .update(aiRun)
    .set({
      status: "interrupted",
      errorCategory: "PROCESS_RESTART",
      finishedAt: new Date(),
    })
    .where(eq(aiRun.status, "running"))
    .returning({ id: aiRun.id });
}
