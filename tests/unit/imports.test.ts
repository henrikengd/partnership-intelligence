import { describe, it, expect } from "vitest";
import { parseCsv, mapRow } from "../../src/modules/imports/csv";
import { readImportForm } from "../../src/modules/imports/http";
const bytes = (s: string) => new TextEncoder().encode(s);
describe("bounded CSV parsing and mapping", () => {
  it("handles BOM, quoted multiline values and explicitly mapped columns", () => {
    const parsed = parseCsv(
      bytes(
        '\uFEFFFull Name,Roles,Note\n"Alex, Example",member;advisor,"Two\nlines"\n',
      ),
    );
    const mapped = mapRow("people", parsed.headers, parsed.records[0], {
      name: "Full Name",
      roles: "Roles",
      notes: "Note",
    });
    expect(mapped).toEqual({
      name: "Alex, Example",
      roles: ["member", "advisor"],
      notes: "Two\nlines",
    });
  });
  it("rejects duplicate headers, unsupported mappings, malformed encoding and both upload limits", () => {
    expect(() => parseCsv(bytes("name,name\nA,B"))).toThrow(/unique/);
    expect(() =>
      mapRow("people", ["name"], ["Alex"], { name: "missing" }),
    ).toThrow(/not in/);
    expect(() => parseCsv(new Uint8Array([255, 255]))).toThrow(/UTF-8/);
    expect(() => parseCsv(new Uint8Array(5 * 1024 * 1024 + 1))).toThrow(
      /5 MiB/,
    );
    expect(() =>
      parseCsv(bytes("name\n" + Array(5001).fill("Alex").join("\n"))),
    ).toThrow(/5,000/);
  });
  it("bounds multipart streaming before formData decoding even without Content-Length", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(1024 * 1024));
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request("http://localhost/imports", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=example" },
      body,
      duplex: "half",
    } as RequestInit);
    await expect(readImportForm(request)).rejects.toMatchObject({
      code: "BODY_TOO_LARGE",
    });
    expect(cancelled).toBe(true);
  });
});
