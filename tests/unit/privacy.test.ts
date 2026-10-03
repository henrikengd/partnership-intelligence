import { describe, expect, it, vi } from "vitest";
import { jsonRoute } from "../../src/server/http";
import { parse } from "csv-parse/sync";
import { toCsv } from "../../src/modules/privacy/export";
describe("private CSV downloads", () => {
  it("round-trips quotes, commas and lines while neutralizing formula-like cells", () => {
    const inputs = [
      "=SUM(1,2)",
      "+COMMAND",
      "-12",
      "@function",
      " \t=COMMAND",
      "\r=COMMAND",
      "\nplain",
      "\tplain",
      'normal, quoted "value"\nnext line',
      "語句",
    ];
    const rows = parse(toCsv(inputs.map((value) => ({ value }))), {
      columns: true,
    }) as { value: string }[];
    for (let i = 0; i < inputs.length; i++)
      expect(rows[i].value).toBe(i < 8 ? "'" + inputs[i] : inputs[i]);
    expect(toCsv([])).toBe("");
  });
});

it("logs only a minimal operational category for a private request failure", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const response = await jsonRoute(async () => {
      throw new Error("PRIVATE-evidence-token-credential-marker");
    });
    expect(response.status).toBe(500);
    expect(JSON.stringify(log.mock.calls)).not.toContain("PRIVATE");
    expect(log.mock.calls).toEqual([
      [JSON.stringify({ event: "request_failed", category: "internal" })],
    ]);
    expect(await response.text()).not.toContain("PRIVATE");
  } finally {
    log.mockRestore();
  }
});
