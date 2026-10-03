import { db, pool, demoInstallation } from "../../server/db";
import { eq, sql } from "drizzle-orm";
import { bootstrapAdmin } from "../../server/auth/service";
import { getAuth } from "../../server/auth/auth";
import { readConfig } from "../../server/config";
import { z } from "zod";
import { withDemoGuard } from "./guard";
import { buildRiverbend, DEMO_VERSION } from "./dataset";
export async function seedDemo(action: "seed" | "reset", confirmed = false) {
  const password = z
    .string()
    .min(12)
    .max(128)
    .parse(process.env.DEMO_ADMIN_PASSWORD);
  const config = readConfig();
  return withDemoGuard(action, confirmed, async () => {
    if (action === "reset")
      await db.transaction(async (tx) => {
        // Only after independent identity/sentinel gates; one atomic reset, never a live command.
        await tx.execute(
          sql`TRUNCATE auth_account, auth_session, invitation, auth_verification, auth_rate_limit, organization, auth_user, demo_installation CASCADE`,
        );
      });
    await db
      .insert(demoInstallation)
      .values({ id: 1, datasetVersion: DEMO_VERSION, state: "seeding" });
    await bootstrapAdmin({
      name: "Fictional demo administrator",
      email: "demo-admin@riverbend.example.test",
      password,
      secret: config.BOOTSTRAP_SECRET,
    });
    const response = await getAuth().handler(
      new Request(`${config.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: config.BETTER_AUTH_URL,
          "x-forwarded-for": "127.0.0.1",
        },
        body: JSON.stringify({
          email: "demo-admin@riverbend.example.test",
          password,
        }),
      }),
    );
    if (response.status !== 200)
      throw new Error(
        "Fictional administrator login failed. Guarded reset can recover a partial seed.",
      );
    const headers = new Headers({
      cookie: response.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; "),
      Origin: config.BETTER_AUTH_URL,
    });
    const data = await buildRiverbend(headers);
    await db
      .update(demoInstallation)
      .set({ organizationId: data.organizationId, state: "ready" })
      .where(eq(demoInstallation.id, 1));
    return {
      organization: "Riverbend Community Workshop",
      people: data.people.length,
      companies: data.companies.length,
      needs: data.needs.length,
      opportunities: data.opportunities.length,
    };
  });
}
export async function getDemoStatus() {
  if (readConfig().APPLICATION_MODE !== "demo") return false;
  const marker = await db.query.demoInstallation.findFirst();
  return marker?.datasetVersion === DEMO_VERSION && marker.state === "ready";
}
export { pool };
