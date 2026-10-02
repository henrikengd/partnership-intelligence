import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, user, account, invitation, session } from "../db";
import { readConfig } from "../config";
import { DomainError } from "../errors";
import type { Actor } from "./access";
export const credentialsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z
    .email()
    .max(254)
    .transform((s) => s.trim().toLowerCase()),
  password: z.string().min(12).max(128),
});
export const inviteSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((s) => s.trim().toLowerCase()),
  role: z.enum(["admin", "editor"]),
});
type Credentials = z.input<typeof credentialsSchema>;
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function lockAccess(tx: Transaction) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(70411001)`);
}
async function assertAdmin(tx: Transaction, actor: Actor) {
  const [current] = await tx.select().from(user).where(eq(user.id, actor.id));
  if (!current?.active || current.role !== "admin")
    throw new DomainError(
      "FORBIDDEN",
      "Administrator access is required.",
      403,
    );
}
async function insertCredential(
  tx: Transaction,
  input: z.output<typeof credentialsSchema>,
  password: string,
  role: "admin" | "editor",
) {
  if (
    (
      await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, input.email))
    ).length
  )
    throw new DomainError(
      "ACCOUNT_EXISTS",
      "An account already exists for that email.",
      409,
    );
  const id = randomUUID();
  await tx
    .insert(user)
    .values({
      id,
      name: input.name,
      email: input.email,
      role,
      emailVerified: false,
    });
  await tx
    .insert(account)
    .values({
      id: randomUUID(),
      userId: id,
      accountId: id,
      providerId: "credential",
      password,
    });
  return { id, name: input.name, email: input.email, role };
}
export async function bootstrapAdmin(raw: Credentials & { secret: string }) {
  const { secret, ...credentials } = raw;
  const input = credentialsSchema.parse(credentials);
  const expected = readConfig().BOOTSTRAP_SECRET;
  const suppliedHash = tokenHash(secret ?? "");
  const expectedHash = tokenHash(expected);
  if (!timingSafeEqual(Buffer.from(suppliedHash), Buffer.from(expectedHash)))
    throw new DomainError(
      "INVALID_SETUP_SECRET",
      "The setup secret is invalid.",
      403,
    );
  const password = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    await lockAccess(tx);
    if ((await tx.select({ id: user.id }).from(user).limit(1)).length)
      throw new DomainError(
        "ALREADY_CONFIGURED",
        "This installation already has an administrator.",
        409,
      );
    return insertCredential(tx, input, password, "admin");
  });
}
export async function createInvitation(
  actor: Actor,
  raw: z.input<typeof inviteSchema>,
) {
  const input = inviteSchema.parse(raw);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  return db.transaction(async (tx) => {
    await lockAccess(tx);
    await assertAdmin(tx, actor);
    if (
      (
        await tx
          .select({ id: user.id })
          .from(user)
          .where(eq(user.email, input.email))
      ).length
    )
      throw new DomainError(
        "ACCOUNT_EXISTS",
        "Use access management for existing accounts.",
        409,
      );
    const [record] = await tx
      .insert(invitation)
      .values({
        ...input,
        tokenHash: tokenHash(token),
        invitedBy: actor.id,
        expiresAt,
      })
      .returning();
    return {
      id: record.id,
      email: record.email,
      role: record.role,
      expiresAt,
      token,
    };
  });
}
export async function acceptInvitation(raw: Credentials & { token: string }) {
  const input = credentialsSchema.parse(raw);
  if (!/^[A-Za-z0-9_-]{43}$/.test(raw.token))
    throw new DomainError(
      "INVALID_INVITE",
      "The invitation is invalid, expired, or already used.",
      403,
    );
  const available = await db.query.invitation.findFirst({
    where: eq(invitation.tokenHash, tokenHash(raw.token)),
  });
  if (
    !available ||
    available.usedAt ||
    available.expiresAt <= new Date() ||
    available.email !== input.email
  )
    throw new DomainError(
      "INVALID_INVITE",
      "The invitation is invalid, expired, or already used.",
      403,
    );
  const password = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(invitation)
      .where(eq(invitation.tokenHash, tokenHash(raw.token)))
      .for("update");
    if (
      !record ||
      record.usedAt ||
      record.expiresAt <= new Date() ||
      record.email !== input.email
    )
      throw new DomainError(
        "INVALID_INVITE",
        "The invitation is invalid, expired, or already used.",
        403,
      );
    const actor = await insertCredential(tx, input, password, record.role);
    await tx
      .update(invitation)
      .set({ usedAt: new Date(), updatedAt: new Date() })
      .where(eq(invitation.id, record.id));
    return actor;
  });
}
export async function changeAccess(
  actor: Actor,
  raw: { userId: string; role: "admin" | "editor"; active: boolean },
) {
  const input = z
    .object({
      userId: z.uuid(),
      role: z.enum(["admin", "editor"]),
      active: z.boolean(),
    })
    .parse(raw);
  return db.transaction(async (tx) => {
    await lockAccess(tx);
    await assertAdmin(tx, actor);
    const [target] = await tx
      .select()
      .from(user)
      .where(eq(user.id, input.userId));
    if (!target) throw new DomainError("NOT_FOUND", "Account not found.", 404);
    if (
      target.active &&
      target.role === "admin" &&
      (!input.active || input.role !== "admin")
    ) {
      const admins = await tx
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.active, true), eq(user.role, "admin")));
      if (admins.length <= 1)
        throw new DomainError(
          "LAST_ADMIN",
          "Keep at least one active administrator.",
          409,
        );
    }
    await tx
      .update(user)
      .set({ active: input.active, role: input.role, updatedAt: new Date() })
      .where(eq(user.id, input.userId));
    await tx.delete(session).where(eq(session.userId, input.userId));
    return { ...input };
  });
}
