import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Which chores a child has already seen — stored in the family account so it syncs across devices. */
export function useSeenChores(childId: string) {
  return useQuery({
    queryKey: ["seen-chores", childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("child_seen_chores")
        .select("chore_id")
        .eq("child_id", childId);
      if (error) throw error;
      return new Set(data.map((r) => r.chore_id));
    },
  });
}

export function useMarkChoresSeen(childId: string) {
  const qc = useQueryClient();
  return async (ids: string[]) => {
    if (!ids.length) return;
    await supabase.from("child_seen_chores").upsert(
      ids.map((chore_id) => ({ child_id: childId, chore_id })),
      { ignoreDuplicates: true },
    );
    qc.invalidateQueries({ queryKey: ["seen-chores", childId] });
  };
}
