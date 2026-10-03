import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
export async function resetTestDatabase() {
  const url = process.env.TEST_DATABASE_URL;
  if (
    !url ||
    process.env.DATABASE_URL !== url ||
    !/^pi_(t01|ci|integration)$/.test(new URL(url).pathname.slice(1))
  )
    throw new Error(
      "Test reset requires matching DATABASE_URL and TEST_DATABASE_URL with an isolated pi_t01, pi_ci or pi_integration database.",
    );
  const pool = new Pool({ connectionString: url });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./db/migrations" });
    await pool.query(
      "TRUNCATE auth_account, auth_session, invitation, auth_verification, auth_rate_limit, organization, auth_user CASCADE",
    );
  } finally {
    await pool.end();
  }
}
