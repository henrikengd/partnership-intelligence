import { purgePrivateRetention } from "@/modules/privacy/service";
import { requireAdmin } from "@/server/auth/access";
import { checkOrigin, jsonRoute } from "@/server/http";
export async function POST(r: Request) {
  return jsonRoute(async () => {
    await requireAdmin(r.headers);
    checkOrigin(r);
    return purgePrivateRetention(r.headers);
  });
}
