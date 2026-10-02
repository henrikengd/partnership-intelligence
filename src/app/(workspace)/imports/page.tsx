import { headers } from "next/headers";
import Link from "next/link";
import { requirePageActor } from "@/server/auth/page";
import { getOrganization } from "@/server/organization";
import { getImport, purgeExpiredImports } from "@/modules/imports/service";
import { ImportWorkflow } from "@/components/import-workflow";
import { db, importBatch } from "@/server/db";
import { and, eq, desc } from "drizzle-orm";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const h = await headers();
  const actor = await requirePageActor(h);
  const org = await getOrganization(h);
  if (!org)
    return (
      <section className="card">
        <h1>Save an organization profile first</h1>
        <Link href="/onboarding">Open onboarding</Link>
      </section>
    );
  await purgeExpiredImports();
  const id = (await searchParams).batch;
  const initial = id ? await getImport(h, id) : null;
  const batches = await db
    .select({
      id: importBatch.id,
      kind: importBatch.kind,
      status: importBatch.status,
      createdAt: importBatch.createdAt,
    })
    .from(importBatch)
    .where(
      and(
        eq(importBatch.organizationId, org.id),
        ...(actor.role === "admin"
          ? []
          : [eq(importBatch.recordedBy, actor.id)]),
      ),
    )
    .orderBy(desc(importBatch.createdAt))
    .limit(20);
  return (
    <>
      <span className="eyebrow">Private data tools</span>
      <h1>CSV data imports</h1>
      <p className="muted">
        Only invited partnership-team users can import or view these records.
        The app does not retain uploaded files. Pending normalized previews are
        private and are cleared on cancel, commit or the next import operation
        after expiry.
      </p>
      <ImportWorkflow initial={initial} />
      {batches.length > 0 && (
        <section className="card">
          <h2>Recent import batches</h2>
          <ul>
            {batches.map((b) => (
              <li key={b.id}>
                <Link href={`/imports?batch=${b.id}`}>
                  {b.kind} · {b.status} ·{" "}
                  {b.createdAt.toISOString().slice(0, 10)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p>
        <Link href="/onboarding">Resume onboarding</Link> ·{" "}
        <Link href="/settings">Settings</Link>
      </p>
    </>
  );
}
