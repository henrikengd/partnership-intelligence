import {
  startGenerationRun,
  listGenerationRuns,
} from "@/modules/opportunities/runs";
import { checkOrigin, jsonRoute, readJson } from "@/server/http";
export async function GET(r: Request) {
  return jsonRoute(() => listGenerationRuns(r.headers));
}
export async function POST(r: Request) {
  return jsonRoute(async () => {
    checkOrigin(r);
    return startGenerationRun(r.headers, await readJson(r));
  });
}
