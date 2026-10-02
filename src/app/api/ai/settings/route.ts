import { getAiSettings, saveAiSettings } from "@/server/ai/service";
import { checkOrigin, jsonRoute, readJson } from "@/server/http";
export async function GET(r: Request) {
  return jsonRoute(() => getAiSettings(r.headers));
}
export async function PUT(r: Request) {
  return jsonRoute(async () => {
    checkOrigin(r);
    return saveAiSettings(r.headers, await readJson(r));
  });
}
