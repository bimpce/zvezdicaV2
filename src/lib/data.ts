import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Frequency } from "./periods";
import { isChoreActive, periodKey } from "./periods";

export type Child = { id: string; family_id: string; name: string; avatar: string; created_at: string };
export type Chore = {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  points: number;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
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

export function useCompletions() {
  return useQuery({
    queryKey: ["completions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("completions")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data as Completion[];
    },
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
    .filter((c) => c.chore_assignments.some((a) => a.child_id === childId) && isChoreActive(c))
    .map((chore) => {
      const key = periodKey(chore.frequency);
      const comp = completions.find(
        (x) => x.chore_id === chore.id && x.child_id === childId && x.period_key === key,
      );
      return { chore, key, completion: comp, status: (comp?.status ?? "todo") as ChoreStatus };
    });
}

export function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Prišlo je do napake";
}
