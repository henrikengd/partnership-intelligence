import { headers } from "next/headers";
import { requirePageActor } from "@/server/auth/page";
import { getOrganization } from "@/server/organization";
import { db, user } from "@/server/db";
import {
  AccessSettings,
  OrganizationForm,
  PasswordForm,
} from "@/components/settings-forms";
export default async function Settings() {
  const requestHeaders = await headers();
  const actor = await requirePageActor(requestHeaders);
  const organization = await getOrganization(requestHeaders);
  const accounts =
    actor.role === "admin"
      ? await db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            active: user.active,
          })
          .from(user)
      : [];
  return (
    <>
      <span className="eyebrow">Private installation</span>
      <h1>Settings</h1>
      <div className="grid">
        {actor.role === "admin" ? (
          <>
            <section className="card">
              <h2>Organization profile</h2>
              <OrganizationForm initial={organization} />
            </section>
            <section className="card">
              <h2>Invite your team</h2>
              <p className="muted">
                Editors work with partnership records. Administrators also
                manage access and installation settings.
              </p>
              <AccessSettings accounts={accounts} />
            </section>
          </>
        ) : (
          <section className="card">
            <h2>Organization profile</h2>
            <p>
              {organization?.name ??
                "Your administrator has not configured the organization yet."}
            </p>
            <p className="muted">
              An administrator manages the organization profile and team access.
            </p>
          </section>
        )}
        <section className="card">
          <h2>Your password</h2>
          <PasswordForm />
        </section>
      </div>
    </>
  );
}
