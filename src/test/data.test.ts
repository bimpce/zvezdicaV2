import { describe, expect, it } from "vitest";
import {
  PAGE_SIZE,
  childChoreList,
  errMsg,
  fetchAllPages,
  isForeignKeyViolation,
  type Chore,
} from "@/lib/data";
import { setLang } from "@/lib/i18n";

describe("fetchAllPages", () => {
  it("keeps requesting pages until a short page arrives", async () => {
    const rows = Array.from({ length: PAGE_SIZE * 2 + 5 }, (_, i) => i);
    const calls: [number, number][] = [];
    const all = await fetchAllPages<number>(async (from, to) => {
      calls.push([from, to]);
      return { data: rows.slice(from, to + 1), error: null };
    });
    expect(all).toHaveLength(rows.length);
    expect(calls).toHaveLength(3);
  });
  it("throws the page error", async () => {
    await expect(
      fetchAllPages(async () => ({ data: null, error: new Error("boom") })),
    ).rejects.toThrow("boom");
  });
});

describe("childChoreList", () => {
  const base: Chore = {
    id: "c1",
    family_id: "f",
    title: "Pospravi sobo",
    description: null,
    points: 10,
    frequency: "once",
    start_date: "2000-01-01",
    end_date: null,
    created_at: "2000-01-01T00:00:00Z",
    chore_assignments: [{ child_id: "k" }],
  };
  it("lists assigned, active chores", () =>
    expect(childChoreList("k", [base], [])).toHaveLength(1));
  it("hides archived chores", () =>
    expect(childChoreList("k", [{ ...base, archived_at: "2026-01-01" }], [])).toHaveLength(0));
});

describe("errMsg", () => {
  it("translates database messages", () => {
    setLang("en");
    expect(errMsg({ message: "Premalo točk" })).toBe("Not enough points");
    setLang("sl");
    expect(errMsg({ message: "Premalo točk" })).toBe("Premalo točk");
  });
  it("detects rows that are still referenced", () => {
    expect(isForeignKeyViolation({ code: "23503" })).toBe(true);
    expect(isForeignKeyViolation(null)).toBe(false);
  });
});
