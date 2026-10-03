import { describe, expect, it } from "vitest";
import { readConfig } from "../../src/server/config";
import { organizationInput } from "../../src/server/organization";
const valid = {
  DATABASE_URL: "postgresql://user:secret@localhost/db",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BOOTSTRAP_SECRET: "b".repeat(32),
  BETTER_AUTH_URL: "https://example.test",
};
describe("private configuration", () => {
  it("rejects missing secrets without printing them", () => {
    expect(() =>
      readConfig({ ...valid, BETTER_AUTH_SECRET: "private-value" }),
    ).toThrow("Invalid configuration: BETTER_AUTH_SECRET");
  });
  it("rejects cleartext internet authentication", () => {
    expect(() =>
      readConfig({
        ...valid,
        BETTER_AUTH_URL: "http://public.example",
        ALLOW_INSECURE_HTTP: "true",
      }),
    ).toThrow("HTTPS");
  });
  it("permits explicitly configured local HTTP", () => {
    expect(
      readConfig({
        ...valid,
        BETTER_AUTH_URL: "http://localhost:3101",
        ALLOW_INSECURE_HTTP: "true",
      }).BETTER_AUTH_URL,
    ).toBe("http://localhost:3101");
  });
  it("rejects invalid organization values and unsafe website schemes", () => {
    expect(
      organizationInput.safeParse({
        name: "Fictional workshop",
        website: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      organizationInput.safeParse({ name: "Fictional workshop", teamSize: -1 })
        .success,
    ).toBe(false);
    expect(
      organizationInput.safeParse({
        name: "Fictional workshop",
        timezone: "unrecognized",
      }).success,
    ).toBe(false);
  });
});
