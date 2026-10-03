import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import {
  bootstrapAdmin,
  acceptInvitation,
  createInvitation,
  changeAccess,
} from "../../src/server/auth/service";
import { requireActor, requireAdmin } from "../../src/server/auth/access";
import { getAuth } from "../../src/server/auth/auth";
import { db, pool, user, invitation, session } from "../../src/server/db";
import {
  getOrganization,
  saveOrganization,
} from "../../src/server/organization";
import { resetTestDatabase } from "../helpers/database";
import { POST as authPost } from "../../src/app/api/auth/[...all]/route";
const credentials = {
  name: "Fictional admin",
  email: "admin@example.test",
  password: "Fictional-password-123",
};
const admin = () =>
  bootstrapAdmin({ ...credentials, secret: process.env.BOOTSTRAP_SECRET! });
async function login(
  email = credentials.email,
  password = credentials.password,
) {
  const response = await getAuth().handler(
    new Request(`${process.env.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: process.env.BETTER_AUTH_URL!,
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({ email, password }),
    }),
  );
  expect(response.status, await response.clone().text()).toBe(200);
  const cookie = response.headers
    .getSetCookie()
    .map((s) => s.split(";")[0])
    .join("; ");
  return new Headers({ cookie, Origin: process.env.BETTER_AUTH_URL! });
}
beforeEach(resetTestDatabase);
afterAll(() => pool.end());
describe("invited private access against PostgreSQL", () => {
  it("rejects a wrong setup secret and permits only one bootstrap under race", async () => {
    await expect(
      bootstrapAdmin({ ...credentials, secret: "wrong" }),
    ).rejects.toMatchObject({ code: "INVALID_SETUP_SECRET" });
    const results = await Promise.allSettled([
      admin(),
      bootstrapAdmin({
        ...credentials,
        email: "second@example.test",
        secret: process.env.BOOTSTRAP_SECRET!,
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.select().from(user)).toHaveLength(1);
    await expect(admin()).rejects.toMatchObject({ code: "ALREADY_CONFIGURED" });
  });
  it("blocks both public HTTP signup and direct library signup", async () => {
    const response = await authPost(
      new Request(`${process.env.BETTER_AUTH_URL}/api/auth/sign-up/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: process.env.BETTER_AUTH_URL!,
        },
        body: JSON.stringify(credentials),
      }),
    );
    expect(response.status).toBe(403);
    await expect(
      getAuth().api.signUpEmail({ body: credentials }),
    ).rejects.toBeDefined();
    expect(await db.select().from(user)).toHaveLength(0);
  });
  it("requires live authentication on reads and writes", async () => {
    await expect(getOrganization(new Headers())).rejects.toMatchObject({
      status: 401,
    });
    await expect(
      saveOrganization(new Headers(), { name: "Fictional workshop" }),
    ).rejects.toMatchObject({ status: 401 });
    await admin();
    const headers = await login();
    expect((await requireActor(headers)).role).toBe("admin");
    await saveOrganization(headers, {
      name: "Riverbend test workshop",
      timezone: "Europe/Oslo",
    });
    expect((await getOrganization(headers))?.name).toBe(
      "Riverbend test workshop",
    );
  });
  it("atomically consumes a hashed email-bound invitation once", async () => {
    const actor = await admin();
    const invite = await createInvitation(actor, {
      email: "editor@example.test",
      role: "editor",
    });
    const [stored] = await db.select().from(invitation);
    expect(stored.tokenHash).not.toBe(invite.token);
    expect(stored.tokenHash).toHaveLength(64);
    expect(stored.expiresAt.getTime() - Date.now()).toBeGreaterThan(
      71 * 60 * 60 * 1000,
    );
    await expect(
      acceptInvitation({
        ...credentials,
        email: "other@example.test",
        token: invite.token,
      }),
    ).rejects.toMatchObject({ code: "INVALID_INVITE" });
    const input = { ...credentials, email: invite.email, token: invite.token };
    const results = await Promise.allSettled([
      acceptInvitation(input),
      acceptInvitation(input),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await expect(acceptInvitation(input)).rejects.toMatchObject({
      code: "INVALID_INVITE",
    });
    expect(await db.select().from(user)).toHaveLength(2);
  });
  it("rejects expired invitations and editors cannot administer or change configuration", async () => {
    const actor = await admin();
    const expired = await createInvitation(actor, {
      email: "expired@example.test",
      role: "editor",
    });
    await db
      .update(invitation)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(invitation.id, expired.id));
    await expect(
      acceptInvitation({
        ...credentials,
        email: expired.email,
        token: expired.token,
      }),
    ).rejects.toMatchObject({ code: "INVALID_INVITE" });
    const invite = await createInvitation(actor, {
      email: "editor@example.test",
      role: "editor",
    });
    const editor = await acceptInvitation({
      ...credentials,
      email: invite.email,
      token: invite.token,
    });
    const headers = await login(invite.email);
    await expect(requireAdmin(headers)).rejects.toMatchObject({ status: 403 });
    await expect(
      createInvitation(editor, { email: "x@example.test", role: "admin" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      saveOrganization(headers, { name: "Invalid change" }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("revokes existing sessions and observes role changes immediately", async () => {
    const actor = await admin();
    const invite = await createInvitation(actor, {
      email: "editor@example.test",
      role: "editor",
    });
    const editor = await acceptInvitation({
      ...credentials,
      email: invite.email,
      token: invite.token,
    });
    const headers = await login(invite.email);
    await changeAccess(actor, {
      userId: editor.id,
      role: "admin",
      active: true,
    });
    await expect(requireActor(headers)).rejects.toMatchObject({ status: 401 });
    const promoted = await login(invite.email);
    expect((await requireAdmin(promoted)).role).toBe("admin");
    await changeAccess(actor, {
      userId: editor.id,
      role: "admin",
      active: false,
    });
    await expect(requireActor(promoted)).rejects.toMatchObject({ status: 401 });
    expect(
      await db.select().from(session).where(eq(session.userId, editor.id)),
    ).toHaveLength(0);
    const response = await authPost(
      new Request(`${process.env.BETTER_AUTH_URL}/api/auth/change-password`, {
        method: "POST",
        headers: promoted,
        body: JSON.stringify({
          currentPassword: credentials.password,
          newPassword: "Another-password-123",
        }),
      }),
    );
    expect(response.status).toBe(401);
  });
  it("protects last admin under concurrent demotions", async () => {
    const actor = await admin();
    await expect(
      changeAccess(actor, { userId: actor.id, role: "editor", active: true }),
    ).rejects.toMatchObject({ code: "LAST_ADMIN" });
    const invite = await createInvitation(actor, {
      email: "second@example.test",
      role: "admin",
    });
    const second = await acceptInvitation({
      ...credentials,
      email: invite.email,
      token: invite.token,
    });
    await Promise.allSettled([
      changeAccess(actor, { userId: actor.id, role: "editor", active: true }),
      changeAccess(second, { userId: second.id, role: "editor", active: true }),
    ]);
    const remaining = await db
      .select()
      .from(user)
      .where(sql`role='admin' AND active=true`);
    expect(remaining).toHaveLength(1);
  });
  it("requires the current password and invalidates other sessions on change", async () => {
    await admin();
    const first = await login();
    const other = await login();
    await expect(
      getAuth().api.changePassword({
        headers: first,
        body: {
          currentPassword: "Incorrect-password",
          newPassword: "New-fictional-password-456",
          revokeOtherSessions: true,
        },
      }),
    ).rejects.toBeDefined();
    await getAuth().api.changePassword({
      headers: first,
      body: {
        currentPassword: credentials.password,
        newPassword: "New-fictional-password-456",
        revokeOtherSessions: true,
      },
    });
    await expect(requireActor(other)).rejects.toMatchObject({ status: 401 });
    expect(
      (
        await requireActor(
          await login(credentials.email, "New-fictional-password-456"),
        )
      ).role,
    ).toBe("admin");
  });
  it("enforces the single organization contract in the database", async () => {
    await expect(
      db.execute(
        sql`INSERT INTO organization (name,singleton_key) VALUES ('Fictional other',2)`,
      ),
    ).rejects.toBeDefined();
  });
});
