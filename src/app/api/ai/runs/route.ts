import { startAiRun, listAiRuns } from "@/server/ai/service";
import { checkOrigin, jsonRoute, readJson } from "@/server/http";
export async function GET(r: Request) {
  return jsonRoute(() =>
    listAiRuns(
      r.headers,
      new URL(r.url).searchParams.get("opportunityId") ?? "",
    ),
  );
}
export async function POST(r: Request) {
  return jsonRoute(async () => {
    checkOrigin(r);
    return startAiRun(r.headers, await readJson(r, 65_536));
  });
}
