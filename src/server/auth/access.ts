import { eq } from "drizzle-orm";
import { db, user } from "../db";
import { DomainError } from "../errors";
import { getAuth } from "./auth";
export type Role = "admin" | "editor";
export type Actor = { id: string; name: string; email: string; role: Role };
export async function requireActor(headers: Headers): Promise<Actor> {
  const current = await getAuth().api.getSession({
    headers,
    query: { disableCookieCache: true },
  });
  if (!current)
    throw new DomainError("UNAUTHORIZED", "Sign in to continue.", 401);
  const [record] = await db
    .select()
    .from(user)
    .where(eq(user.id, current.user.id));
  if (!record?.active)
    throw new DomainError("UNAUTHORIZED", "Your access has been revoked.", 401);
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    role: record.role,
  };
}
export async function requireAdmin(headers: Headers) {
  const actor = await requireActor(headers);
  if (actor.role !== "admin")
    throw new DomainError(
      "FORBIDDEN",
      "Administrator access is required.",
      403,
    );
  return actor;
}
