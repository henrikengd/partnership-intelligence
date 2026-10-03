import { getOrganization, saveOrganization } from "@/server/organization";
import { checkOrigin, jsonRoute, readJson } from "@/server/http";
export async function GET(request: Request) {
  return jsonRoute(() => getOrganization(request.headers));
}
export async function PUT(request: Request) {
  return jsonRoute(async () => {
    checkOrigin(request);
    return saveOrganization(request.headers, await readJson(request));
  });
}
