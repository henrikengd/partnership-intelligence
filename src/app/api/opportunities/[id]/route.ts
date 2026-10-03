import {
  editOpportunity,
  getOpportunityDetail,
  reviewFactors,
} from "@/modules/opportunities/service";
import { checkOrigin, jsonRoute, readJson } from "@/server/http";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return jsonRoute(() =>
    params.then(({ id }) => getOpportunityDetail(request.headers, id)),
  );
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return jsonRoute(async () => {
    checkOrigin(request);
    return editOpportunity(
      request.headers,
      (await params).id,
      await readJson(request),
    );
  });
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return jsonRoute(async () => {
    checkOrigin(request);
    return reviewFactors(
      request.headers,
      (await params).id,
      await readJson(request),
    );
  });
}
