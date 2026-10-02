import {
  getImport,
  cancelImport,
  commitImport,
} from "@/modules/imports/service";
import { workspaceContext } from "@/modules/records/service";
import { readBoundedBytes } from "@/modules/imports/http";
import { checkOrigin, jsonRoute } from "@/server/http";
import { DomainError } from "@/server/errors";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return jsonRoute(async () =>
    getImport(request.headers, (await context.params).id),
  );
}
export async function DELETE(request: Request, context: Context) {
  return jsonRoute(async () => {
    checkOrigin(request);
    return cancelImport(request.headers, (await context.params).id);
  });
}
export async function POST(request: Request, context: Context) {
  return jsonRoute(async () => {
    checkOrigin(request);
    await workspaceContext(request.headers);
    let input: unknown;
    try {
      input = JSON.parse(
        (await readBoundedBytes(request, 1024 * 1024)).toString("utf8"),
      );
    } catch (error) {
      if (error instanceof DomainError) throw error;
      throw new DomainError("INVALID_JSON", "Send the row decisions as JSON.");
    }
    return commitImport(request.headers, (await context.params).id, input);
  });
}
