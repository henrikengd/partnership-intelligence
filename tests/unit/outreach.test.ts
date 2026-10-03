import { describe, it, expect } from "vitest";
import { localCalendarDay } from "../../src/modules/outreach/service";
describe("organization calendar dates", () => {
  it("uses local midnight across UTC and daylight saving boundaries", () => {
    expect(
      localCalendarDay("Europe/Oslo", new Date("2026-10-02T22:30:00Z")),
    ).toBe("2026-10-03");
    expect(
      localCalendarDay("America/Los_Angeles", new Date("2026-10-03T01:00:00Z")),
    ).toBe("2026-10-02");
    expect(
      localCalendarDay("Europe/Oslo", new Date("2026-10-25T00:30:00Z")),
    ).toBe("2026-10-25");
    expect(
      localCalendarDay("Europe/Oslo", new Date("2026-10-25T01:30:00Z")),
    ).toBe("2026-10-25");
  });
});
