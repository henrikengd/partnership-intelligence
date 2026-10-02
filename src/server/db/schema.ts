import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
  integer,
  uniqueIndex,
  bigint,
  check,
} from "drizzle-orm/pg-core";
export const accessRole = pgEnum("access_role", ["admin", "editor"]);
const dates = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};
export const user = pgTable("auth_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: accessRole("role").notNull().default("editor"),
  active: boolean("active").notNull().default(true),
  ...dates,
});
export const session = pgTable("auth_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...dates,
});
export const account = pgTable(
  "auth_account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    ...dates,
  },
  (t) => [
    uniqueIndex("auth_account_provider_user").on(t.providerId, t.accountId),
  ],
);
export const verification = pgTable("auth_verification", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...dates,
});
export const invitation = pgTable("invitation", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  email: text("email").notNull(),
  role: accessRole("role").notNull(),
  invitedBy: uuid("invited_by")
    .notNull()
    .references(() => user.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  ...dates,
});
export const organization = pgTable(
  "organization",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    singletonKey: integer("singleton_key").notNull().default(1).unique(),
    name: text("name").notNull(),
    mission: text("mission").notNull().default(""),
    website: text("website"),
    type: text("type").notNull().default("other"),
    location: text("location").notNull().default(""),
    teamSize: integer("team_size"),
    timezone: text("timezone").notNull().default("UTC"),
    ...dates,
  },
  (t) => [
    check("organization_single_installation", sql`${t.singletonKey} = 1`),
    check(
      "organization_team_size_nonnegative",
      sql`${t.teamSize} IS NULL OR ${t.teamSize} >= 0`,
    ),
  ],
);

export const rateLimit = pgTable("auth_rate_limit", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
