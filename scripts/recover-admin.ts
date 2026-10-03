import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { db, user, account, session, pool } from "../src/server/db";
import { credentialsSchema } from "../src/server/auth/service";
const email = process.env.RECOVERY_EMAIL?.trim().toLowerCase();
const password = process.env.RECOVERY_PASSWORD;
try {
  if (!email || !password)
    throw new Error(
      "Set RECOVERY_EMAIL and RECOVERY_PASSWORD through private operator environment variables.",
    );
  credentialsSchema.parse({ name: "Operator recovery", email, password });
  const hash = await hashPassword(password);
  await db.transaction(async (tx) => {
    const [admin] = await tx
      .select()
      .from(user)
      .where(and(eq(user.email, email), eq(user.role, "admin")))
      .for("update");
    if (!admin) throw new Error("Existing administrator not found.");
    await tx
      .update(account)
      .set({ password: hash, updatedAt: new Date() })
      .where(
        and(eq(account.userId, admin.id), eq(account.providerId, "credential")),
      );
    await tx
      .update(user)
      .set({ active: true, updatedAt: new Date() })
      .where(eq(user.id, admin.id));
    await tx.delete(session).where(eq(session.userId, admin.id));
  });
  console.log("Administrator password replaced; prior sessions revoked.");
} finally {
  await pool.end();
}
