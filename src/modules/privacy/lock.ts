import { eq } from "drizzle-orm";
import { organization } from "../../server/db";
import { DomainError } from "../../server/errors";
import type { Transaction, workspaceContext } from "../records/service";
export async function lockWorkspace(
  tx: Transaction,
  context: Awaited<ReturnType<typeof workspaceContext>>,
) {
  const [current] = await tx
    .select()
    .from(organization)
    .where(eq(organization.id, context.organization.id))
    .for("update");
  if (
    !current ||
    current.privacyRevision !== context.organization.privacyRevision
  )
    throw new DomainError(
      "PRIVACY_CHANGED",
      "Private data changed while this action was waiting. Refresh and review before trying again.",
      409,
    );
  context.organization = current;
  return current;
}
