import { z } from "zod";
const schema = z.object({
  APPLICATION_MODE: z.enum(["live", "demo"]).default("live"),
  DEMO_DATABASE_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BOOTSTRAP_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  ALLOW_INSECURE_HTTP: z.enum(["true", "false"]).default("false"),
});
export function readConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const result = schema.safeParse(env);
  if (!result.success)
    throw new Error(
      `Invalid configuration: ${result.error.issues.map((i) => i.path.join(".")).join(", ")}`,
    );
  const config = result.data;
  const url = new URL(config.BETTER_AUTH_URL);
  if (
    url.protocol !== "https:" &&
    !(
      config.ALLOW_INSECURE_HTTP === "true" &&
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
  )
    throw new Error(
      "Authentication requires HTTPS except explicitly enabled local HTTP.",
    );
  return config;
}
