import { describe, expect, it } from "vitest";
import { isChoreActive, isValidPin, periodKey } from "@/lib/periods";

describe("periodKey", () => {
  const d = new Date(2026, 10, 6); // 6 Nov 2026
  it("daily resets each day", () => {
    expect(periodKey("daily", d)).toBe("2026-11-06");
    expect(periodKey("daily", new Date(2026, 10, 7))).toBe("2026-11-07");
  });
  it("weekly uses ISO week", () => expect(periodKey("weekly", d)).toBe("2026-W45"));
  it("monthly", () => expect(periodKey("monthly", d)).toBe("2026-11"));
  it("yearly", () => expect(periodKey("yearly", d)).toBe("2026"));
  it("once never resets", () => expect(periodKey("once", d)).toBe("once"));
});

describe("isValidPin", () => {
  it("accepts exactly 6 digits", () => expect(isValidPin("123456")).toBe(true));
  it("rejects 5 digits", () => expect(isValidPin("12345")).toBe(false));
  it("rejects letters", () => expect(isValidPin("12a456")).toBe(false));
});

describe("isChoreActive", () => {
  const d = new Date(2026, 10, 6);
  it("inactive after end date", () =>
    expect(isChoreActive({ start_date: "2026-01-01", end_date: "2026-11-05" }, d)).toBe(false));
  it("inactive before start", () =>
    expect(isChoreActive({ start_date: "2026-11-07", end_date: null }, d)).toBe(false));
});
