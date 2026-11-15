import { describe, expect, it } from "vitest";
import { availablePoints } from "@/lib/rewards";

const comps = [
  { child_id: "a", status: "approved" as const, points: 50 },
  { child_id: "a", status: "pending" as const, points: 30 },
  { child_id: "b", status: "approved" as const, points: 99 },
];

describe("availablePoints", () => {
  it("counts only approved chore points", () => {
    expect(availablePoints("a", comps, [])).toBe(50);
  });
  it("pending redemption reserves points", () => {
    expect(availablePoints("a", comps, [{ child_id: "a", status: "pending", points: 20 }])).toBe(
      30,
    );
  });
  it("approved redemption deducts points", () => {
    expect(availablePoints("a", comps, [{ child_id: "a", status: "approved", points: 40 }])).toBe(
      10,
    );
  });
  it("rejected redemption returns points", () => {
    expect(availablePoints("a", comps, [{ child_id: "a", status: "rejected", points: 40 }])).toBe(
      50,
    );
  });
});
