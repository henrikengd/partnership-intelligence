import { confirmPersonDeletion } from "@/modules/privacy/service";
import { requireAdmin } from "@/server/auth/access";
import { checkOrigin, jsonRoute, readJson } from "@/server/http";
export async function POST(r: Request) {
  return jsonRoute(async () => {
    await requireAdmin(r.headers);
    checkOrigin(r);
    return confirmPersonDeletion(r.headers, await readJson(r));
  });
}
