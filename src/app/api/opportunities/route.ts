import { generateOpportunity } from "@/modules/opportunities/service";
import { checkOrigin, jsonRoute, readJson } from "@/server/http";
export async function POST(request: Request) {
  return jsonRoute(async () => {
    checkOrigin(request);
    return generateOpportunity(request.headers, await readJson(request));
  });
}
