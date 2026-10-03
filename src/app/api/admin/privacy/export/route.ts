import { exportPrivateData } from "@/modules/privacy/export";
import { jsonRoute } from "@/server/http";
export async function GET(r: Request) {
  return jsonRoute(async () => {
    const file = await exportPrivateData(
      r.headers,
      new URL(r.url).searchParams.get("kind"),
    );
    return new Response(file.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
