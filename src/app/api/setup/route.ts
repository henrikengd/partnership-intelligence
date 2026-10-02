import { bootstrapAdmin, credentialsSchema } from "@/server/auth/service";
import {
  checkOrigin,
  jsonRoute,
  readJson,
  limitPublicEndpoint,
} from "@/server/http";
import { z } from "zod";
export async function POST(request: Request) {
  return jsonRoute(async () => {
    checkOrigin(request);
    await limitPublicEndpoint("setup", 10);
    const input = credentialsSchema
      .extend({ secret: z.string().min(1).max(512) })
      .parse(await readJson(request));
    return bootstrapAdmin(input);
  });
}
