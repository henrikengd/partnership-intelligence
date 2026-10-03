import { previewPersonDeletion } from "@/modules/privacy/service";
import { checkOrigin, jsonRoute, readJson } from "@/server/http";
import { requireAdmin } from "@/server/auth/access";
import { z } from "zod";
export async function POST(r: Request) {
  return jsonRoute(async () => {
    await requireAdmin(r.headers);
    checkOrigin(r);
    const { personId } = z
      .object({ personId: z.uuid() })
      .parse(await readJson(r));
    return previewPersonDeletion(r.headers, personId);
  });
}
