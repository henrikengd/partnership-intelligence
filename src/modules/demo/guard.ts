import { pool } from "../../server/db";
import { DEMO_NAME, DEMO_VERSION } from "./dataset";
export function assertDemoEnvironment(env: NodeJS.ProcessEnv = process.env) {
  if (
    env.APPLICATION_MODE !== "demo" ||
    !env.DEMO_DATABASE_URL ||
    env.DATABASE_URL !== env.DEMO_DATABASE_URL
  )
    throw new Error(
      "Demo operations require APPLICATION_MODE=demo and identical explicit DATABASE_URL/DEMO_DATABASE_URL. Live installations are refused.",
    );
  const url = new URL(env.DEMO_DATABASE_URL);
  if (
    url.pathname !== "/pi_demo" ||
    decodeURIComponent(url.username) !== "pi_demo"
  )
    throw new Error(
      "Demo operations require the dedicated pi_demo database and login.",
    );
  const auth = new URL(env.BETTER_AUTH_URL ?? "");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(auth.hostname))
    throw new Error("The fictional demo must use a local application URL.");
  if (env.OPENAI_API_KEY?.trim())
    throw new Error(
      "Remove AI credentials from the isolated fictional demo environment.",
    );
  return env.DEMO_DATABASE_URL;
}
/** Database identity is independently checked, rather than trusting a URL label. */
export async function withDemoGuard<T>(
  action: "seed" | "reset",
  confirmed: boolean,
  work: () => Promise<T>,
) {
  const url = assertDemoEnvironment();
  if (action === "reset" && !confirmed)
    throw new Error(
      "Reset requires --confirm-demo-reset and a stopped demo server.",
    );
  if (pool.options.connectionString !== url)
    throw new Error(
      "The application's write pool does not match the explicit demo connection. No mutation was performed.",
    );
  const client = await pool.connect();
  try {
    const identity = await client.query(
      "SELECT current_database() AS database, current_user AS login",
    );
    if (
      identity.rows[0].database !== "pi_demo" ||
      identity.rows[0].login !== "pi_demo"
    )
      throw new Error("Connected database/login is not the isolated demo.");
    await client.query("SELECT pg_advisory_lock(914091)");
    const tables = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public'",
    );
    const names = tables.rows.map((r) => String(r.tablename));
    if (!names.includes("demo_installation"))
      throw new Error("Apply migrations to the isolated demo before seeding.");
    const connections = await client.query(
      "SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND application_name<>'partnership-demo-operator'",
    );
    if (connections.rows[0].count)
      throw new Error(
        "Stop the demo server and other demo database connections before seed/reset.",
      );
    const markers = await client.query("SELECT * FROM demo_installation");
    if (action === "seed") {
      for (const name of names) {
        const count = await client.query(
          `SELECT count(*)::int AS count FROM "${name.replaceAll('"', '""')}"`,
        );
        if (count.rows[0].count !== 0)
          throw new Error(
            "Seed accepts only an empty installation. Private or existing data was left unchanged.",
          );
      }
    } else {
      const marker = markers.rows[0];
      if (markers.rows.length !== 1 || marker.dataset_version !== DEMO_VERSION)
        throw new Error(
          "No matching provisioned fictional-demo sentinel. Reset refused.",
        );
      const orgs = await client.query("SELECT id,name FROM organization");
      if (
        orgs.rows.length > 1 ||
        orgs.rows.some(
          (o) =>
            o.name !== DEMO_NAME ||
            (marker.organization_id && o.id !== marker.organization_id),
        )
      )
        throw new Error(
          "Organization does not match the fictional demo sentinel. Reset refused.",
        );
      if (
        marker.state === "ready" &&
        (!marker.organization_id || orgs.rows.length !== 1)
      )
        throw new Error("Ready demo identity is inconsistent. Reset refused.");
      const users = await client.query("SELECT email FROM auth_user");
      if (
        users.rows.some((u) => u.email !== "demo-admin@riverbend.example.test")
      )
        throw new Error(
          "Unrecognized accounts found. Reset refused; preserve this database separately.",
        );
    }
    return await work();
  } finally {
    await client.query("SELECT pg_advisory_unlock(914091)").catch(() => {});
    client.release();
  }
}
