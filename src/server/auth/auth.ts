import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";
import { readConfig } from "../config";
let instance: ReturnType<typeof makeAuth> | undefined;
function makeAuth() {
  const config = readConfig();
  return betterAuth({
    logger: { disabled: true },
    database: drizzleAdapter(db, { provider: "pg", schema }),
    baseURL: config.BETTER_AUTH_URL,
    secret: config.BETTER_AUTH_SECRET,
    trustedOrigins: [new URL(config.BETTER_AUTH_URL).origin],
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    advanced: {
      database: { generateId: "uuid" },
      useSecureCookies: new URL(config.BETTER_AUTH_URL).protocol === "https:",
    },
    session: { cookieCache: { enabled: false }, expiresIn: 60 * 60 * 24 * 7 },
    rateLimit: { enabled: true, storage: "database" },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: "editor",
          input: false,
        },
        active: {
          type: "boolean",
          required: true,
          defaultValue: true,
          input: false,
        },
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const found = await db.query.user.findFirst({
              where: (u, { eq }) => eq(u.id, session.userId),
            });
            if (!found?.active) return false;
          },
        },
      },
    },
  });
}
export function getAuth() {
  return (instance ??= makeAuth());
}
