import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Completion } from "./data";

export type Reward = {
  id: string;
  family_id: string;
  title: string;
  emoji: string;
  points: number;
  child_id: string | null;
  active: boolean;
  created_at: string;
};
export type Redemption = {
  id: string;
  reward_id: string;
  child_id: string;
  points: number;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at: string | null;
};

export function useRewards() {
  return useQuery({
    queryKey: ["rewards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rewards").select("*").order("points");
      if (error) throw error;
      return data as Reward[];
    },
    refetchInterval: 30000,
  });
}

export function useRedemptions() {
  return useQuery({
    queryKey: ["redemptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reward_redemptions")
        .select("id, reward_id, child_id, points, status, requested_at, reviewed_at")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data as Redemption[];
    },
    refetchInterval: 20000,
  });
}

export function useGoal(childId: string) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["goal", childId],
    queryFn: async () => {
      const { data, error } = await supabase.from("child_goals").select("reward_id").eq("child_id", childId).maybeSingle();
      if (error) throw error;
      return data?.reward_id ?? null;
    },
  });
  async function setGoal(rewardId: string | null) {
    if (rewardId) await supabase.from("child_goals").upsert({ child_id: childId, reward_id: rewardId, set_at: new Date().toISOString() });
    else await supabase.from("child_goals").delete().eq("child_id", childId);
    qc.invalidateQueries({ queryKey: ["goal", childId] });
  }
  return { goal: q.data ?? null, setGoal };
}

/** Earned (approved chores) minus spent/reserved (approved + pending redemptions). */
export function availablePoints(childId: string, completions: Pick<Completion, "child_id" | "status" | "points">[], redemptions: Pick<Redemption, "child_id" | "status" | "points">[]) {
  const earned = completions.filter((c) => c.child_id === childId && c.status === "approved").reduce((s, c) => s + c.points, 0);
  const spent = redemptions.filter((r) => r.child_id === childId && r.status !== "rejected").reduce((s, r) => s + r.points, 0);
  return earned - spent;
}

export function rewardsFor(childId: string, rewards: Reward[]) {
  return rewards.filter((r) => r.active && (!r.child_id || r.child_id === childId));
}
