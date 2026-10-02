import { DomainError } from "../../server/errors";
export async function readBoundedBytes(request: Request, maximum: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new DomainError("BODY_REQUIRED", "Send a request body.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > maximum) {
      await reader.cancel();
      throw new DomainError(
        "BODY_TOO_LARGE",
        "The upload is too large. CSV files must be at most 5 MiB.",
        413,
      );
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function readImportForm(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
    throw new DomainError(
      "CONTENT_TYPE",
      "Upload a CSV file using the import form.",
    );
  const bytes = await readBoundedBytes(request, 5 * 1024 * 1024 + 65536);
  try {
    return await new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: bytes,
    }).formData();
  } catch {
    throw new DomainError("INVALID_UPLOAD", "The upload could not be read.");
  }
}
