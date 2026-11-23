import { getLang, translate } from "./i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Frequency } from "./periods";
import { isChoreActive, periodKey } from "./periods";

export type Child = {
  id: string;
  family_id: string;
  name: string;
  avatar: string;
  created_at: string;
};
export type Chore = {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  points: number;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
  /** Set when a chore with history was deleted: hidden, but its earned points stay. */
  archived_at?: string | null;
  created_at: string;
  chore_assignments: { child_id: string }[];
};
export type Completion = {
  id: string;
  chore_id: string;
  child_id: string;
  period_key: string;
  status: "pending" | "approved" | "rejected";
  points: number;
  note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};
export type ChoreStatus = "todo" | Completion["status"];

export const AVATARS = ["🦊", "🐼", "🦁", "🐸", "🐰", "🐯", "🐨", "🦄", "🐙", "🐧", "🐶", "🐱"];

export function useFamily() {
  return useQuery({
    queryKey: ["family"],
    queryFn: async () => {
      const { data, error } = await supabase.from("families").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useChildren() {
  return useQuery({
    queryKey: ["children"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("children")
        .select("id, family_id, name, avatar, created_at")
        .order("created_at");
      if (error) throw error;
      return data as Child[];
    },
  });
}

export function useChores() {
  return useQuery({
    queryKey: ["chores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chores")
        .select("*, chore_assignments(child_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Chore[];
    },
    refetchInterval: 30000,
  });
}

/** Supabase returns at most 1000 rows per request; fetch page by page so totals stay right. */
export const PAGE_SIZE = 1000;
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return all;
  }
}

export function useCompletions() {
  return useQuery({
    queryKey: ["completions"],
    queryFn: () =>
      fetchAllPages<Completion>((from, to) =>
        supabase
          .from("completions")
          .select("*")
          .order("submitted_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
    refetchInterval: 20000,
  });
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function pointsFor(childId: string, completions: Completion[]) {
  return completions
    .filter((c) => c.child_id === childId && c.status === "approved")
    .reduce((s, c) => s + c.points, 0);
}

/** Chores active now for a child, with the status in the current period. */
export function childChoreList(childId: string, chores: Chore[], completions: Completion[]) {
  return chores
    .filter(
      (c) =>
        !c.archived_at &&
        c.chore_assignments.some((a) => a.child_id === childId) &&
        isChoreActive(c),
    )
    .map((chore) => {
      const key = periodKey(chore.frequency);
      const comp = completions.find(
        (x) => x.chore_id === chore.id && x.child_id === childId && x.period_key === key,
      );
      return { chore, key, completion: comp, status: (comp?.status ?? "todo") as ChoreStatus };
    });
}

/** User-facing error text; database messages are Slovenian source strings, so translate them. */
export function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e)
    return translate(getLang(), String((e as { message: string }).message));
  return translate(getLang(), "Prišlo je do napake");
}

/** Postgres "still referenced" error: the row has history that must be kept. */
export const isForeignKeyViolation = (e: unknown) =>
  !!e && typeof e === "object" && (e as { code?: unknown }).code === "23503";
