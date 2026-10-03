import { it, expect } from "vitest";
import { denseNetwork } from "../helpers/dense-network";
import { findRelationshipPaths } from "../../src/modules/network/paths";
it("bounds snapshot materialization for 160,000 valid dense historical paths while preserving rank and stable IDs", () => {
  let labels = 0;
  const input = denseNetwork(400, () => labels++);
  const paths = findRelationshipPaths(input);
  expect(paths.current).toEqual([]);
  expect(paths.historical.map((p) => p.id)).toEqual(
    [1, 2, 3].map(
      (i) =>
        `affiliation-00009:personal-00009:employment-${String(i).padStart(5, "0")}`,
    ),
  );
  expect(paths.historical.map((p) => p.willingness)).toEqual([
    "yes",
    "unknown",
    "unknown",
  ]);
  expect(
    paths.historical.every(
      (p) =>
        p.weakestPersonalStrength === 4 &&
        p.nodes.length === 4 &&
        p.edges.length === 3,
    ),
  ).toBe(true);
  expect(labels).toBe(6);
  expect(
    findRelationshipPaths({
      ...input,
      relationships: [...input.relationships].reverse(),
      affiliations: [...input.affiliations].reverse(),
    }).historical.map((p) => p.id),
  ).toEqual(paths.historical.map((p) => p.id));
});
it("retains three current alternatives independently from dense historical leads", () => {
  let labels = 0;
  const input = denseNetwork(400, () => labels++);
  input.relationships = input.relationships.map((r) =>
    r.kind === "previously_worked_at" &&
    ["employment-00000", "employment-00001", "employment-00002"].includes(r.id)
      ? { ...r, kind: "works_at", state: "current", endDate: null }
      : r,
  );
  const result = findRelationshipPaths(input);
  expect(result.current).toHaveLength(3);
  expect(result.historical).toHaveLength(3);
  expect(result.current.every((p) => p.current && p.willingness !== "no")).toBe(
    true,
  );
  expect(
    result.historical.every((p) => !p.current && p.willingness !== "no"),
  ).toBe(true);
  expect(labels).toBe(12);
  const reversed = findRelationshipPaths({
    ...input,
    relationships: [...input.relationships].reverse(),
    affiliations: [...input.affiliations].reverse(),
  });
  expect(reversed).toEqual(result);
});
