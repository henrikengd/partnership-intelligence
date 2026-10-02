import { db, user } from "@/server/db";
import { requireAdmin } from "@/server/auth/access";
import { jsonRoute } from "@/server/http";
export async function GET(request: Request) {
  return jsonRoute(async () => {
    await requireAdmin(request.headers);
    return db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
      })
      .from(user);
  });
}
