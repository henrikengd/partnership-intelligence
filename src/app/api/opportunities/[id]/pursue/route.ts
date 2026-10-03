import { randomUUID } from "node:crypto";
import {
  getLifecycleDetail,
  transitionOpportunity,
} from "@/modules/outreach/lifecycle";
import { checkOrigin, jsonRoute } from "@/server/http";
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return jsonRoute(async () => {
    checkOrigin(r);
    const id = (await params).id;
    const detail = await getLifecycleDetail(r.headers, id);
    return (
      await transitionOpportunity(r.headers, id, {
        requestId: randomUUID(),
        action: "transition",
        fromState: detail.record.state,
        toState: "pursuing",
      })
    ).record;
  });
}
