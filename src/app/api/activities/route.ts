import { saveActivity } from "@/modules/outreach/service";
import { checkOrigin, jsonRoute, readJson } from "@/server/http";
export async function POST(request: Request) {
  return jsonRoute(async () => {
    checkOrigin(request);
    return saveActivity(request.headers, await readJson(request));
  });
}
