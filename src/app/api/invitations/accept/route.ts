import { acceptInvitation, credentialsSchema } from "@/server/auth/service";
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
    await limitPublicEndpoint("invite", 60);
    const input = credentialsSchema
      .extend({ token: z.string().min(1).max(128) })
      .parse(await readJson(request));
    return acceptInvitation(input);
  });
}
