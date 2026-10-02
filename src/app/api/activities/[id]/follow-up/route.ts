import { updateFollowUp } from "@/modules/outreach/service";
import { checkOrigin, jsonRoute, readJson } from "@/server/http";
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return jsonRoute(async () => {
    checkOrigin(r);
    return updateFollowUp(r.headers, (await params).id, await readJson(r));
  });
}
