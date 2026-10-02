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
  date,
  numeric,
  jsonb,
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

// All business records belong to this installation's single organization.
const domainBase = () => ({
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  recordedBy: uuid("recorded_by")
    .notNull()
    .references(() => user.id),
  revision: integer("revision").notNull().default(1),
  ...dates,
});
export const need = pgTable(
  "need",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...domainBase(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    urgency: integer("urgency"),
    deadline: date("deadline"),
    estimatedValue: numeric("estimated_value", { precision: 14, scale: 2 }),
    currency: text("currency").notNull().default("NOK"),
    partnershipType: text("partnership_type").notNull().default("in_kind"),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    check(
      "need_urgency_bounds",
      sql`${t.urgency} IS NULL OR ${t.urgency} BETWEEN 0 AND 4`,
    ),
    check(
      "need_value_nonnegative",
      sql`${t.estimatedValue} IS NULL OR ${t.estimatedValue} >= 0`,
    ),
  ],
);
export const person = pgTable("person", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...domainBase(),
  name: text("name").notNull(),
  email: text("email"),
  sourceId: text("source_id"),
  notes: text("notes").notNull().default(""),
});
export const affiliation = pgTable(
  "affiliation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...domainBase(),
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    state: text("state").notNull().default("current"),
    startDate: date("start_date"),
    endDate: date("end_date"),
  },
  (t) => [
    uniqueIndex("affiliation_person_role").on(
      t.organizationId,
      t.personId,
      t.role,
    ),
    check(
      "affiliation_dates",
      sql`${t.startDate} IS NULL OR ${t.endDate} IS NULL OR ${t.startDate} <= ${t.endDate}`,
    ),
    check(
      "affiliation_state",
      sql`${t.state} IN ('current','ended','unknown')`,
    ),
    check(
      "affiliation_current_end",
      sql`${t.state} <> 'current' OR ${t.endDate} IS NULL`,
    ),
  ],
);
export const company = pgTable("company", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...domainBase(),
  name: text("name").notNull(),
  website: text("website"),
  domain: text("domain"),
  description: text("description").notNull().default(""),
  sourceId: text("source_id"),
});
export const evidence = pgTable(
  "evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...domainBase(),
    claim: text("claim").notNull(),
    sourceType: text("source_type").notNull(),
    url: text("url"),
    attribution: text("attribution"),
    excerpt: text("excerpt").notNull(),
    observedDate: date("observed_date").notNull(),
    reviewState: text("review_state").notNull().default("supplied"),
    reviewDate: date("review_date"),
  },
  (t) => [
    check(
      "evidence_source",
      sql`(${t.sourceType}='supplied_source' AND ${t.url} IS NOT NULL) OR (${t.sourceType}='observation' AND ${t.attribution} IS NOT NULL)`,
    ),
    check(
      "evidence_review_state",
      sql`${t.reviewState} IN ('supplied','reviewed','disputed','superseded')`,
    ),
    check(
      "evidence_review_date",
      sql`${t.reviewState} <> 'reviewed' OR ${t.reviewDate} IS NOT NULL`,
    ),
  ],
);
export const capability = pgTable("capability", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...domainBase(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => company.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  description: text("description").notNull(),
  evidenceId: uuid("evidence_id")
    .notNull()
    .references(() => evidence.id),
});
export const relationship = pgTable(
  "relationship",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...domainBase(),
    kind: text("kind").notNull(),
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    targetPersonId: uuid("target_person_id").references(() => person.id, {
      onDelete: "cascade",
    }),
    companyId: uuid("company_id").references(() => company.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull().default(""),
    state: text("state").notNull().default("current"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    strength: integer("strength"),
    willingness: text("willingness").notNull().default("unknown"),
    willingnessDate: date("willingness_date"),
    willingnessSource: text("willingness_source"),
    evidenceId: uuid("evidence_id")
      .notNull()
      .references(() => evidence.id),
  },
  (t) => [
    check(
      "relationship_endpoints",
      sql`(${t.kind} IN ('works_at','previously_worked_at','interned_at') AND ${t.companyId} IS NOT NULL AND ${t.targetPersonId} IS NULL) OR (${t.kind} IN ('knows','introduced_by','studied_with') AND ${t.targetPersonId} IS NOT NULL AND ${t.companyId} IS NULL AND ${t.personId} <> ${t.targetPersonId})`,
    ),
    check(
      "relationship_dates",
      sql`${t.startDate} IS NULL OR ${t.endDate} IS NULL OR ${t.startDate} <= ${t.endDate}`,
    ),
    check(
      "relationship_previous_state",
      sql`${t.kind} <> 'previously_worked_at' OR ${t.state}='ended'`,
    ),
    check(
      "relationship_state",
      sql`${t.state} IN ('current','ended','unknown')`,
    ),
    check(
      "relationship_current_end",
      sql`${t.state} <> 'current' OR ${t.endDate} IS NULL`,
    ),
    check(
      "relationship_strength",
      sql`${t.strength} IS NULL OR ${t.strength} BETWEEN 0 AND 4`,
    ),
    check(
      "relationship_willingness",
      sql`${t.willingness} IN ('yes','no','unknown') AND (${t.willingness}='unknown' OR (${t.willingnessDate} IS NOT NULL AND ${t.willingnessSource} IS NOT NULL))`,
    ),
  ],
);
export type BriefFields = {
  ask: string;
  valueExchange: string;
  contactRole: string;
  nextAction: string;
  approach: string;
};
export const opportunity = pgTable(
  "opportunity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...domainBase(),
    needId: uuid("need_id")
      .notNull()
      .references(() => need.id),
    companyId: uuid("company_id")
      .notNull()
      .references(() => company.id),
    partnershipType: text("partnership_type").notNull(),
    state: text("state").notNull().default("suggested"),
    reviewState: text("review_state").notNull().default("needs_review"),
    ownerId: uuid("owner_id").references(() => user.id),
    manualBrief: jsonb("manual_brief")
      .$type<Partial<BriefFields>>()
      .notNull()
      .default({}),
    inputRevision: integer("input_revision").notNull().default(1),
  },
  (t) => [
    uniqueIndex("opportunity_active_unique")
      .on(t.organizationId, t.needId, t.companyId, t.partnershipType)
      .where(sql`${t.state} NOT IN ('declined','archived')`),
    check(
      "opportunity_state",
      sql`${t.state} IN ('suggested','shortlisted','pursuing','agreed','declined','archived')`,
    ),
  ],
);
export const assessment = pgTable(
  "assessment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunity.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    rubricVersion: text("rubric_version").notNull().default("v1"),
    inputRevision: integer("input_revision").notNull(),
    factors: jsonb("factors")
      .$type<import("../../modules/opportunities/scoring").Factors>()
      .notNull(),
    brief: jsonb("brief")
      .$type<import("../../modules/opportunities/contracts").GeneratedBrief>()
      .notNull(),
    priority: numeric("priority", { precision: 6, scale: 2 }).notNull(),
    coverage: integer("coverage").notNull(),
    recordedBy: uuid("recorded_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("assessment_opportunity_version").on(
      t.opportunityId,
      t.version,
    ),
  ],
);
export const assessmentEvidence = pgTable(
  "assessment_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessment.id, { onDelete: "cascade" }),
    evidenceId: uuid("evidence_id")
      .notNull()
      .references(() => evidence.id),
  },
  (t) => [
    uniqueIndex("assessment_evidence_pair").on(t.assessmentId, t.evidenceId),
  ],
);
export const activity = pgTable(
  "activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...domainBase(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunity.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("planned"),
    targetPersonId: uuid("target_person_id").references(() => person.id),
    targetRole: text("target_role").notNull().default(""),
    channel: text("channel").notNull(),
    description: text("description").notNull(),
    followUpDate: date("follow_up_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "activity_status_completion",
      sql`(${t.status}='planned' AND ${t.completedAt} IS NULL) OR (${t.status}='completed' AND ${t.completedAt} IS NOT NULL)`,
    ),
    check(
      "activity_kind",
      sql`${t.kind} IN ('introduction','outreach','meeting','follow_up')`,
    ),
  ],
);
