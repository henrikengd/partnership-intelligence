import { createInvitation } from "@/server/auth/service";
import { requireAdmin } from "@/server/auth/access";
import { checkOrigin, jsonRoute, readJson } from "@/server/http";
export async function POST(request: Request) {
  return jsonRoute(async () => {
    checkOrigin(request);
    const actor = await requireAdmin(request.headers);
    return createInvitation(actor, await readJson(request));
  });
}
