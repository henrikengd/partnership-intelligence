import { previewAiContext } from "@/server/ai/service";
import { jsonRoute } from "@/server/http";
export async function GET(r: Request) {
  const url = new URL(r.url);
  return jsonRoute(() =>
    previewAiContext(
      r.headers,
      url.searchParams.get("opportunityId") ?? "",
      url.searchParams.get("role") ?? "",
    ),
  );
}
