import { saveIncentive } from "@/modules/opportunities/runs";
import { checkOrigin, jsonRoute, readJson } from "@/server/http";
export async function POST(r: Request) {
  return jsonRoute(async () => {
    checkOrigin(r);
    return saveIncentive(r.headers, await readJson(r));
  });
}
