import { getOnboarding, saveOnboarding } from "@/modules/onboarding/service";
import { checkOrigin, jsonRoute, readJson } from "@/server/http";
export async function GET(request: Request) {
  return jsonRoute(async () => getOnboarding(request.headers));
}
export async function POST(request: Request) {
  return jsonRoute(async () => {
    checkOrigin(request);
    return saveOnboarding(request.headers, await readJson(request));
  });
}
