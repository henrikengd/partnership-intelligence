import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "../src/server/db";
try {
  await migrate(db, { migrationsFolder: "./db/migrations" });
  console.log("Database migrations applied.");
} finally {
  await pool.end();
}
