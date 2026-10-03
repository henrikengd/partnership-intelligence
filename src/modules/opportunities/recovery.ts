import { eq } from "drizzle-orm";
import { db, generationRun } from "../../server/db";
/** Operator startup only, before accepting requests. Never call this from a route handler. */
export async function recoverInterruptedGenerationRuns() {
  return db
    .update(generationRun)
    .set({
      status: "interrupted",
      errorCategory: "PROCESS_RESTART",
      finishedAt: new Date(),
    })
    .where(eq(generationRun.status, "running"))
    .returning({ id: generationRun.id });
}
