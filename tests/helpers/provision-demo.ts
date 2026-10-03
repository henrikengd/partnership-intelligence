import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
/** Test infrastructure only; refuses an unrecognized or non-isolated admin connection. */
export async function provisionDemoTestDatabase() {
  const raw = process.env.TEST_DATABASE_URL;
  if (
    !raw ||
    raw !== process.env.DATABASE_URL ||
    !/^pi_(t01|ci|integration)$/.test(new URL(raw).pathname.slice(1))
  )
    throw new Error(
      "Demo test provisioning requires matching isolated DATABASE_URL/TEST_DATABASE_URL.",
    );
  const adminUrl = new URL(raw);
  const admin = new Pool({ connectionString: raw, max: 1 });
  const demoUrl = new URL(raw);
  demoUrl.pathname = "/pi_demo";
  demoUrl.username = "pi_demo";
  demoUrl.password = "pi_fictional_demo_only";
  try {
    const identity = (
      await admin.query(
        "SELECT current_database() AS database,current_user AS login",
      )
    ).rows[0];
    if (
      identity.database !== adminUrl.pathname.slice(1) ||
      identity.login !== decodeURIComponent(adminUrl.username)
    )
      throw new Error("Test administrator connection identity changed.");
    const role = (
      await admin.query(
        "SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolcanlogin FROM pg_roles WHERE rolname='pi_demo'",
      )
    ).rows[0];
    const database = (
      await admin.query(
        "SELECT pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname='pi_demo'",
      )
    ).rows[0];
    if (role) {
      if (
        !database ||
        database.owner !== "pi_demo" ||
        role.rolsuper ||
        role.rolcreatedb ||
        role.rolcreaterole ||
        role.rolreplication ||
        role.rolbypassrls ||
        !role.rolcanlogin
      )
        throw new Error(
          "Existing pi_demo role/database is not recognized test infrastructure; no changes made.",
        );
      if (
        (
          await admin.query(
            "SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname='pi_demo'",
          )
        ).rows.length
      )
        throw new Error("Existing demo login has unexpected role memberships.");
    } else {
      if (database)
        throw new Error("Existing pi_demo database has an unexpected owner.");
      await admin.query(
        `CREATE ROLE "pi_demo" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD 'pi_fictional_demo_only'`,
      );
      await admin.query('CREATE DATABASE "pi_demo" OWNER "pi_demo"');
    }
  } finally {
    await admin.end();
  }
  const demo = new Pool({ connectionString: demoUrl.href, max: 1 });
  try {
    const identity = (
      await demo.query(
        "SELECT current_database() AS database,current_user AS login",
      )
    ).rows[0];
    if (identity.database !== "pi_demo" || identity.login !== "pi_demo")
      throw new Error("Companion demo connection identity changed.");
    const tables = (
      await demo.query(
        "SELECT tablename FROM pg_tables WHERE schemaname='public'",
      )
    ).rows;
    if (tables.length) {
      if (!tables.some((t) => t.tablename === "demo_installation"))
        throw new Error(
          "Existing companion contains unrecognized data. No migrations applied.",
        );
      const marker = (
        await demo.query("SELECT dataset_version FROM demo_installation")
      ).rows;
      if (marker.length === 0) {
        for (const t of tables) {
          const result = await demo.query(
            `SELECT count(*)::int AS n FROM "${String(t.tablename).replaceAll('"', '""')}"`,
          );
          if (result.rows[0].n !== 0)
            throw new Error(
              "Unmarked companion contains records. No migration applied.",
            );
        }
      } else {
        if (marker.length !== 1 || marker[0].dataset_version !== "riverbend-v1")
          throw new Error(
            "Existing companion is not the provisioned fictional test demo.",
          );
        const orgs = (await demo.query("SELECT name FROM organization")).rows;
        const users = (await demo.query("SELECT email FROM auth_user")).rows;
        if (
          orgs.length > 1 ||
          orgs.some((o) => o.name !== "Riverbend Community Workshop") ||
          users.some((u) => u.email !== "demo-admin@riverbend.example.test")
        )
          throw new Error(
            "Companion contains an unrecognized organization/account. No migration applied.",
          );
      }
    }
    await migrate(drizzle(demo), { migrationsFolder: "./db/migrations" });
  } finally {
    await demo.end();
  }
  process.env.DEMO_TEST_DATABASE_URL = demoUrl.href;
  return demoUrl.href;
}
