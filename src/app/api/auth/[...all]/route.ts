import { getAuth } from "@/server/auth/auth";
import { requireActor } from "@/server/auth/access";
import { jsonRoute } from "@/server/http";
const allowed = new Set([
  "/sign-in/email",
  "/sign-out",
  "/get-session",
  "/change-password",
]);
async function handle(request: Request) {
  const path = new URL(request.url).pathname.replace(/^\/api\/auth/, "");
  if (!allowed.has(path))
    return Response.json(
      {
        error: {
          code: "DISABLED",
          message: "Public registration and account recovery are disabled.",
        },
      },
      { status: 403 },
    );
  if (path === "/change-password" || path === "/get-session") {
    const authorized = await jsonRoute(() => requireActor(request.headers));
    if (!authorized.ok) return authorized;
  }
  return getAuth().handler(request);
}
export const GET = handle;
export const POST = handle;
