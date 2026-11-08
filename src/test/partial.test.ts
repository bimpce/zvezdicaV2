import { describe, it, expect } from "vitest";
import { partialPoints } from "@/lib/rewards";
describe("partialPoints", () => {
  it("100% gives full points", () => expect(partialPoints(10, 100)).toBe(10));
  it("60% of 10 is 6", () => expect(partialPoints(10, 60)).toBe(6));
  it("30% of 10 is 3", () => expect(partialPoints(10, 30)).toBe(3));
  it("partial never below 1", () => expect(partialPoints(1, 30)).toBe(1));
});
