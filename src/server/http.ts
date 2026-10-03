import { z } from "zod";
import { DomainError } from "./errors";
import { db, rateLimit } from "./db";
import { sql } from "drizzle-orm";
import { readConfig } from "./config";
export function checkOrigin(request: Request) {
  if (
    request.headers.get("origin") !==
    new URL(readConfig().BETTER_AUTH_URL).origin
  )
    throw new DomainError(
      "INVALID_ORIGIN",
      "The request origin is not allowed.",
      403,
    );
}
export async function limitPublicEndpoint(key: string, maximum: number) {
  const now = Date.now();
  const [record] = await db
    .insert(rateLimit)
    .values({ key: `public:${key}`, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`CASE WHEN ${rateLimit.lastRequest} < ${now - 60_000} THEN 1 ELSE ${rateLimit.count} + 1 END`,
        lastRequest: sql`CASE WHEN ${rateLimit.lastRequest} < ${now - 60_000} THEN ${now} ELSE ${rateLimit.lastRequest} END`,
      },
    })
    .returning();
  if (record.count > maximum)
    throw new DomainError(
      "RATE_LIMITED",
      "Too many attempts. Wait one minute and try again.",
      429,
    );
}
export async function readJson(request: Request, maximumBytes = 16_384) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new DomainError("INVALID_CONTENT_TYPE", "Send a JSON request.", 415);
  const reader = request.body?.getReader();
  if (!reader)
    throw new DomainError("INVALID_JSON", "Send a valid JSON request.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > maximumBytes) {
      await reader.cancel();
      throw new DomainError("BODY_TOO_LARGE", "The request is too large.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new DomainError("INVALID_JSON", "Send a valid JSON request.");
  }
}
export async function jsonRoute(action: () => Promise<unknown>) {
  try {
    const result = await action();
    if (result instanceof Response) return result;
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof DomainError)
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    if (error instanceof z.ZodError)
      return Response.json(
        {
          error: {
            code: "VALIDATION",
            message: "Check the required fields.",
            fields: error.issues.map((i) => ({
              field: i.path.join("."),
              message: i.message,
            })),
          },
        },
        { status: 400 },
      );
    console.error(
      JSON.stringify({ event: "request_failed", category: "internal" }),
    );
    return Response.json(
      {
        error: {
          code: "INTERNAL",
          message: "The request could not be completed. Try again.",
        },
      },
      { status: 500 },
    );
  }
}
