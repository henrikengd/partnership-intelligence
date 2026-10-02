import { getCandidatePreviews } from "@/modules/opportunities/runs";
import { jsonRoute } from "@/server/http";
export async function GET(r: Request) {
  return jsonRoute(() =>
    getCandidatePreviews(
      r.headers,
      new URL(r.url).searchParams.get("need") ?? "",
    ),
  );
}
