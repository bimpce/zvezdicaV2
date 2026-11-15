import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { Gift, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { errMsg, useChildren, useInvalidateAll } from "@/lib/data";
import { useRedemptions, useRewards, type Redemption } from "@/lib/rewards";

export function RedemptionList() {
  const t = useT();
  const { data: reds = [] } = useRedemptions();
  const { data: rewards = [] } = useRewards();
  const { data: kids = [] } = useChildren();
  const refresh = useInvalidateAll();
  const pending = reds.filter((r) => r.status === "pending");

  async function review(r: Redemption, status: "approved" | "rejected") {
    const { error } = await supabase
      .from("reward_redemptions")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", r.id);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    toast.success(
      status === "approved"
        ? t("Nagrada izročena! −{n} točk", { n: r.points })
        : t("Zahtevek zavrnjen, točke vrnjene"),
    );
    refresh();
  }

  if (pending.length === 0)
    return (
      <p className="rounded-2xl bg-muted p-6 text-center text-muted-foreground">
        {t("Ni nagrad, ki čakajo na izročitev.")}
      </p>
    );

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {pending.map((r) => {
        const kid = kids.find((k) => k.id === r.child_id);
        const rw = rewards.find((x) => x.id === r.reward_id);
        return (
          <div key={r.id} className="rounded-2xl bg-card p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <span className="avatar-md flex shrink-0 items-center justify-center rounded-full bg-secondary">
                {rw?.emoji ?? "🎁"}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="break-words">{rw?.title ?? t("Nagrada")}</h3>
                <p className="text-sm text-muted-foreground">
                  {kid?.avatar} {kid?.name} ·{" "}
                  {new Date(r.requested_at).toLocaleString(t.locale, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-sun px-2.5 py-1 text-sm font-extrabold text-sun-foreground">
                {r.points}
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-2 xs:flex-row">
              <Button
                variant="success"
                className="btn-block xs:flex-1"
                onClick={() => review(r, "approved")}
              >
                <Gift /> {t("Potrdi in izroči")}
              </Button>
              <Button
                variant="outline"
                className="btn-block xs:flex-1"
                onClick={() => review(r, "rejected")}
              >
                <X /> {t("Zavrni")}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
