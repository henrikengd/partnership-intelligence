import {
  getLifecycleDetail,
  transitionOpportunity,
} from "@/modules/outreach/lifecycle";
import { checkOrigin, jsonRoute, readJson } from "@/server/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(r: Request, c: Context) {
  return jsonRoute(async () =>
    getLifecycleDetail(r.headers, (await c.params).id),
  );
}
export async function POST(r: Request, c: Context) {
  return jsonRoute(async () => {
    checkOrigin(r);
    return transitionOpportunity(
      r.headers,
      (await c.params).id,
      await readJson(r),
    );
  });
}
